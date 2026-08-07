import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin, requireTenantAdmin, requireDispatcher, requireB2BAccountScope } from "@/utils/rbac";
import { requireActiveTenant } from '@/utils/lockout';
import { hash } from 'bcryptjs';
import { sendEmail, getWelcomeEmail } from '@/lib/email';


// GET /api/users
export async function GET() {
    try {
        const { session, error: lockoutError } = await requireActiveTenant('READ');
        if (lockoutError) return lockoutError;

        const { error: rbacError } = await requireTenantAdmin();
        if (rbacError) return rbacError;
        const users = await prisma.user.findMany({
            where: { tenantId: session.user.tenantId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                permissions: true,
                sipExtension: true,
                createdAt: true,
            },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json(users);
    } catch (error) {
        console.error("GET /api/users error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

// POST /api/users
export async function POST(req: Request) {
    try {
        const { session, error: lockoutError } = await requireActiveTenant('WRITE');
        if (lockoutError) return lockoutError;

        const { error: rbacError } = await requireTenantAdmin();
        if (rbacError) return rbacError;
        const body = await req.json();
        let { name, email, role, permissions, sipExtension } = body;

        if (!name || !email || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        email = email.trim().toLowerCase();
        if (!email.match(/^\\S+@\\S+\\.\\S+$/)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
        }

        if (role === 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden: Cannot create SUPER_ADMIN" }, { status: 403 });
        }

        const ALLOWED_ROLES = ["ADMIN", "DISPATCHER", "DRIVER", "B2B_ADMIN"];
        if (!ALLOWED_ROLES.includes(role)) {
            return NextResponse.json({ error: "Invalid or unsupported role" }, { status: 400 });
        }

        // Check if user exists
        const existing = await prisma.user.findUnique({
            where: { email }
        });

        if (existing) {
            return NextResponse.json({ error: "User with this email already exists." }, { status: 409 });
        }

        const { randomBytes } = await import('crypto');
        const randomPass = randomBytes(32).toString('hex');
        const hashedPassword = await hash(randomPass, 12);

        const setupToken = randomBytes(32).toString('hex');
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 1);

        const user = await prisma.user.create({
            data: {
                name,
                email,
                password: hashedPassword,
                role,
                permissions: Array.isArray(permissions) ? permissions : [],
                sipExtension: sipExtension || null,
                tenantId: session.user.tenantId,
                resetToken: setupToken,
                resetTokenExpiry: expiry,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                permissions: true,
                sipExtension: true,
                createdAt: true
            }
        });

        // Send Welcome Email
        const tenant = await prisma.tenant.findUnique({
            where: { id: session.user.tenantId }
        });
        const tenantName = tenant?.name || "Cabai";
        const brandColor = tenant?.brandColor || "#f59e0b";
        const logoUrl = tenant?.logoUrl || "";

        const host = req.headers.get('host') || 'localhost:3000';
        const protocol = host.includes('localhost') ? 'http' : 'https';
        const loginUrl = `${protocol}://${host}/login`;
        const setupLink = `${protocol}://${host}/reset-password?token=${setupToken}`;
        
        await sendEmail({
            to: email,
            subject: `Welcome to ${tenantName}`,
            html: getWelcomeEmail(name, loginUrl, email, setupLink, tenantName, brandColor, logoUrl)
        });

        return NextResponse.json(user, { status: 201 });

    } catch (error) {
        console.error("POST /api/users error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
