import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

export async function POST(req: Request) {
    try {
        const { token, newPassword } = await req.json();

        if (!token || !newPassword) {
            return NextResponse.json({ error: "Token and new password are required" }, { status: 400 });
        }

        // Find user with valid token that hasn't expired
        const user = await prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date() // Must be greater than now
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 });
        }

        // Hash the new password and wipe the token
        const hashedPassword = await hash(newPassword, 12);

        await prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null
            }
        });

        return NextResponse.json({ success: true, message: "Password has been successfully reset. You may now log in." }, { status: 200 });

    } catch (error) {
        console.error("Reset Password Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
