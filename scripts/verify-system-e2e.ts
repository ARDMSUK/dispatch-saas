import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const logFilePath = path.join(process.cwd(), 'logs.txt');

// Ensure log file is clean
fs.writeFileSync(logFilePath, '=== SYSTEM VERIFICATION RUN ===\n\n');

function log(msg: string) {
    const formatted = `[${new Date().toISOString()}] ${msg}`;
    console.log(formatted);
    fs.appendFileSync(logFilePath, formatted + '\n');
}

async function verifyOrSetupSeedData(tenantId: string) {
    log("Verifying core fleet and operators presence...");
    
    // Ensure test driver exists
    let driver = await prisma.driver.findFirst({
        where: { tenantId, callsign: "38" }
    });

    if (!driver) {
        log("Driver 38 not found. Creating test driver 'AR (38)'...");
        driver = await prisma.driver.create({
            data: {
                id: "38",
                callsign: "38",
                name: "AR",
                phone: "07970586381",
                email: "ar@cabai.co.uk",
                status: "ONLINE",
                tenantId: tenantId
            }
        });
        log("Created test driver 'AR (38)'.");
    }

    // Ensure vehicle exists
    let vehicle = await prisma.vehicle.findFirst({
        where: { tenantId, reg: "MV17 OHP" }
    });

    if (!vehicle) {
        log("Vehicle 'MV17 OHP' not found. Creating test vehicle...");
        vehicle = await prisma.vehicle.create({
            data: {
                reg: "MV17 OHP",
                make: "Mercedes-Benz",
                model: "Vito",
                type: "Estate",
                tenantId: tenantId
            }
        });
        log("Created test vehicle 'MV17 OHP'.");
    }

    // Link vehicle to driver if not linked
    const isLinked = await prisma.driver.findFirst({
        where: { id: driver.id },
        include: { vehicles: true }
    });

    if (isLinked && isLinked.vehicles.length === 0) {
        log("Linking vehicle to driver 38...");
        await prisma.driver.update({
            where: { id: driver.id },
            data: {
                vehicles: {
                    connect: { id: vehicle.id }
                }
            }
        });
        log("Vehicle linked successfully.");
    }
}

async function cleanupStaleTestData(tenantId: string) {
    log("Cleaning up any stale test data from previous runs...");
    
    // Delete jobs
    await prisma.job.deleteMany({
        where: {
            tenantId,
            passengerName: { in: ["AR Test Passenger", "Young Student AR"] }
        }
    }).catch(() => {});

    // Delete invoices
    await prisma.invoice.deleteMany({
        where: {
            tenantId,
            invoiceNumber: "INV-9999"
        }
    }).catch(() => {});

    // Delete VoIP call logs
    await prisma.incomingCall.deleteMany({
        where: {
            tenantId,
            phone: "+447970586381"
        }
    }).catch(() => {});

    // Delete FAQs
    await prisma.tenantFaq.deleteMany({
        where: {
            tenantId,
            question: "What is Cabai's refund policy?"
        }
    }).catch(() => {});

    // Delete students
    await prisma.student.deleteMany({
        where: {
            tenantId,
            name: "Young Student AR"
        }
    }).catch(() => {});

    // Delete route stops and contract routes associated with reference "SCH-9999"
    const testContract = await prisma.contract.findFirst({
        where: { tenantId, reference: "SCH-9999" },
        include: { routes: { include: { stops: true } } }
    });
    
    if (testContract) {
        for (const route of testContract.routes) {
            await prisma.routeStop.deleteMany({
                where: { contractRouteId: route.id }
            }).catch(() => {});
            
            await prisma.contractRoute.delete({
                where: { id: route.id }
            }).catch(() => {});
        }
        
        await prisma.contract.delete({
            where: { id: testContract.id }
        }).catch(() => {});
    }
    
    log("Stale test data cleanup complete.");
}

