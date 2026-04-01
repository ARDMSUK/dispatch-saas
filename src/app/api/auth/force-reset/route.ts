import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function POST(req: Request) {
    try {
        const session = await auth();

        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!session.user.forcePasswordReset) {
            return NextResponse.json({ error: "Password reset not required" }, { status: 400 });
        }

        const body = await req.json();
        const { newPassword } = body;

        if (!newPassword || newPassword.length < 8) {
            return NextResponse.json({ error: "New password must be at least 8 characters long" }, { status: 400 });
        }

        const hashedPassword = await hash(newPassword, 12);

        await prisma.user.update({
            where: { id: session.user.id },
            data: {
                password: hashedPassword,
                forcePasswordReset: false,
            },
        });

        return NextResponse.json({ success: true, message: "Password updated successfully" }, { status: 200 });
    } catch (error) {
        console.error("Force Reset Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
