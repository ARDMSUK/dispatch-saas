import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/auth';
import { hash } from 'bcryptjs';
import { sendEmail, getWelcomeEmail } from '@/lib/email';

// POST /api/admin/tenants
export async function POST(req: Request) {
    try {
        const session = await auth();

        // Strict Super Admin Check
        if (session?.user?.role !== 'SUPER_ADMIN') {
            return NextResponse.json({ error: "Forbidden: Super Admin only" }, { status: 403 });
        }

        const body = await req.json();
        const {
            companyName, companySlug, companyEmail,
            adminName, adminEmail, adminPassword,
            stripeSecretKey, stripePublishableKey,
            twilioAccountSid, twilioAuthToken, twilioFromNumber,
            resendApiKey
        } = body;

        if (!companyName || !companySlug || !adminEmail || !adminPassword) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Check for duplicate Slug or Admin Email
        const existingTenant = await prisma.tenant.findUnique({ where: { slug: companySlug } });
        if (existingTenant) {
            return NextResponse.json({ error: "Tenant slug already exists" }, { status: 409 });
        }

        const existingUser = await prisma.user.findUnique({ where: { email: adminEmail } });
        if (existingUser) {
            return NextResponse.json({ error: "Admin email already exists" }, { status: 409 });
        }

        // Transaction: Create Tenant + Admin User
        const result = await prisma.$transaction(async (tx) => {
            // 1. Create Tenant
            const tenant = await tx.tenant.create({
                data: {
                    name: companyName,
                    slug: companySlug,
                    email: companyEmail,
                    stripeSecretKey,
                    stripePublishableKey,
                    twilioAccountSid,
                    twilioAuthToken,
                    twilioFromNumber,
                    resendApiKey
                }
            });

            // 2. Create Admin User linked to Tenant
            const hashedPassword = await hash(adminPassword, 12);
            const user = await tx.user.create({
                data: {
                    name: adminName,
                    email: adminEmail,
                    password: hashedPassword,
                    role: 'ADMIN', // The initial user is an ADMIN for that tenant
                    tenantId: tenant.id
                }
            });

            return { tenant, user };
        });

        // Send Welcome Email
        const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`;
        // Use the tenant's Resend key if provided, otherwise fallback to system
        await sendEmail({
            to: adminEmail,
            subject: "Welcome to Dispatch SaaS - Your Tenant is Ready",
            html: getWelcomeEmail(adminName, loginUrl, adminEmail, adminPassword),
            apiKey: resendApiKey
        });

        return NextResponse.json({ success: true, tenant: result.tenant }, { status: 201 });

    } catch (error) {
        console.error("Create Tenant Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