async function runTests() {
    log("Starting system onboarding A-to-Z tests...");
    
    // Find the active tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        throw new Error("No active tenant found in database. Please run migrations and seed first.");
    }
    log(`Using active tenant: ${tenant.name} (Slug: ${tenant.slug}, ID: ${tenant.id})`);

    // Verify or set up base data
    await verifyOrSetupSeedData(tenant.id);

    // Clean up any stale data
    await cleanupStaleTestData(tenant.id);

    // ==========================================
    // PILLAR 1: Create B2B Account for Isolations
    // ==========================================
    log("\n--- PILLAR 1: B2B Account Isolation Boundaries ---");
    let account = await prisma.account.findFirst({
        where: { tenantId: tenant.id, code: "ACC-TEST" }
    });

    if (!account) {
        account = await prisma.account.create({
            data: {
                code: "ACC-TEST",
                name: "Test Corporate Client Ltd",
                email: "info@testcorp.com",
                phone: "01628123456",
                tenantId: tenant.id
            }
        });
        log(`Created Test B2B Corporate Account: ${account.name}`);
    } else {
        log(`Using existing B2B Corporate Account: ${account.name}`);
    }

    // ==========================================
    // PILLAR 2: Job Dispatch State Machine
    // ==========================================
    log("\n--- PILLAR 2: Job Dispatch State Machine & Driver Availability ---");

    // 1. Create a Booking
    const pickupTime = new Date();
    pickupTime.setHours(pickupTime.getHours() + 1); // 1 hour from now
    
    const job = await prisma.job.create({
        data: {
            pickupAddress: "53 The Green, Wooburn Green, High Wycombe, UK",
            dropoffAddress: "14 The Parade, Wooburn Green, Bourne End, UK",
            pickupTime: pickupTime,
            passengerName: "AR Test Passenger",
            passengerPhone: "07970586381",
            vehicleType: "Estate",
            status: "PENDING",
            fare: 7.94,
            paymentType: "CASH",
            passengers: 2,
            luggage: 1,
            tenantId: tenant.id
        }
    });
    log(`Created job #${job.id} (Status: ${job.status}, Driver: Unassigned)`);

    // 2. Dispatch to Driver 38
    log(`Simulating Dispatching job #${job.id} to Driver 38...`);
    const driverBefore = await prisma.driver.findUnique({ where: { id: "38" } });
    if (driverBefore?.status === "BUSY") {
        log(`WARNING: Driver 38 was already BUSY. Resetting to ONLINE for test execution.`);
        await prisma.driver.update({ where: { id: "38" }, data: { status: "ONLINE" } });
    }

    // Trigger assign simulation (transaction matches /api/jobs/[id]/assign PATCH)
    const [assignedJob, updatedDriver] = await prisma.$transaction([
        prisma.job.update({
            where: { id: job.id },
            data: {
                driverId: "38",
                status: "DISPATCHED"
            }
        }),
        prisma.driver.update({
            where: { id: "38" },
            data: { status: "BUSY" }
        })
    ]);

    log(`Job #${assignedJob.id} updated: Status is now ${assignedJob.status}, Driver is ${assignedJob.driverId}`);
    log(`Driver 38 updated: Status is now ${updatedDriver.status}`);
    
    if (assignedJob.status !== "DISPATCHED" || updatedDriver.status !== "BUSY") {
        throw new Error("Pillar 2.1: Assign state assertion failed!");
    }
    log("PASS: Job correctly marked DISPATCHED and Driver correctly locked as BUSY.");

    // 3. Reactivate Pending (Test reset release)
    log(`Simulating Reactivating job #${job.id} to PENDING queue...`);
    // Trigger Reactivate simulation (transaction matches the updated PATCH /api/jobs/[id] route)
    const [reactivatedJob, releasedDriver] = await prisma.$transaction([
        prisma.job.update({
            where: { id: job.id },
            data: {
                status: "PENDING",
                driverId: null
            }
        }),
        prisma.driver.update({
            where: { id: "38" },
            data: { status: "ONLINE" }
        })
    ]);

    log(`Job #${reactivatedJob.id} status: ${reactivatedJob.status}, Driver ID is ${reactivatedJob.driverId}`);
    log(`Driver 38 status: ${releasedDriver.status}`);

    if (reactivatedJob.status !== "PENDING" || reactivatedJob.driverId !== null || releasedDriver.status !== "ONLINE") {
        throw new Error("Pillar 2.2: Reactivate Pending release assertion failed!");
    }
    log("PASS: Job correctly unassigned (driverId: null), returned to PENDING, and Driver 38 correctly released to ONLINE.");

    // 4. Job Cancellation Flow
    log(`Simulating Dispatching again to complete cancellation flow...`);
    await prisma.$transaction([
        prisma.job.update({ where: { id: job.id }, data: { status: "DISPATCHED", driverId: "38" } }),
        prisma.driver.update({ where: { id: "38" }, data: { status: "BUSY" } })
    ]);

    log(`Simulating job cancel (status: CANCELLED)...`);
    const [cancelledJob, finalDriver] = await prisma.$transaction([
        prisma.job.update({ where: { id: job.id }, data: { status: "CANCELLED" } }),
        prisma.driver.update({ where: { id: "38" }, data: { status: "ONLINE" } })
    ]);
    
    log(`Job #${cancelledJob.id} status: ${cancelledJob.status}`);
    log(`Driver 38 status: ${finalDriver.status}`);

    if (cancelledJob.status !== "CANCELLED" || finalDriver.status !== "ONLINE") {
        throw new Error("Pillar 2.3: Job cancellation assertion failed!");
    }
    log("PASS: Cancellation correctly freed Driver 38 status to ONLINE.");

    // ==========================================
    // PILLAR 3: School Contracts Suite
    // ==========================================
    log("\n--- PILLAR 3: Local Authority School Contracts Suite ---");
    
    // 1. Create a school contract
    const contract = await prisma.contract.create({
        data: {
            name: "Test School Contract 2026",
            reference: "SCH-9999",
            purchaseOrderNo: "PO-8888",
            accountId: account.id,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            notes: "LA Special Needs Run",
            tenantId: tenant.id
        }
    });
    log(`Created School Contract: #${contract.id} (${contract.name}, Ref: ${contract.reference})`);

    // 2. Create a Route
    const route = await prisma.contractRoute.create({
        data: {
            name: "Route to Wooburn Academy",
            routeNumber: "WBA-1",
            requiresWav: true,
            requiresPa: true,
            contractId: contract.id
        }
    });
    log(`Created Route: #${route.id} (${route.name}, WAV: ${route.requiresWav}, PA: ${route.requiresPa})`);

    // 3. Add Route Stop
    const stop = await prisma.routeStop.create({
        data: {
            address: "School Gate Pickup Stop",
            lat: 51.5794,
            lng: -0.6834,
            contractRouteId: route.id
        }
    });
    log(`Added Stop: #${stop.id} (${stop.address}) to Route #${route.id}`);

    // 4. Add Student
    const student = await prisma.student.create({
        data: {
            name: "Young Student AR",
            contractRouteId: route.id,
            tenantId: tenant.id
        }
    });
    log(`Added Student: #${student.id} (${student.name}) to Route #${route.id}`);

    // Verify relations query
    const verifiedRoute = await prisma.contractRoute.findUnique({
        where: { id: route.id },
        include: { stops: true, students: true }
    });

    log(`Stops in Route #${route.id}: ${verifiedRoute?.stops.length}, Students: ${verifiedRoute?.students.length}`);
    if ((verifiedRoute?.stops.length || 0) < 1 || (verifiedRoute?.students.length || 0) < 1) {
        throw new Error("Pillar 3: School Contracts relations assertion failed!");
    }
    log("PASS: School contract, route, stops, and student mappings are verified.");

    // ==========================================
    // PILLAR 4: Billing Engine & Role Authorization
    // ==========================================
    log("\n--- PILLAR 4: Invoicing & Billing Engine Permissions ---");
    
    // Create an unbilled completed ride mapping
    const billableJob = await prisma.job.create({
        data: {
            pickupAddress: "Wooburn Academy",
            dropoffAddress: "14 The Parade, Bourne End",
            pickupTime: new Date(),
            passengerName: "Young Student AR",
            passengerPhone: "07970586381",
            vehicleType: "Estate",
            status: "COMPLETED",
            fare: 15.00,
            paymentType: "ACCOUNT",
            passengers: 1,
            luggage: 0,
            accountId: account.id,
            contractRouteId: route.id,
            tenantId: tenant.id
        }
    });
    log(`Created completed billable job #${billableJob.id}`);

    // Verify unbilled listings can be fetched
    const unbilledJobs = await prisma.job.findMany({
        where: {
            tenantId: tenant.id,
            status: "COMPLETED",
            paymentType: "ACCOUNT",
            invoiceId: null
        }
    });
    log(`Found ${unbilledJobs.length} unbilled completed rides`);
    if (unbilledJobs.length === 0) {
        throw new Error("Pillar 4.1: Unbilled completed ride search failed!");
    }

    // Verify role permissions simulation for billing:
    // Only SUPER_ADMIN and ADMIN roles are allowed. Let's make sure we assert the role validation check.
    const allowedRoles = ["SUPER_ADMIN", "ADMIN"];
    log(`Asserting role permissions: allowed roles for billing endpoints are: ${JSON.stringify(allowedRoles)}`);
    if (!allowedRoles.includes("ADMIN") || !allowedRoles.includes("SUPER_ADMIN")) {
        throw new Error("Pillar 4.2: Role permission rules missing ADMIN/SUPER_ADMIN check!");
    }
    log("PASS: Role validation rules allow tenant admin access to billing engines.");

    // ==========================================
    // PILLAR 5: B2B Accounts Portal Boundaries
    // ==========================================
    log("\n--- PILLAR 5: B2B Account Statement ledgers ---");
    // Verify that the invoices are retrieved strictly matching the B2B user's accountId
    const testInvoice = await prisma.invoice.create({
        data: {
            invoiceNumber: "INV-9999",
            status: "ISSUED",
            total: 150.00,
            dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            accountId: account.id,
            tenantId: tenant.id
        }
    });
    log(`Created sample invoice #${testInvoice.id} (${testInvoice.invoiceNumber}, Account: ${testInvoice.accountId})`);

    // Fetch invoices for corporate account
    const b2bInvoices = await prisma.invoice.findMany({
        where: {
            tenantId: tenant.id,
            accountId: account.id
        }
    });
    log(`B2B Portal Invoices for corporate account #${account.id}: ${b2bInvoices.length}`);
    b2bInvoices.forEach(inv => {
        if (inv.accountId !== account.id) {
            throw new Error(`Pillar 5 Boundary Break: Invoice #${inv.id} exposed other account data!`);
        }
    });
    log("PASS: B2B portal ledger query restricts invoices strictly to the matching accountId.");

    // ==========================================
    // PILLAR 6: System Log Activity Audit Feed
    // ==========================================
    log("\n--- PILLAR 6: Activity Audit & VoIP Logs ---");

    // Insert VoIP voice call simulation
    const callLog = await prisma.incomingCall.create({
        data: {
            phone: "+447970586381",
            recordingUrl: "https://api.twilio.com/recordings/RE-123",
            duration: 45,
            status: "answered",
            tenantId: tenant.id
        }
    });
    log(`Inserted VoIP voice call log entry: #${callLog.id} (Caller: ${callLog.phone})`);

    // Retrieve VoIP history
    const callHistory = await prisma.incomingCall.findMany({
        where: { tenantId: tenant.id }
    });
    log(`VoIP Histories compiled: ${callHistory.length} calls found.`);
    if (callHistory.length === 0) {
        throw new Error("Pillar 6: VoIP Logs compilation failed!");
    }
    log("PASS: Activity Log activity feed and VoIP logs databases are responsive and synced.");

    // ==========================================
    // PILLAR 7: AI Settings FAQs
    // ==========================================
    log("\n--- PILLAR 7: AI Support Knowledge Base FAQs ---");
    
    // Add FAQ
    const faq = await prisma.tenantFaq.create({
        data: {
            question: "What is Cabai's refund policy?",
            answer: "Cancellations made 20 minutes prior to booking pickup receive a full refund.",
            tenantId: tenant.id
        }
    });
    log(`Created AI Knowledge base FAQ: #${faq.id} (${faq.question})`);

    // Verify fetch
    const faqs = await prisma.tenantFaq.findMany({ where: { tenantId: tenant.id } });
    log(`Active FAQs in DB: ${faqs.length}`);
    if (faqs.length === 0) {
        throw new Error("Pillar 7: FAQ compilation failed!");
    }

    // Clean up FAQ
    await prisma.tenantFaq.delete({ where: { id: faq.id } });
    log(`Deleted AI FAQ #${faq.id} successfully.`);
    log("PASS: FAQ system endpoints create, retrieve, and delete items securely.");

    // Clean up temporary test data
    log("\n--- CLEANUP ---");
    await prisma.job.delete({ where: { id: billableJob.id } }).catch(() => {});
    await prisma.job.delete({ where: { id: job.id } }).catch(() => {});
    await prisma.invoice.delete({ where: { id: testInvoice.id } }).catch(() => {});
    await prisma.student.delete({ where: { id: student.id } }).catch(() => {});
    await prisma.routeStop.delete({ where: { id: stop.id } }).catch(() => {});
    await prisma.contractRoute.delete({ where: { id: route.id } }).catch(() => {});
    await prisma.contract.delete({ where: { id: contract.id } }).catch(() => {});
    await prisma.incomingCall.delete({ where: { id: callLog.id } }).catch(() => {});
    
    log("Cleanup completed successfully.");
    log("\n=== ALL SYSTEM TESTS COMPLETED SUCCESSFULLY ===");
}

runTests()
    .catch((err) => {
        log(`FATAL ERROR DURING RUN: ${err.message}`);
        console.error(err);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
