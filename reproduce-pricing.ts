
import { calculatePrice } from './src/lib/pricing';
import { prisma } from './src/lib/prisma';

async function main() {
    console.log("--- Reproducing Pricing Calculation ---");

    // 1. Fetch Tenant
    const tenant = await prisma.tenant.findUnique({ where: { slug: 'demo-taxis' } });
    if (!tenant) throw new Error("Tenant not found");
    console.log("Tenant ID:", tenant.id);

    // 2. Simulate Payload (London to Manchester)
    const payload = {
        pickup: "London",
        dropoff: "Manchester",
        pickupLat: 51.5074,
        pickupLng: -0.1278,
        dropoffLat: 53.4808,
        dropoffLng: -2.2426,
        vehicleType: "Saloon",
        companyId: tenant.id,
        distanceMiles: 0, // Force calc
        pickupTime: new Date()
    };


    try {
        // SIMULATE API HANDLER VALIDATION
        const { z } = require('zod');

        const CalculateSchema = z.object({
            pickup: z.string(),
            dropoff: z.string(),
            vias: z.array(z.object({ address: z.string() })).optional(),
            distance: z.number().min(0).optional(),
            pickupLat: z.number().optional(),
            pickupLng: z.number().optional(),
            dropoffLat: z.number().optional(),
            dropoffLng: z.number().optional(),
            date: z.string().datetime().optional(),
            vehicleType: z.string().default('Saloon'),
            waitingTime: z.number().min(0).optional(),
            isWaitAndReturn: z.boolean().optional()
        });

        const body = {
            pickup: "London",
            dropoff: "Manchester",
            pickupLat: 51.5074,
            pickupLng: -0.1278,
            dropoffLat: 53.4808,
            dropoffLng: -2.2426,
            vehicleType: "Saloon",
            distance: 0, // Should pass
            // MISSING pickupTime (not in Schema)
            // MISSING companyId (not in Schema)
        };

        console.log("Validating Body:", body);
        const validation = CalculateSchema.safeParse(body);
        if (!validation.success) {
            console.error("Validation Failed:", JSON.stringify(validation.error, null, 2));
        } else {
            console.log("Validation Passed");

            // Proceed to calculate
            const { pickup, dropoff, distance } = validation.data;
            const result = await calculatePrice({
                pickup, dropoff,
                distanceMiles: distance,
                vehicleType: validation.data.vehicleType,
                pickupTime: new Date(),
                companyId: tenant.id,
                pickupLat: validation.data.pickupLat,
                pickupLng: validation.data.pickupLng,
                dropoffLat: validation.data.dropoffLat,
                dropoffLng: validation.data.dropoffLng
            });
            console.log("Result:", JSON.stringify(result, null, 2));
        }

    } catch (e: any) {
        console.error("CRASH DETECTED:", e);
        console.error("Stack:", e.stack);
    }
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
