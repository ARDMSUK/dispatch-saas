# CABAI Platform - Super Admin Manual

## 1. System Overview
The CABAI Platform is a multi-tenant, AI-powered dispatch and fleet management system built to operate as a SaaS (Software as a Service). As the Super Admin (Platform Owner), you have global control over all tenants, system-wide API keys, and subscription billing.

## 2. Platform Architecture
- **Frontend/Backend:** Next.js (App Router), deployed on Vercel.
- **Database:** PostgreSQL (hosted on Neon.tech), managed via Prisma ORM.
- **Authentication:** NextAuth.js.
- **AI Integrations:** OpenAI (for WhatsApp/Web Chat routing and logic).
- **Communication APIs:** Evolution API (WhatsApp), Twilio (SMS), Resend (Email).

## 3. Super Admin Dashboard Features
To access the Super Admin Dashboard, log in with an account that has `role: SUPER_ADMIN` in the database.

### 3.1 Managing Tenants
- Navigate to the **Tenants** tab in the sidebar.
- **Add New Tenant:** Click the button to onboard a new company. You will define their unique "slug" (e.g., `beaconsfield-taxis`), which forms their login URL.
- **Impersonate Tenant:** As a Super Admin, you can click "Edit Dispatch Settings" to bypass authentication and instantly log into any tenant's dashboard to troubleshoot or configure their setup.

### 3.2 Tenant Subscriptions & Billing
- The **Subscriptions** module tracks the SaaS tier of each tenant.
- Configure whether they have access to premium features (like WhatsApp AI, Live Flight Tracking, or Wait & Return calculators).
- AI Usage Limits: You can strictly control how many AI requests a tenant can make per billing cycle to protect your OpenAI costs.

## 4. API Key Management
*Important: Global API keys are managed at the environment level. Tenant-specific overrides are managed via the Tenant database model.*

- **Evolution API (WhatsApp):** Each tenant must have a distinct WhatsApp instance mapped in the database (`whatsappInstanceId`).
- **AviationStack (Flights):** Flight tracking requires an API key. This is stored per-tenant to prevent one busy tenant from exhausting the global platform limits.
- **Stripe/SumUp:** Tenants can input their own Stripe or SumUp keys in their specific "Billing & Payments" settings so funds route directly to them.

## 5. Server Maintenance & Deployments
- **Code Pushes:** Any code pushed to the `main` branch of your GitHub repository will automatically trigger a production build on Vercel.
- **Database Migrations:** If you alter the database structure (`schema.prisma`), you must run `npx prisma db push` before deploying.
- **Monitoring:** Use Vercel's built-in logs to monitor API route failures. Pay special attention to `/api/whatsapp/webhook` as this is the core of the autonomous AI system.

## 6. Security Best Practices
- **Never expose the Super Admin password.**
- Ensure that tenant API keys (like Stripe secrets) are never returned in public API calls. They are strictly filtered out of non-admin API responses.
- Regularly monitor OpenAI usage costs via your OpenAI dashboard to ensure tenants are not abusing the AI agent limits.
