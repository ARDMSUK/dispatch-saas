import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { randomBytes } from 'crypto';
import { sendEmail, getResetPasswordEmail } from '@/lib/email';

// POST /api/auth/forgot-password
export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            // Don't reveal if user exists
            return NextResponse.json({ success: true, message: "If an account exists, a reset link has been sent." });
        }

        // Generate Token
        const resetToken = randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour

        await prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken,
                resetTokenExpiry,
            },
        });

        // Send Email
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const resetLink = `${protocol}://${host}/auth/reset-password?token=${resetToken}`;
        await sendEmail({
            to: email,
            subject: "Reset your password",
            html: getResetPasswordEmail(resetLink),
        });

        return NextResponse.json({ success: true, message: "Reset link sent." });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
