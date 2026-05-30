
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getDriverSession } from '@/lib/driver-auth';
import { z } from 'zod';

const StatusSchema = z.object({
    status: z.enum(['FREE', 'OFF_DUTY', 'BUSY'])
});

export async function POST(req: Request) {
    try {
        const session = await getDriverSession(req);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const validation = StatusSchema.safeParse(body);

        if (!validation.success) {
            return NextResponse.json({ error: "Invalid status" }, { status: 400 });
        }

        const { status } = validation.data;

        // Fetch driver with documents and compliance override flags
        const driver = await prisma.driver.findUnique({
            where: { id: session.driverId },
            include: { documents: true }
        });

        if (!driver) {
            return NextResponse.json({ error: "Driver not found" }, { status: 404 });
        }

        const warnings: string[] = [];
        const blocks: string[] = [];
        const now = new Date();

        // 1. Enforce compliance checks ONLY when attempting to go online (FREE)
        if (status === 'FREE') {
            const requiredTypes = ['DRIVING_LICENSE', 'PCO_BADGE', 'INSURANCE'];

            // Check individual documents
            for (const type of requiredTypes) {
                const doc = driver.documents.find(d => d.type === type);
                if (!doc) {
                    blocks.push(`Missing document: ${type.replace('_', ' ')}`);
                } else if (doc.status === 'REJECTED') {
                    blocks.push(`Rejected document: ${type.replace('_', ' ')}`);
                } else if (doc.expiryDate) {
                    const expiry = new Date(doc.expiryDate);
                    if (expiry < now) {
                        blocks.push(`Expired document: ${type.replace('_', ' ')} (Expired on ${expiry.toLocaleDateString('en-GB')})`);
                    } else {
                        // Check if expiring within 7 days
                        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                        if (expiry <= sevenDaysFromNow) {
                            warnings.push(`Document ${type.replace('_', ' ')} is expiring soon on ${expiry.toLocaleDateString('en-GB')}`);
                        }
                    }
                }
            }

            // Check driver direct license expiry
            if (driver.licenseExpiry) {
                const expiry = new Date(driver.licenseExpiry);
                if (expiry < now) {
                    blocks.push(`Expired Taxi License (Expired on ${expiry.toLocaleDateString('en-GB')})`);
                } else {
                    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
                    if (expiry <= sevenDaysFromNow) {
                        warnings.push(`Taxi License is expiring soon on ${expiry.toLocaleDateString('en-GB')}`);
                    }
                }
            }

            // If compliance issues block going online, check manual override
            if (blocks.length > 0) {
                if (!driver.complianceOverrideActive) {
                    return NextResponse.json({
                        error: "Compliance Lockout",
                        message: "Unable to go online due to missing or expired compliance documents.",
                        blocks,
                        warnings
                    }, { status: 403 });
                } else {
                    console.log(`[COMPLIANCE] Driver ${driver.callsign} bypassed lockout via manual override. Reason: ${driver.complianceOverrideReason}`);
                    warnings.push(`Compliance lockout active but bypassed via manual override: ${driver.complianceOverrideReason || 'No reason provided'}`);
                }
            }
        }

        const updatedDriver = await prisma.driver.update({
            where: { id: driver.id },
            data: { status }
        });

        return NextResponse.json({
            success: true,
            status: updatedDriver.status,
            warnings
        });

    } catch (error) {
        console.error("Status Update Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

