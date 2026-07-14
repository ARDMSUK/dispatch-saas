const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const job = await prisma.job.findUnique({
        where: { id: 406 },
        include: { tenant: { include: { drivers: true } } }
    });
    
    if (!job) {
        console.log("Job not found");
        return;
    }

    const tenant = job.tenant;

    console.log("1. paymentLink exists:", !!job.paymentLink);
    if (job.paymentLink) {
        console.log("2. paymentLink starts with expected format:", job.paymentLink.startsWith('https://checkout.stripe.com/'));
    }
    console.log("3. stripeCheckoutSessionId is populated:", !!job.stripeCheckoutSessionId);
    if (job.stripeCheckoutSessionId) {
        console.log("4. stripeCheckoutSessionId starts with cs_:", job.stripeCheckoutSessionId.startsWith('cs_'));
        console.log("stripeCheckoutSessionId:", job.stripeCheckoutSessionId);
    }
    
    console.log("5. paymentLinkExpiresAt is populated:", !!job.paymentLinkExpiresAt);
    if (job.paymentLinkExpiresAt) {
        console.log("paymentLinkExpiresAt:", job.paymentLinkExpiresAt.toISOString());
    }

    console.log("6. stripePaymentIntentId remains null:", job.stripePaymentIntentId === null ? "true" : `false (${job.stripePaymentIntentId})`);
    console.log("7. stripeChargeId remains null:", job.stripeChargeId === null ? "true" : `false (${job.stripeChargeId})`);
    
    console.log("8. paymentStatus remains UNPAID:", job.paymentStatus === 'UNPAID');
    console.log("9. paymentProblemStatus remains null:", job.paymentProblemStatus === null);
    console.log("10. paymentProblemReason remains null:", job.paymentProblemReason === null);
    
    console.log("11. Driver remains unassigned:", job.driverId === null);
    console.log("12. autoDispatch remains false:", tenant.settings?.autoDispatch === true ? "false" : "true");
    
    const onlineDrivers = tenant.drivers.filter(d => d.status === 'ONLINE' || d.status === 'AVAILABLE');
    console.log("13. online driver count remains 0:", onlineDrivers.length === 0);

}

main().catch(console.error).finally(() => prisma.$disconnect());
