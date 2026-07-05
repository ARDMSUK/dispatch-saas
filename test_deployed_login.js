const email = 'jamie.allan.business@gmail.com';
const password = 'P@ssw0rd1234';
const baseUrl = 'https://app.cabai.co.uk';

async function test() {
  console.log("Fetching CSRF token...");
  const csrfRes = await fetch(`${baseUrl}/api/auth/csrf`);
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  
  const cookies = csrfRes.headers.get('set-cookie');

  console.log("Logging in...");
  const loginRes = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookies
    },
    body: new URLSearchParams({
      csrfToken,
      email,
      password,
      json: 'true'
    })
  });
  
  const text = await loginRes.text();
  console.log("Login HTTP Status:", loginRes.status);
  console.log("Login HTTP Body:", text.substring(0, 300));
}

test().catch(console.error);
