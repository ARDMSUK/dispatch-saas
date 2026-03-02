import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const userId = session.user.id;
        const userEmail = session.user.email;

        // 1. Generate a new secret
        const secret = speakeasy.generateSecret({
            name: `Dispatch SaaS (${userEmail})`
        });

        // 2. Temporarily save this secret to the DB (but do NOT enable 2FA yet)
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorSecret: secret.base32,
                twoFactorEnabled: false // explicitly keep disabled until verified
            }
        });

        // 3. Generate a QR Code Data URL so the client can render it
        if (!secret.otpauth_url) {
            throw new Error("Failed to generate OTP Auth URL");
        }

        const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

        return NextResponse.json({
            success: true,
            secret: secret.base32,
            qrCode: qrCodeDataUrl
        }, { status: 200 });

    } catch (error) {
        console.error("2FA Setup Route Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
