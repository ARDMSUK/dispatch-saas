const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findUnique({
        where: { id: 'cmotadopt00081184tr3olkzc' },
        include: { drivers: true }
    });

    const jobs = await prisma.job.findMany({
        where: {
            tenantId: tenant.id,
            passengerName: { contains: 'TEST PAYMENT SANDBOX' }
        },
        orderBy: { bookedAt: 'desc' }
    });

    console.log("1. Exactly one new clean TEST PAYMENT SANDBOX job exists:", jobs.length === 1 ? "true" : `false (found ${jobs.length})`);
    
    if (jobs.length > 0) {
        const job = jobs[0];
        console.log("2. Job booking/reference number:", job.id);
        console.log("3. Customer/passenger name:", job.passengerName);
        console.log("4. Email:", job.passengerEmail);
        console.log("5. Notes:", job.notes);
        console.log("6. paymentType:", job.paymentType);
        console.log("7. paymentStatus:", job.paymentStatus);
        console.log("8. Driver is unassigned:", job.driverId === null ? "true" : `false (${job.driverId})`);
        console.log("9. Tenant is London Exec Test:", job.tenantId === tenant.id ? "true" : "false");
        
        console.log("12. No paymentLink exists yet:", !job.paymentLink ? "true (null)" : `false (${job.paymentLink})`);
        console.log("13. stripeCheckoutSessionId is null:", job.stripeCheckoutSessionId === null ? "true" : `false (${job.stripeCheckoutSessionId})`);
        console.log("14. stripePaymentIntentId is null:", job.stripePaymentIntentId === null ? "true" : `false (${job.stripePaymentIntentId})`);
        console.log("15. paymentProblemStatus is null:", job.paymentProblemStatus === null ? "true" : `false (${job.paymentProblemStatus})`);
        console.log("16. paymentProblemReason is null:", job.paymentProblemReason === null ? "true" : `false (${job.paymentProblemReason})`);
        console.log("17. paymentLinkExpiresAt is null:", job.paymentLinkExpiresAt === null ? "true" : `false (${job.paymentLinkExpiresAt})`);
    }

    console.log("10. autoDispatch remains false:", tenant.settings?.autoDispatch === true ? "false" : "true");
    
    const onlineDrivers = tenant.drivers.filter(d => d.status === 'ONLINE' || d.status === 'AVAILABLE');
    console.log("11. Online driver count remains 0:", onlineDrivers.length === 0 ? "true" : `false (${onlineDrivers.length})`);

}

main().catch(console.error).finally(() => prisma.$disconnect());
