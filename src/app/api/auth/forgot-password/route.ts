import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { sendEmail, getResetPasswordEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const { email } = await req.json();

        if (!email) {
            return NextResponse.json({ error: "Email is required" }, { status: 400 });
        }

        const user = await prisma.user.findFirst({
            where: { 
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            },
            include: { tenant: true }
        });

        // Fail silently if user not found to prevent email enumeration
        if (!user) {
            return NextResponse.json({ success: true, message: "If that email exists, a reset link has been sent." }, { status: 200 });
        }

        // Generate Crypto Token
        const rawToken = crypto.randomBytes(32).toString('hex');

        // Save to User with 1 Hour Expiry
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 1);

        await prisma.user.updateMany({
            where: { 
                email: {
                    equals: email,
                    mode: 'insensitive'
                }
            },
            data: {
                resetToken: rawToken,
                resetTokenExpiry: expiry
            }
        });

        // Send Email
        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const resetLink = `${protocol}://${host}/reset-password?token=${rawToken}`;

        // Determine whether to use Tenant's Resend Key or Global System Key
        // If the user belongs to a tenant with a branded Resend key, we use that.
        // Otherwise, it falls back to global NEXT_PUBLIC_RESEND_API_KEY inside sendEmail

        const tenant = user.tenant;
        const brandColor = tenant?.brandColor || "#f59e0b";
        const logoUrl = tenant?.logoUrl || "";

        const emailResult = await sendEmail({
            to: email,
            subject: "Reset Your Password - Dispatch Platform",
            html: getResetPasswordEmail(resetLink, brandColor, logoUrl),
            apiKey: tenant?.resendApiKey
        });

        if (!emailResult.success) {
            console.error("[Forgot Password] Failed to send email", emailResult.error);
            return NextResponse.json({ error: "Failed to send recovery email. Please try again later." }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: "If that email exists, a reset link has been sent." }, { status: 200 });

    } catch (error) {
        console.error("Forgot Password Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
