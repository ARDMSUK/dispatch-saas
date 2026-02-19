
import { NextResponse } from 'next/server';
import twilio from 'twilio';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get('to');

    const debugInfo = {
        TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? 'Set (Ends with ...' + process.env.TWILIO_ACCOUNT_SID.slice(-4) + ')' : 'MISSING',
        TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'MISSING',
        TWILIO_PHONE_NUMBER: process.env.TWILIO_PHONE_NUMBER ? process.env.TWILIO_PHONE_NUMBER : 'MISSING',
    };

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
        return NextResponse.json({
            status: 'CONFIG_ERROR',
            message: 'Missing environment variables',
            debugInfo
        }, { status: 500 });
    }

    if (!to) {
        return NextResponse.json({
            status: 'OK_CONFIG_ONLY',
            message: 'Configuration present. Provide ?to=+447... to test sending.',
            debugInfo
        });
    }

    try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const message = await client.messages.create({
            body: 'This is a test message from Dispatch SaaS Debugger.',
            from: process.env.TWILIO_PHONE_NUMBER,
            to: to
        });

        return NextResponse.json({
            status: 'SUCCESS',
            sid: message.sid,
            debugInfo
        });
    } catch (error: any) {
        return NextResponse.json({
            status: 'SEND_FAILED',
            error: error.message,
            code: error.code,
            moreInfo: error.moreInfo,
            debugInfo
        }, { status: 500 });
    }
}
