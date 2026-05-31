import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function broadcastOperatorPresence(payload: {
    userId: string;
    name: string | null;
    sipExtension: string | null;
    status: string;
    activeCallPhone?: string | null;
    activeCallDuration?: number | null;
}) {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[Supabase Broadcast] URL or Anon Key is missing.');
        return;
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const channel = supabase.channel('operator-presence');

        return new Promise<void>((resolve) => {
            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    try {
                        await channel.send({
                            type: 'broadcast',
                            event: 'status-change',
                            payload: {
                                ...payload,
                                timestamp: new Date().toISOString()
                            }
                        });
                    } catch (err) {
                        console.error('[Supabase Broadcast] Error sending payload:', err);
                    } finally {
                        supabase.removeChannel(channel);
                        resolve();
                    }
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    supabase.removeChannel(channel);
                    resolve(); // Resolve anyway to prevent blocking API routes
                }
            });
        });
    } catch (error) {
        console.error('[Supabase Broadcast] Failed to send presence change:', error);
    }
}

export async function broadcastOperatorAlert(payload: {
    tenantId: string;
    alertType: 'modification-request' | 'delay-inquiry';
    message: string;
    bookingId?: string | null;
    passengerPhone?: string | null;
}) {
    if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('[Supabase Broadcast] URL or Anon Key is missing.');
        return;
    }

    try {
        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        const channel = supabase.channel(`operator-alerts-${payload.tenantId}`);

        return new Promise<void>((resolve) => {
            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    try {
                        await channel.send({
                            type: 'broadcast',
                            event: 'new-alert',
                            payload: {
                                ...payload,
                                timestamp: new Date().toISOString()
                            }
                        });
                    } catch (err) {
                        console.error('[Supabase Broadcast] Error sending alert:', err);
                    } finally {
                        supabase.removeChannel(channel);
                        resolve();
                    }
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    supabase.removeChannel(channel);
                    resolve();
                }
            });
        });
    } catch (error) {
        console.error('[Supabase Broadcast] Failed to send alert:', error);
    }
}
