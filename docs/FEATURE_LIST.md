# CABAI Platform - Complete Feature List

The CABAI Platform is a highly advanced, multi-tenant fleet dispatch and management system. Below is a comprehensive list of all features currently built into the platform.

## 1. Core Dispatch Console
- **Multi-Layout Support:** Dispatchers can choose between a "Modern" card-based layout or a "Classic" dense table layout depending on their preference.
- **Real-Time Job Statuses:** Visually distinct color-coded statuses (Pending, Confirmed, Reserved, Dispatched, En-Route, Arrived, POB, Completed, Cancelled).
- **Auto-Refresh:** The dashboard silently fetches new bookings in the background without requiring page reloads.
- **Manual Booking Creation:** Fast, optimized form for dispatchers to manually input telephone bookings.
- **Smart Filtering:** Filter the console by "Today", "All Future", "Unassigned", or search by passenger name/reference number.

## 2. Autonomous AI Booking Agents
- **WhatsApp Integration:** Full integration with the Evolution API to support a persistent WhatsApp bot.
- **Conversational Memory:** The AI remembers the context of the passenger's conversation.
- **Autonomous Pricing:** The AI calls internal tools to calculate quotes based on the tenant's specific pricing rules.
- **Autonomous Booking:** Once the passenger agrees, the AI creates the booking in the database and drops it straight into the dispatch console as "PENDING".

## 3. Advanced Fleet Pricing & Billing
- **Dynamic Pricing Rules:** Set different base rates and per-mile rates depending on the vehicle type (Saloon, Executive, MPV).
- **Zone-to-Zone Fixed Pricing:** Create custom geographic zones (e.g., "Heathrow Airport" or "Zone 1") and set flat-rate prices between them.
- **Payment Gateways:** Direct, tenant-level integration with Stripe, SumUp, and Zettle.
- **Wait & Return Calculator:** Automatically calculates additional wait time costs for round-trip jobs.

## 4. Intelligent Flight Tracking
- **AviationStack Integration:** Connects to live global flight databases.
- **Smart Caching:** Reduces API costs by using a lazy-polling database cache, only fetching data when necessary based on how close the flight is.
- **Visual Badges:** Visually alerts dispatchers if a flight is DELAYED, LANDED, or CANCELLED directly on the booking card.

## 5. Driver & Compliance Management
- **Driver Profiles:** Track driver details, callsigns, and assigned vehicles.
- **Vehicle Profiles:** Track make, model, color, and registration plates.
- **Compliance Tracking:** Upload and verify driver's licenses, MOTs, and insurance documents via Vercel Blob secure storage.
- **Administrative Override:** Super Admins can manually override compliance locks if a driver is cleared to work despite a system warning.
- **Commission & Settlements:** Advanced analytics dashboard to calculate weekly driver earnings, platform commissions, and outstanding balances.

## 6. Automated Notifications (Twilio & Resend)
- **Booking Confirmations:** Sends an automated SMS and Email when a dispatcher clicks "Accept & Confirm".
- **Driver Assigned:** Sends the passenger a text with the driver's name, vehicle details, and a live tracking link.
- **Driver Arrived:** Notifies the passenger the moment the driver arrives.
- **Cancellations:** Automatically sends a polite apology text/email if a dispatcher has to decline a booking due to lack of availability.

## 7. Multi-Tenant Architecture
- **White-Labeling:** Every tenant gets their own slug, logo, and brand color.
- **Data Isolation:** Prisma database architecture ensures strict isolation between different taxi companies using the platform.
- **Super Admin Impersonation:** Platform owners can seamlessly log into any tenant's dashboard to provide support.

## 8. B2B & specialized operations
- **School Runs:** Dedicated schema to handle recurring school contracts, student rosters, and passenger assistants (PAs).
- **Incident Reporting:** Built-in compliance logging for any issues occurring during a contracted route.
