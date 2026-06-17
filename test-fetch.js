const fetch = require('node-fetch');

async function run() {
    console.log("Logging in...");
    // 1. Get CSRF token
    const csrfRes = await fetch('https://app.cabai.co.uk/api/auth/csrf');
    const csrfData = await csrfRes.json();
    const csrfToken = csrfData.csrfToken;
    const cookies = csrfRes.headers.raw()['set-cookie'].map(c => c.split(';')[0]).join('; ');

    // 2. Login
    const loginRes = await fetch('https://app.cabai.co.uk/api/auth/callback/credentials', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': cookies
        },
        body: new URLSearchParams({
            email: 'hello@cabai.co.uk',
            password: 'Greenstar520!',
            csrfToken: csrfToken,
            json: 'true'
        })
    });
    
    const loginData = await loginRes.json();
    console.log("Login res:", loginData);
    
    let sessionCookies = loginRes.headers.raw()['set-cookie']?.map(c => c.split(';')[0]).join('; ') || cookies;

    // 3. Fetch tickets
    const ticketsRes = await fetch('https://app.cabai.co.uk/api/support/tickets', {
        headers: { 'Cookie': sessionCookies }
    });
    const tickets = await ticketsRes.json();
    console.log(`Found ${tickets.length} tickets`);
    
    if (tickets.length === 0) {
        console.log("No tickets, exiting.");
        return;
    }
    
    const ticketId = tickets[0].id;
    console.log(`Testing chat for ticket ${ticketId}...`);
    
    // 4. Send a chat message
    const chatRes = await fetch(`https://app.cabai.co.uk/api/support/tickets/${ticketId}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Cookie': sessionCookies
        },
        body: JSON.stringify({
            messages: [
                { role: 'user', content: 'Testing AI response' }
            ]
        })
    });
    
    console.log(`Status: ${chatRes.status}`);
    const text = await chatRes.text();
    console.log(`Response text: ${text.slice(0, 500)}`);
}

run().catch(console.error);
