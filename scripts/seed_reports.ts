import { prisma } from '../src/lib/prisma';
import { subDays, startOfDay, endOfDay } from 'date-fns';

async function main() {
    console.log("--- Starting Report Mock Data Injection ---");

    const tenant = await prisma.tenant.findFirst();
    if (!tenant) throw new Error("No Tenant found.");

    const accounts = await prisma.account.findMany({ where: { tenantId: tenant.id } });
    const drivers = await prisma.driver.findMany({ where: { tenantId: tenant.id } });

    if (accounts.length === 0 || drivers.length === 0) {
        console.log("Not enough accounts or drivers to generate meaningful reports. Please run root seed script first.");
        return;
    }

    console.log("Injecting 50 historical COMPLETED jobs across the last 30 days...");

    for (let i = 0; i < 50; i++) {
        // Random day in last 30 days
        const daysAgo = Math.floor(Math.random() * 30);
        // Random hour to test shift heatmaps nicely (bias towards morning 8am-10am and evening 5pm-8pm)
        const hourBiases = [8, 9, 10, 17, 18, 19, 20, Math.floor(Math.random() * 24)];
        const randomHour = hourBiases[Math.floor(Math.random() * hourBiases.length)];

        const dateObj = new Date(startOfDay(subDays(new Date(), daysAgo)).setHours(randomHour, Math.floor(Math.random() * 60)));

        const randomDriver = drivers[Math.floor(Math.random() * drivers.length)];
        // 50% chance it's a corporate B2B trip
        const randomAccount = Math.random() > 0.5 ? accounts[Math.floor(Math.random() * accounts.length)] : null;

        // Random fare between 15 and 95
        const fare = Math.floor(Math.random() * 80) + 15;

        // 10% chance it was cancelled instead of completed
        const status = Math.random() > 0.9 ? 'CANCELLED' : 'COMPLETED';

        await prisma.job.create({
            data: {
                tenantId: tenant.id,
                driverId: randomDriver.id,
                accountId: randomAccount?.id,
                pickupAddress: "Mock Reporting Origin",
                dropoffAddress: "Mock Reporting Dest",
                pickupTime: dateObj,
                bookedAt: new Date(dateObj.getTime() - 1000 * 60 * 60 * 2), // Booked 2 hours prior
                passengerName: "Auto Generated",
                passengerPhone: "+447000000000",
                passengers: 1,
                vehicleType: randomDriver.vehicleType || "Saloon",
                status: status,
                fare: fare,
                paymentType: randomAccount ? 'ACCOUNT' : 'CARD',
                paymentStatus: status === 'COMPLETED' ? 'PAID' : 'UNPAID',
                isFixedPrice: true,
                waitingTime: Math.random() > 0.7 ? 10 : 0,
                waitingCost: Math.random() > 0.7 ? 5 : 0,
                autoDispatch: true,
                isBilled: false,
            }
        });
    }

    console.log("✅ Successfully injected 50 mock jobs into historical Timeline.");

    // Now query the reporting engine API logic strictly via DB to verify numbers match conceptually
    const end = endOfDay(new Date());
    const start = startOfDay(subDays(end, 30));

    const totalStats = await prisma.job.aggregate({
        where: { tenantId: tenant.id, pickupTime: { gte: start, lte: end }, status: 'COMPLETED' },
        _sum: { fare: true },
        _count: { id: true }
    });

    console.log(`\\nVERIFICATION:\\nTotal Jobs (30d): ${totalStats._count.id}\\nTotal Revenue (30d): £${totalStats._sum.fare}`);
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
