
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePrice } from '@/lib/pricing';

export const dynamic = 'force-dynamic';

export async function GET() {
    const report: any = {
        status: 'starting',
        steps: []
    };

    try {
        // 1. Check DB Connection
        const tenantCount = await prisma.tenant.count();
        report.steps.push({ name: 'DB Connection', status: 'OK', details: `Found ${tenantCount} tenants` });

        // 2. Check Specific Tenant
        const slug = 'demo-taxis';
        const tenant = await prisma.tenant.findUnique({ where: { slug } });

        if (!tenant) {
            report.steps.push({ name: 'Tenant Check', status: 'FAILED', details: `Slug ${slug} not found` });
            throw new Error(`Tenant ${slug} missing`);
        }
        report.steps.push({ name: 'Tenant Check', status: 'OK', details: `Found ${tenant.name} (${tenant.id})` });

        // 3. Check Pricing Rules
        const rules = await prisma.pricingRule.findMany({ where: { tenantId: tenant.id } });
        report.steps.push({
            name: 'Pricing Rules',
            status: 'OK',
            details: `Found ${rules.length} rules`,
            samples: rules.map(r => `${r.vehicleType}: £${r.baseRate}+£${r.perMile}/mi`)
        });

        // 4. Test Calculation (Internal)
        report.steps.push({ name: 'Calculation Test', status: 'Running...' });
        const calcResult = await calculatePrice({
            pickup: 'Diagnosis Start',
            dropoff: 'Diagnosis End',
            pickupLat: 51.5074,
            pickupLng: -0.1278,
            dropoffLat: 53.4808,
            dropoffLng: -2.2426, // Approx 200 miles
            vehicleType: 'Saloon',
            companyId: tenant.id,
            distanceMiles: 0, // Should auto-calc
            pickupTime: new Date()
        });

        report.steps[3] = {
            name: 'Calculation Test',
            status: 'OK',
            details: `Price: ${calcResult.price}`,
            breakdown: calcResult.breakdown
        };

        return NextResponse.json({ success: true, report });

    } catch (error: any) {
        console.error("DIAGNOSIS FAILED", error);
        return NextResponse.json({
            success: false,
            report,
            error: error.message,
            stack: error.stack
        }, { status: 500 });
    }
}
