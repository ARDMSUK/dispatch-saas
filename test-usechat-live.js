const https = require('https');

async function test() {
  const tid = 'cmqhh0mmi000111zvpj148rxa'; // Fetch GET test ticket ID

  const options = {
    hostname: 'app.cabai.co.uk',
    port: 443,
    path: `/api/support/tickets/${tid}/chat`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Send a session cookie from one of our tests if needed, but wait!
      // The POST endpoint requires auth! We need a session cookie.
    }
  };
  
  // Actually we already did this in test-live-fetch-json.js using Puppeteer's page.evaluate!
}
test();
