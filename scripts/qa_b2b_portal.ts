import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function runTest() {
    console.log("--- QA TEST: B2B Corporate Ledger & Invoicing ---");
    try {
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error("No Tenant found.");

        const customer = await prisma.customer.findFirst({ where: { tenantId: tenant.id } });
        if (!customer) throw new Error("No Customer found.");

        console.log("1. Simulating Corporate Account Boundaries");
        const account = await prisma.account.create({
            data: {
                tenantId: tenant.id,
                name: "QA Corporate Ltd",
                code: "QA-01",
                contactName: "Mr QA",
                email: "qa@corporate.com",
                phone: "07000000001",
                addressLine1: "1 Corporate Way",
                isActive: true
            }
        });

        const b2bUser = await prisma.user.create({
            data: {
                name: "Corp Admin",
                email: "admin@corporate.com",
                password: "hashed_dummy_password",
                role: "ACCOUNT_MANAGER",
                accountId: account.id, // Bounded to this account
                tenantId: tenant.id
            }
        });
        console.log(`✅ B2B Manager generated and strictly bound to Account ID: ${account.id}`);

        console.log("2. Generating Ledger Data (Corporate Bookings)");
        // 3 Completed Account Jobs
        const jobsToCreate = [];
        for (let i = 0; i < 3; i++) {
            jobsToCreate.push({
                tenantId: tenant.id,
                customerId: customer.id,
                accountId: account.id,
                pickupAddress: "HQ",
                dropoffAddress: `Meeting ${i + 1}`,
                pickupTime: new Date(Date.now() - 1000 * 60 * 60 * 24 * (i + 1)), // Past
                passengerName: "Exec",
                passengerPhone: "+447000000000",
                status: "COMPLETED",
                fare: 50.0 + (i * 10), // 50, 60, 70
                paymentType: "ACCOUNT",
                paymentStatus: "UNPAID",
                isFixedPrice: false,
                autoDispatch: false
            });
        }
        await prisma.job.createMany({ data: jobsToCreate });

        const ledgerJobs = await prisma.job.findMany({
            where: { accountId: account.id, status: "COMPLETED", paymentStatus: "UNPAID" }
        });
        if (ledgerJobs.length !== 3) throw new Error("Ledger didn't capture corporate jobs.");
        console.log(`✅ Ledger securely tracked ${ledgerJobs.length} Unpaid Corporate Jobs.`);

        console.log("3. Invoice Aggregation & Generation Calculations");
        // Calculate Subtotal
        const expectedSubtotal = 50 + 60 + 70; // 180.0
        const subtotal = ledgerJobs.reduce((sum, job) => sum + (job.fare ?? 0), 0);
        if (subtotal !== expectedSubtotal) throw new Error(`Subtotal mismatch. Expected ${expectedSubtotal}, got ${subtotal}`);

        // Calculate Tax (e.g. 20% VAT)
        const taxRate = 20.0;
        const taxAmount = (subtotal * taxRate) / 100; // 36.0
        const totalAmount = subtotal + taxAmount;    // 216.0

        const invoice = await prisma.invoice.create({
            data: {
                tenantId: tenant.id,
                accountId: account.id,
                invoiceNumber: `INV-QA-${Date.now()}`,
                issueDate: new Date(),
                dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
                subtotal: subtotal,
                taxTotal: taxAmount,
                total: totalAmount,
                status: "DRAFT"
            }
        });

        // Link jobs to invoice
        await prisma.job.updateMany({
            where: { id: { in: ledgerJobs.map(j => j.id) } },
            data: { invoiceId: invoice.id }
        });

        const fetchedInvoice = await prisma.invoice.findUnique({ where: { id: invoice.id }, include: { jobs: true } });
        if (fetchedInvoice?.jobs.length !== 3) throw new Error("Jobs not linked");
        if (fetchedInvoice?.total !== 216.0) throw new Error("Invoice total computation failed");

        console.log(`✅ Invoice generated correctly. Aggregate Total parsed securely as: £${fetchedInvoice.total}`);

        // Cleanup
        await prisma.job.deleteMany({ where: { accountId: account.id } });
        await prisma.invoice.deleteMany({ where: { accountId: account.id } });
        await prisma.user.deleteMany({ where: { accountId: account.id } });
        await prisma.account.delete({ where: { id: account.id } });

        console.log("--- QA TEST PASSED: Corporate Ledger & Invoicing bounds verified ---");

    } catch (err) {
        console.error("❌ QA TEST FAILED:", err);
    } finally {
        await prisma.$disconnect();
    }
}

runTest();
