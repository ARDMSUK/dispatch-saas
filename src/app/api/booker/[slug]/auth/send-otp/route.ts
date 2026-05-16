import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SmsService } from '@/lib/sms-service';
import crypto from 'crypto';

export async function POST(
    req: Request,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const { slug } = await params;
        const { phone } = await req.json();

        if (!phone) {
            return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
        }

        const tenant = await prisma.tenant.findUnique({
            where: { slug: slug },
            select: { 
                name: true,
                twilioAccountSid: true, 
                twilioAuthToken: true, 
                twilioFromNumber: true 
            }
        });

        if (!tenant) {
            return NextResponse.json({ error: 'Tenant not found' }, { status: 404 });
        }

        // Generate 6 digit code
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        const message = `${tenant.name}: Your verification code is ${code}. Please do not share this code.`;

        // Send via Twilio using tenant's config
        const sendResult = await SmsService.sendSms(phone, message, {
            accountSid: tenant.twilioAccountSid || undefined,
            authToken: tenant.twilioAuthToken || undefined,
            fromNumber: tenant.twilioFromNumber || undefined,
        });

        if (!sendResult.success) {
            console.error('Failed to send OTP:', sendResult.error);
            return NextResponse.json({ error: 'Failed to send verification code' }, { status: 500 });
        }

        // Create secure hash
        const ttl = 10 * 60 * 1000; // 10 minutes
        const expires = Date.now() + ttl;
        const data = `${phone}.${code}.${expires}`;
        
        const secret = process.env.NEXTAUTH_SECRET || 'cabai-secret-key-fallback';
        const hash = crypto.createHmac('sha256', secret).update(data).digest('hex');

        return NextResponse.json({ 
            success: true, 
            hash, 
            expires 
        });
    } catch (error) {
        console.error('Send OTP error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
