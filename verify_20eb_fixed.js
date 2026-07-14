const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const tenant = await prisma.tenant.findUnique({
        where: { id: 'cmotadopt00081184tr3olkzc' },
        include: { drivers: true }
    });

    const job = await prisma.job.findUnique({
        where: { id: 406 }
    });

    console.log("1. Job exists:", job !== null ? "true" : "false");
    
    if (job) {
        console.log("2. Tenant is London Exec Test:", job.tenantId === tenant.id ? "true" : "false");
        console.log("3. Customer/passenger name:", job.passengerName);
        console.log("4. Passenger email:", job.passengerEmail);
        console.log("5. Notes:", job.notes);
        console.log("6. paymentType:", job.paymentType);
        console.log("7. paymentStatus:", job.paymentStatus);
        console.log("8. Driver is unassigned:", job.driverId === null ? "true" : `false (${job.driverId})`);
        
        console.log("11. paymentLink is null:", job.paymentLink === null ? "true" : `false (${job.paymentLink})`);
        console.log("12. stripeCheckoutSessionId is null:", job.stripeCheckoutSessionId === null ? "true" : `false (${job.stripeCheckoutSessionId})`);
        console.log("13. stripePaymentIntentId is null:", job.stripePaymentIntentId === null ? "true" : `false (${job.stripePaymentIntentId})`);
        console.log("14. stripeChargeId is null:", job.stripeChargeId === null ? "true" : `false (${job.stripeChargeId})`);
        console.log("15. paymentProblemStatus is null:", job.paymentProblemStatus === null ? "true" : `false (${job.paymentProblemStatus})`);
        console.log("16. paymentProblemReason is null:", job.paymentProblemReason === null ? "true" : `false (${job.paymentProblemReason})`);
        console.log("17. paymentProblemAt is null:", job.paymentProblemAt === null ? "true" : `false (${job.paymentProblemAt})`);
        console.log("18. paymentLinkExpiresAt is null:", job.paymentLinkExpiresAt === null ? "true" : `false (${job.paymentLinkExpiresAt})`);
    }

    console.log("9. autoDispatch remains false:", tenant.settings?.autoDispatch === true ? "false" : "true");
    
    const onlineDrivers = tenant.drivers.filter(d => d.status === 'ONLINE' || d.status === 'AVAILABLE');
    console.log("10. Online driver count remains 0:", onlineDrivers.length === 0 ? "true" : `false (${onlineDrivers.length})`);

}

main().catch(console.error).finally(() => prisma.$disconnect());
