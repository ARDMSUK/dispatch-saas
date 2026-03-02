import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import speakeasy from 'speakeasy';

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session || !session.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { token } = await req.json();

        if (!token) {
            return NextResponse.json({ error: "Token is required" }, { status: 400 });
        }

        const userId = session.user.id;

        // Fetch user's temp secret
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { twoFactorSecret: true, twoFactorEnabled: true }
        });

        if (!user || !user.twoFactorSecret) {
            return NextResponse.json({ error: "2FA setup has not been initiated" }, { status: 400 });
        }

        // Verify the token against the secret
        const verified = speakeasy.totp.verify({
            secret: user.twoFactorSecret,
            encoding: 'base32',
            token: token,
            // allow a 1-step window (30s) drift
            window: 1
        });

        if (!verified) {
            return NextResponse.json({ error: "Invalid authenticator code." }, { status: 400 });
        }

        // Token is valid! Enable 2FA permanently.
        await prisma.user.update({
            where: { id: userId },
            data: {
                twoFactorEnabled: true
            }
        });

        return NextResponse.json({
            success: true,
            message: "Two-Factor Authentication has been successfully enabled."
        }, { status: 200 });

    } catch (error) {
        console.error("2FA Verify Route Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
