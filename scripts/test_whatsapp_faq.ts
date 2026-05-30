import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testWhatsappFaq() {
    console.log("--- STARTING WHATSAPP FAQ RAG MATCHING TESTS ---");

    // 1. Get a valid tenant
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
        throw new Error("No tenant found. Run setup first.");
    }
    console.log(`Using Tenant: ${tenant.name} (${tenant.id})`);

    // 2. Seed test FAQs
    console.log("\nSeeding test FAQs...");
    const seededFaqs = await Promise.all([
        prisma.tenantFaq.create({
            data: {
                tenantId: tenant.id,
                question: "Do you have baby seats or booster seats?",
                answer: "Yes, we provide baby seats, child seats, and booster seats on request. Please let us know the child's age when booking. There is no additional charge."
            }
        }),
        prisma.tenantFaq.create({
            data: {
                tenantId: tenant.id,
                question: "Where is the meeting point at Heathrow Airport?",
                answer: "For Heathrow Airport pickups, the meeting point is in the arrival hall of the terminal. The driver will be holding a name board near the airport information desk."
            }
        }),
        prisma.tenantFaq.create({
            data: {
                tenantId: tenant.id,
                question: "What is your cancellation policy?",
                answer: "Bookings can be cancelled free of charge up to 3 hours before the scheduled pickup time. Cancellations made within 3 hours are subject to a 50% charge."
            }
        })
    ]);
    console.log(`Seeded ${seededFaqs.length} FAQs successfully.`);

    // Matcher implementation from the webhook (simulate it locally to verify correctness)
    async function performFaqLookup(query: string): Promise<any[]> {
        const rawFaqs = await prisma.tenantFaq.findMany({
            where: { tenantId: tenant.id }
        });
        
        const queryLower = query.toLowerCase();
        return rawFaqs.filter(faq => {
            const q = faq.question.toLowerCase();
            const a = faq.answer.toLowerCase();
            return q.includes(queryLower) || a.includes(queryLower) || 
                   queryLower.split(' ').some((word: string) => word.length > 3 && (q.includes(word) || a.includes(word)));
        });
    }

    try {
        // Test Case A: Substring match (matching query)
        console.log("\n[Test A] Searching for 'booster seat'...");
        const matchesA = await performFaqLookup("booster seat");
        console.log("Matches found:", matchesA.length);
        if (matchesA.length === 0 || !matchesA[0].answer.includes("booster seats on request")) {
            throw new Error("Test A failed: 'booster seat' query didn't return the baby seat FAQ.");
        }
        console.log("✅ Test A passed: Substring matching works.");

        // Test Case B: Multiple words query (word-by-word fallback matching)
        console.log("\n[Test B] Searching for 'cancel my taxi ride'...");
        const matchesB = await performFaqLookup("cancel my taxi ride");
        console.log("Matches found:", matchesB.length);
        if (matchesB.length === 0 || !matchesB[0].answer.includes("cancelled")) {
            throw new Error("Test B failed: 'cancel' keyword didn't trigger cancellation policy FAQ.");
        }
        console.log("✅ Test B passed: Keyword fallback matching works.");

        // Test Case C: Heathrow meeting point query
        console.log("\n[Test C] Searching for 'where do I meet the driver at Heathrow?'...");
        const matchesC = await performFaqLookup("where do I meet the driver at Heathrow?");
        console.log("Matches found:", matchesC.length);
        if (matchesC.length === 0 || !matchesC[0].answer.includes("arrival hall")) {
            throw new Error("Test C failed: 'Heathrow meeting' query didn't return airport terminal FAQ.");
        }
        console.log("✅ Test C passed: Heathrow meeting point matching works.");

        // Test Case D: No match query
        console.log("\n[Test D] Searching for 'do you accept dogs or pets?'...");
        const matchesD = await performFaqLookup("do you accept dogs or pets?");
        console.log("Matches found:", matchesD.length);
        if (matchesD.length > 0) {
            throw new Error("Test D failed: Unrelated query returned matches.");
        }
        console.log("✅ Test D passed: Irrelevant queries correctly yield zero matches.");

    } finally {
        // Cleanup seeded FAQs
        console.log("\nCleaning up seeded FAQs...");
        await prisma.tenantFaq.deleteMany({
            where: {
                id: {
                    in: seededFaqs.map(f => f.id)
                }
            }
        });
        console.log("Cleanup complete.");
        await prisma.$disconnect();
    }
    console.log("\n--- WHATSAPP FAQ RAG MATCHING TESTS COMPLETED SUCCESSFULLY ---");
}

testWhatsappFaq().catch(err => {
    console.error("Test execution failed:", err);
    process.exit(1);
});
