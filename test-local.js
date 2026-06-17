// Native fetch

async function run() {
    console.log("Fetching chat...");
    const chatRes = await fetch(`http://localhost:3000/api/support/tickets/cmm9vtubv0001yuvp95839dge/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            messages: [
                { role: 'assistant', content: 'Hello', name: 'CABAI' },
                { role: 'user', content: 'Testing AI response' }
            ]
        })
    });
    
    console.log(`Status: ${chatRes.status}`);
    const text = await chatRes.text();
    console.log(`Response text: ${text}`);
}

run().catch(console.error);
