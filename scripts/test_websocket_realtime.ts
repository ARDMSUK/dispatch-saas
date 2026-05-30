import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error("❌ Error: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in environment variables.");
    process.exit(1);
}

async function testWebSocketRealtime() {
    console.log("🚀 Starting Supabase WebSockets Realtime Broadcast Test...");
    console.log(`Supabase URL: ${supabaseUrl}`);

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Set up channel with self-broadcast enabled so we receive our own messages
    const channel = supabase.channel('drivers-location', {
        config: {
            broadcast: { self: true },
        },
    });

    let messageReceived = false;

    // Listen for 'location' event
    channel.on('broadcast', { event: 'location' }, (payload) => {
        console.log("📥 Received WebSocket Broadcast:", JSON.stringify(payload, null, 2));
        const data = payload.payload;
        if (
            data &&
            data.driverId === 'test-driver-id-123' &&
            data.lat === 51.5074 &&
            data.lng === -0.1278
        ) {
            console.log("✅ WebSocket Broadcast coordinates payload matches expected test values!");
            messageReceived = true;
        } else {
            console.warn("⚠️ Received payload, but it did not match test values.");
        }
    });

    // Subscribe to channel
    await new Promise<void>((resolve, reject) => {
        channel.subscribe((status) => {
            console.log(`[Supabase Realtime] Channel status update: ${status}`);
            if (status === 'SUBSCRIBED') {
                resolve();
            } else if (status === 'CHANNEL_ERROR') {
                reject(new Error("Failed to subscribe to channel"));
            }
        });
    });

    console.log("📡 Subscribed to 'drivers-location' channel. Sending broadcast test payload...");

    // Send a broadcast message
    const sendResult = await channel.send({
        type: 'broadcast',
        event: 'location',
        payload: {
            driverId: 'test-driver-id-123',
            lat: 51.5074,
            lng: -0.1278,
            heading: 90,
            speed: 12.5,
            timestamp: Date.now()
        }
    });

    console.log("📤 Broadcast send result status:", sendResult);

    // Wait a brief period to allow network delivery
    await new Promise(r => setTimeout(r, 3000));

    // Clean up channel
    await supabase.removeChannel(channel);

    if (messageReceived) {
        console.log("🎉 WebSocket E2E Realtime verification PASSED!");
        process.exit(0);
    } else {
        console.error("❌ Failed to receive broadcasted message back via WebSocket.");
        process.exit(1);
    }
}

testWebSocketRealtime().catch(err => {
    console.error("❌ E2E WebSocket test caught error:", err);
    process.exit(1);
});
