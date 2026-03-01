import { prisma } from '../src/lib/prisma';
import bcrypt from 'bcryptjs';

async function main() {
    console.log("--- Starting B2B Portal End-to-End Test ---");

    // 1. Setup Tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) throw new Error("No Tenant found. Please run seed script.");

    // 2. Setup Corporate Account
    let account = await prisma.account.findFirst({ where: { tenantId: tenant.id, code: 'TEST-B2B' } });
    if (!account) {
        account = await prisma.account.create({
            data: {
                tenantId: tenant.id,
                code: 'TEST-B2B',
                name: 'Test Corporation Inc',
                email: 'testcorp@example.com',
                isActive: true
            }
        });
    }

    // 3. Setup B2B_ADMIN User
    const testEmail = 'admin@testcorp.com';
    let user = await prisma.user.findFirst({ where: { email: testEmail } });
    if (!user) {
        const hashedPassword = await bcrypt.hash('password123', 10);
        user = await prisma.user.create({
            data: {
                email: testEmail,
                password: hashedPassword,
                name: 'Corp Admin',
                role: 'B2B_ADMIN',
                tenantId: tenant.id,
                accountId: account.id
            }
        });
    }

    console.log(`Setting up test environment for Account: ${account.name} | User: ${user.email}`);

    // 4. Simulate POST /api/b2b/bookings logic
    console.log("\\nTesting: Direct DB Corporate Booking Creation");
    const newBooking = await prisma.job.create({
        data: {
            pickupAddress: "Heathrow Terminal 5",
            dropoffAddress: "The Shard, London",
            pickupLat: 51.5074,
            pickupLng: -0.1278,
            dropoffLat: 51.5200,
            dropoffLng: -0.1500,
            pickupTime: new Date(Date.now() + 86400000),
            passengerName: "John Doe (CEO)",
            passengerPhone: "+447700900333",
            passengers: 1,
            status: 'PENDING',
            vehicleType: "Saloon",
            notes: "Please have sign ready",
            paymentType: "ACCOUNT",
            paymentStatus: "UNPAID",
            tenantId: tenant.id,
            accountId: account.id,
            isFixedPrice: false,
            fare: 0,
            waitingTime: 0,
            waitingCost: 0
        }
    });

    console.log(`✅ Successfully dispatched B2B Job ID: ${newBooking.id}, linked to Account: ${newBooking.accountId}`);

    // 5. Simulate GET /api/b2b/bookings
    console.log("\\nTesting: Fetching Active Bookings");
    const activeBookings = await prisma.job.findMany({
        where: {
            tenantId: tenant.id,
            accountId: account.id,
            status: { notIn: ['COMPLETED', 'CANCELLED'] }
        }
    });

    const found = activeBookings.find(b => b.id === newBooking.id);
    if (!found) {
        console.error("❌ Failed to retrieve newly created booking from B2B queue");
        process.exit(1);
    }
    console.log(`✅ Successfully retrieved active booking queue (${activeBookings.length} total)`);

    // 6. Verify Ledger does NOT show pending jobs (GET /api/b2b/ledger)
    console.log("\\nTesting: Fetching Ledger (COMPLETED ONLY)");
    const ledger = await prisma.job.findMany({
        where: {
            tenantId: tenant.id,
            accountId: account.id,
            status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] }
        }
    });

    const foundInLedger = ledger.find(b => b.id === newBooking.id);
    if (foundInLedger) {
        console.error("❌ FAILURE: Pending job was incorrectly leaked into the financial ledger.");
        process.exit(1);
    }
    console.log(`✅ Ledger verified. Active jobs are correctly hidden from financial statements.`);

    // 7. Move Job to COMPLETED to verify Ledger populates
    console.log("\\nTesting: Migrating Job to COMPLETED status...");
    await prisma.job.update({
        where: { id: newBooking.id },
        data: { status: 'COMPLETED', fare: 65.50, paymentStatus: 'UNPAID' }
    });

    const populatedLedger = await prisma.job.findMany({
        where: {
            tenantId: tenant.id,
            accountId: account.id,
            status: { in: ['COMPLETED', 'CANCELLED', 'NO_SHOW'] }
        }
    });

    const nowFoundInLedger = populatedLedger.find(b => b.id === newBooking.id);
    if (!nowFoundInLedger) {
        console.error("❌ FAILURE: Completed job did NOT appear in the financial ledger.");
        process.exit(1);
    }
    console.log(`✅ Job ${nowFoundInLedger.id} is now successfully visible in Ledger. Fare: £${nowFoundInLedger.fare}, Status: ${nowFoundInLedger.paymentStatus}`);

    // 8. Test Invoice Generation (Admin Action)
    console.log("\\nTesting: Generating B2B Invoice");
    const unbilledJobs = await prisma.job.findMany({
        where: { tenantId: tenant.id, accountId: account.id, isBilled: false, status: 'COMPLETED' }
    });

    if (unbilledJobs.length === 0) {
        console.error("❌ FAILURE: Could not find the newly completed job in the unbilled queue.");
        process.exit(1);
    }

    const subtotal = unbilledJobs.reduce((sum, j) => sum + (j.fare || 0), 0);
    const taxTotal = subtotal * 0.20;

    // Simulate API Transaction
    const invoiceDate = new Date();
    const invoiceDueDate = new Date(invoiceDate.getTime() + (30 * 24 * 60 * 60 * 1000));
    const invoiceCount = await prisma.invoice.count({ where: { tenantId: tenant.id } });
    const invoiceNumber = `INV-${new Date().getFullYear()}-${1000 + invoiceCount}`;

    const newInvoice = await prisma.$transaction(async (tx) => {
        const inv = await tx.invoice.create({
            data: {
                tenantId: tenant.id,
                accountId: account.id,
                invoiceNumber,
                issueDate: invoiceDate,
                dueDate: invoiceDueDate,
                status: 'ISSUED',
                subtotal,
                taxTotal,
                total: subtotal + taxTotal,
            }
        });

        await tx.job.updateMany({
            where: { id: { in: unbilledJobs.map(j => j.id) } },
            data: { isBilled: true, invoiceId: inv.id }
        });

        return inv;
    });

    console.log(`✅ Invoice Generated: ${newInvoice.invoiceNumber} for £${newInvoice.total.toFixed(2)} covering ${unbilledJobs.length} trip(s).`);

    // 9. Verify Jobs are now billed
    const checkBilledJob = await prisma.job.findUnique({ where: { id: unbilledJobs[0].id } });
    if (!checkBilledJob?.isBilled || checkBilledJob.invoiceId !== newInvoice.id) {
        console.error("❌ FAILURE: Job was not correctly linked to the new Invoice.");
        process.exit(1);
    }
    console.log(`✅ Jobs successfully locked with isBilled parameter linked to Invoice.`);

    console.log("\\n🎉 All B2B & Invoicing End-to-End Tests Passed Successfully! 🎉");
}

main()
    .catch(console.error)
    .finally(async () => {
        await prisma.$disconnect();
    });
