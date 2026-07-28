import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.smoke' });

const baseUrl = process.env.SMOKE_BASE_URL;
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;

if (!baseUrl) {
    console.error("SMOKE_BASE_URL is not set in .env.smoke");
    process.exit(1);
}

if (!bypassSecret && baseUrl.includes('vercel.app')) {
    console.warn("⚠️  WARNING: SMOKE_BASE_URL is a vercel.app preview URL, but VERCEL_AUTOMATION_BYPASS_SECRET is missing. Vercel Preview Protection will likely block these requests.");
}

async function runDiagnostic() {
    console.log("Starting Diagnostic...\n");

    const tests = [
        { method: 'GET', path: '/' },
        { method: 'GET', path: '/login' },
        { method: 'GET', path: '/api/jobs' },
        { method: 'POST', path: '/api/stripe/webhook', body: '{}' }
    ];

    let vercelInterceptDetected = false;

    for (const t of tests) {
        const url = `${baseUrl}${t.path}`;
        console.log(`[CHECK] ${t.method} ${t.path}`);
        
        try {
            const headers: HeadersInit = t.body ? { 'Content-Type': 'application/json' } : {};
            if (bypassSecret) {
                headers['x-vercel-protection-bypass'] = bypassSecret;
            }

            const res = await fetch(url, {
                method: t.method,
                body: t.body ? t.body : undefined,
                headers,
                redirect: 'follow'
            });

            console.log(`Requested URL: ${url}`);
            console.log(`Final URL: ${res.url}`);
            console.log(`Status: ${res.status}`);
            console.log(`Content-Type: ${res.headers.get('content-type') || 'none'}`);

            let detected = 'Unknown';

            if (res.url.includes('vercel.com/sso-api') || res.url.includes('vercel.app/custom-login') || res.headers.has('x-vercel-id')) {
                // If it redirected to a vercel SSO page, or returned 401 with Vercel protection headers
                if (res.url.includes('vercel.com/sso-api')) {
                    detected = 'Vercel SSO intercept';
                    vercelInterceptDetected = true;
                } else if (res.status === 401 && res.headers.get('x-vercel-id')) {
                    detected = 'Vercel SSO intercept (401)';
                    vercelInterceptDetected = true;
                } else if (res.url === url && res.status === 200 && t.path === '/login') {
                    detected = 'CabAI login page';
                } else if (res.url === url && res.status === 400 && t.path === '/api/stripe/webhook') {
                    detected = 'CabAI app (Missing Signature)';
                } else {
                    detected = `App reached (Status ${res.status})`;
                }
            } else {
                if (res.url === url && res.status === 200 && t.path === '/login') {
                    detected = 'CabAI login page';
                } else if (res.url === url && res.status === 400 && t.path === '/api/stripe/webhook') {
                    detected = 'CabAI app (Missing Signature)';
                } else {
                    detected = `App reached (Status ${res.status})`;
                }
            }

            console.log(`Detected: ${detected}`);

            if (t.path === '/api/stripe/webhook') {
                console.log(`Expected:\n- 400 missing Stripe signature if app reached\n- 302/401/403 Vercel SSO if blocked before app`);
            }
            
            console.log("--------------------------------------------------");

        } catch (err: any) {
            console.error(`Error fetching ${url}: ${err.message}`);
        }
    }

    console.log("Conclusion:");
    console.log(`Automation blocked by Vercel Preview Protection: ${vercelInterceptDetected ? 'YES' : 'NO'}`);
}

runDiagnostic().catch(console.error);
