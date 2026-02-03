import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { signDriverToken } from '@/lib/driver-auth';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { companySlug, callsign, pin } = body;

        if (!companySlug || !callsign || !pin) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Find Tenant
        const tenant = await prisma.tenant.findUnique({
            where: { slug: companySlug }
        });

        if (!tenant) {
            return NextResponse.json({ error: "Company not found" }, { status: 404 });
        }

        // 2. Find Driver
        const driver = await prisma.driver.findFirst({
            where: {
                tenantId: tenant.id,
                callsign: callsign
            }
        });

        if (!driver) {
            return NextResponse.json({ error: "Driver not found" }, { status: 404 });
        }

        // 3. Verify PIN
        // Note: For MVP we might have plain text or bcrypt. 
        // Existing schema says pin String? 
        // We will assume it's possibly plain text for now if not starting with $2
        let pinValid = false;

        if (driver.pin) {
            if (driver.pin.startsWith('$2')) {
                pinValid = await bcrypt.compare(pin, driver.pin);
            } else {
                pinValid = driver.pin === pin;
            }
        }

        if (!pinValid) {
            return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
        }

        // 4. Generate Token
        const token = await signDriverToken({
            driverId: driver.id,
            tenantId: tenant.id,
            name: driver.name,
            callsign: driver.callsign
        });

        return NextResponse.json({
            token,
            driver: {
                id: driver.id,
                name: driver.name,
                callsign: driver.callsign,
                status: driver.status
            }
        });

    } catch (error) {
        console.error("Driver Login Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
