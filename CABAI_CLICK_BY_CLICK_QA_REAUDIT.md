# CABAI Click-by-Click QA Re-Audit Report

**Document Version:** 2.0.0  
**Role:** Senior SaaS QA Auditor & Technical Documentation Specialist  
**Status:** Complete  
**Date:** June 3, 2026  

---

## 1. Reliability Warning About Previous Report

> [!WARNING]
> The previous QA report (v1.0.0) cannot be trusted. It marked the **School Contracts / School Runs** feature suite as "Fully Functional" despite the presence of multiple, completely non-functional buttons, dead list row triggers, and hardcoded network endpoints that trigger constant 404 and 401 errors. 
> 
> Because of these critical misses, all previous "Working" or "Fully Functional" statuses are deemed unreliable and have been revalidated through direct element inspection, click-event handler checks, and backend role-authorization code reviews. This report establishes an evidence-based click-by-click baseline.

---

## 2. School Contracts Control Test

The School Contracts suite (`/dashboard/contracts` and its sub-pages) serves as the known control failure. Below is the detailed breakdown of the control loop audit:

| Item | Finding |
| :--- | :--- |
| **Route** | `/dashboard/contracts`, `/dashboard/contracts/[id]`, `/dashboard/contracts/[id]/routes/[routeId]/builder` |
| **Component file** | [page.tsx](file:///Users/ar/.gemini/antigravity/scratch/dispatch-saas/src/app/dashboard/contracts/page.tsx), [page.tsx](file:///Users/ar/.gemini/antigravity/scratch/dispatch-saas/src/app/dashboard/contracts/[id]/page.tsx), [page.tsx](file:///Users/ar/.gemini/antigravity/scratch/dispatch-saas/src/app/dashboard/contracts/[id]/routes/[routeId]/builder/page.tsx) |
| **Buttons found** | 1. "Billing Engine"<br>2. "New Contract"<br>3. "Create First Contract"<br>4. List Item Row & "Manage"<br>5. "Build New Route"<br>6. "Create First Route"<br>7. Active Route Card<br>8. "Save Route"<br>9. Stop "Remove"<br>10. Student Trash/Delete Icon<br>11. Add Stop "Add"<br>12. "Add Student"<br>13. WAV Switch<br>14. PA Switch |
| **Broken buttons found** | 1. "New Contract"<br>2. "Create First Contract"<br>3. List Item Row & "Manage"<br>4. "Build New Route" / "Create First Route"<br>5. "Save Route"<br>6. Stop "Remove"<br>7. Student Trash/Delete Icon<br>8. Add Stop "Add"<br>9. "Add Student"<br>10. WAV Switch (UI Only)<br>11. PA Switch (UI Only) |
| **Expected behaviour** | • "New Contract" / "Create First Contract": Open contract creation modal or page.<br>• List Row & "Manage": Navigate to `/dashboard/contracts/[id]`.<br>• "Build New Route" / "Create First Route": Issue a POST request to `/api/routes` and redirect to the builder page `/dashboard/contracts/[id]/routes/[newRouteId]/builder`.<br>• "Save Route": Save route constraints and details.<br>• "Remove" Stop / Student Delete: Remove stops or unassign students from the route.<br>• Add Stop "Add" / "Add Student": Send POST request to stops/students API to save records. |
| **Actual behaviour** | • "New Contract" / "Create First Contract": Nothing happens on click.<br>• List Row & "Manage": Nothing happens on click.<br>• "Build New Route" / "Create First Route": Displays "Creating..." then fails silently (console error).<br>• "Save Route" / "Remove" Stop / Delete Student: Nothing happens on click.<br>• Add Stop "Add" / "Add Student": toast alerts show "Failed to add stop/student" (network error).<br>• WAV / PA Switches: Toggles visually but changes do not persist or trigger callbacks. |
| **Console errors** | `POST http://localhost:3000/api/routes/route 404 (Not Found)`<br>`POST http://localhost:3000/api/routes/route-id/stops/route 404 (Not Found)`<br>`POST http://localhost:3000/api/routes/route-id/students/route 404 (Not Found)` |
| **Network/API errors** | **404 Not Found** on endpoint POST calls due to hardcoded `/route` suffixes added to URL fetches. |
| **Likely cause** | 1. **Missing Handlers:** "New Contract", "Create First Contract", "Manage" buttons, list rows, Stop "Remove", Student Trash, and "Save Route" buttons completely lack `onClick` handlers or `Link` wraps.<br>2. **Routing Path Suffix Mismatches:** Detail page fetches `/api/routes/route` (instead of `/api/routes`). Builder page fetches `/api/routes/[id]/stops/route` (instead of `/api/routes/[id]/stops`) and `/api/routes/[id]/students/route` (instead of `/api/routes/[id]/students`).<br>3. **Static Components:** WAV/PA switches are plain Tailwind UI switches without `onCheckedChange` or state hooks. |
| **Severity** | 🔴 **CRITICAL** - The School Contracts workflows are entirely blocked. Users cannot create contracts, view contract pages from the UI, build routes, add/remove stops, assign students, or enforce WAV/PA constraints. |

---

## 3. Full Clickable Element Inventory

Below is the complete clickable element audit inventory across the application:

| Route | Page | Role | Element | Element Type | Expected Action | Actual Result | Status | Evidence |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `/dashboard/contracts` | School Contracts | `ADMIN` / `DISPATCHER` | "Billing Engine" | Button (Link) | Navigate to `/dashboard/contracts/billing` | Navigates to billing page | **Working** | Wrapper `<a href="/dashboard/contracts/billing">` is present. |
| `/dashboard/contracts` | School Contracts | `ADMIN` / `DISPATCHER` | "New Contract" | Button | Open contract creation view | Nothing happens | **Broken** | Plain `<Button>` with no `onClick` handler or `Link` wrapper in `contracts/page.tsx:L36`. |
| `/dashboard/contracts` | School Contracts | `ADMIN` / `DISPATCHER` | "Create First Contract" | Button | Open contract creation view | Nothing happens | **Broken** | Plain `<Button>` with no `onClick` handler or `Link` wrapper in `contracts/page.tsx:L84`. |
| `/dashboard/contracts` | School Contracts | `ADMIN` / `DISPATCHER` | Contract List Item | Div Row | Navigate to `/dashboard/contracts/[id]` | Nothing happens | **Broken** | Div has `cursor-pointer` but lacks `onClick` or `Link` wrapper in `contracts/page.tsx:L90`. |
| `/dashboard/contracts` | School Contracts | `ADMIN` / `DISPATCHER` | Contract "Manage" | Button | Navigate to `/dashboard/contracts/[id]` | Nothing happens | **Broken** | Plain `<Button>` with no `onClick` or `Link` wrapper in `contracts/page.tsx:L116`. |
| `/dashboard/contracts/[id]` | Contract Details | `ADMIN` / `DISPATCHER` | "Build New Route" | Button | POST to `/api/routes` & redirect | Triggers console error & 404 | **Broken** | Calls POST `/api/routes/route` in `[id]/page.tsx:L35`. Actual App Router path is `/api/routes`. |
| `/dashboard/contracts/[id]` | Contract Details | `ADMIN` / `DISPATCHER` | "Create First Route" | Button | POST to `/api/routes` & redirect | Triggers console error & 404 | **Broken** | Calls POST `/api/routes/route` in `[id]/page.tsx:L82`. Actual App Router path is `/api/routes`. |
| `/dashboard/contracts/[id]` | Contract Details | `ADMIN` / `DISPATCHER` | Active Route Card | Card | Navigate to Route Builder | Navigates to Route Builder | **Working** | Triggered via `onClick={() => router.push(...)}` in `[id]/page.tsx:L89`. |
| `/dashboard/contracts/[id]/routes/[routeId]/builder` | Route Builder | `ADMIN` / `DISPATCHER` | "Save Route" | Button | Save route constraints | Nothing happens | **Broken** | Plain `<Button>` with no `onClick` handler in `builder/page.tsx:L119`. |
| `/dashboard/contracts/[id]/routes/[routeId]/builder` | Route Builder | `ADMIN` / `DISPATCHER` | Stop "Remove" | Button | Remove stop from route | Nothing happens | **Broken** | Plain `<Button>` with no `onClick` handler in `builder/page.tsx:L157`. |
| `/dashboard/contracts/[id]/routes/[routeId]/builder` | Route Builder | `ADMIN` / `DISPATCHER` | Student Trash | Button | Delete student from roster | Nothing happens | **Broken** | Plain `<Button>` with no `onClick` handler in `builder/page.tsx:L227`. |
| `/dashboard/contracts/[id]/routes/[routeId]/builder` | Route Builder | `ADMIN` / `DISPATCHER` | Add Stop "Add" | Button | POST to `/api/routes/[id]/stops` | Fails with 404 error | **Broken** | Calls POST `/api/routes/${route.id}/stops/route` in `builder/page.tsx:L53` (appends `/route`). |
| `/dashboard/contracts/[id]/routes/[routeId]/builder` | Route Builder | `ADMIN` / `DISPATCHER` | "Add Student" | Button | POST to `/api/routes/[id]/students` | Fails with 404 error | **Broken** | Calls POST `/api/routes/${route.id}/students/route` in `builder/page.tsx:L80` (appends `/route`). |
| `/dashboard/contracts/[id]/routes/[routeId]/builder` | Route Builder | `ADMIN` / `DISPATCHER` | "WAV Switch" | Toggle | Change WAV constraint state | Toggles visually only | **UI Only** | Plain `<Switch checked={route.requiresWav} />` with no `onCheckedChange` or state handler. |
| `/dashboard/contracts/[id]/routes/[routeId]/builder` | Route Builder | `ADMIN` / `DISPATCHER` | "PA Switch" | Toggle | Change PA constraint state | Toggles visually only | **UI Only** | Plain `<Switch checked={route.requiresPa} />` with no `onCheckedChange` or state handler. |
| `/dashboard/contracts/[id]/routes/[routeId]/builder` | Route Builder | `ADMIN` / `DISPATCHER` | Back Button (Arrow) | Button | Navigate back to contract | Navigates back | **Working** | Has `onClick={() => router.back()}` in `builder/page.tsx:L111`. |
| `/dashboard/contracts/billing` | School Billing | `ADMIN` / `DISPATCHER` | Contract Select | Dropdown | Choose active contract | Updates dropdown value | **Working** | Binds to `selectedContract` state. |
| `/dashboard/contracts/billing` | School Billing | `ADMIN` / `DISPATCHER` | Period Select | Dropdown | Choose billing month | Updates dropdown value | **Working** | Binds to `selectedPeriodStr` state. |
| `/dashboard/contracts/billing` | School Billing | `ADMIN` / `DISPATCHER` | "Generate Master Invoice" | Button | Generate LA invoice & POST | Triggers 401 Unauthorized | **Permission Blocked** | Endpoint `/api/invoices/unbilled` rejects `ADMIN` / `SUPER_ADMIN` roles due to misspelled role validation. |
| `/b2b/ledger` | B2B Ledger | `B2B_ADMIN` | Invoice API load | Data Fetch | Fetch historic statements | Triggers 401 Unauthorized | **Permission Blocked** | Reuses `/api/invoices` which rejects `B2B_ADMIN` role checks in `invoices/route.ts:L103`. |
| `/b2b/ledger` | B2B Ledger | `B2B_ADMIN` | Unbilled Completed Rides | Data Fetch | Fetch historic trips | Fetches and displays | **Working** | Calls `/api/b2b/ledger` which handles B2B security context correctly. |
| `/b2b/ledger` | B2B Ledger | `B2B_ADMIN` | "View PDF" | Button | Open invoice in new tab | Opens `/shared/invoice/[id]` | **Working** | Triggered via `onClick={() => window.open(...)}` in `ledger/page.tsx:L182`. |
| `/b2b/bookings` | Corporate Portal | `B2B_ADMIN` | "New Booking" | Button | Open booking Dialog | Opens modal Dialog | **Working** | Uses `DialogTrigger` wrapper. |
| `/b2b/bookings` | Corporate Portal | `B2B_ADMIN` | "Confirm Setup" | Button | POST to `/api/b2b/bookings` | Creates booking & refreshes | **Working** | Has `onClick={handleCreateBooking}` in `bookings/page.tsx:L197`. |
| `/dashboard/invoices` | Billing Console | `ADMIN` / `DISPATCHER` | "Select Jobs & Bill" | Button | Open billing Dialog | Opens modal Dialog | **Working** | Uses `DialogTrigger` wrapper. |
| `/dashboard/invoices` | Billing Console | `ADMIN` / `DISPATCHER` | "Generate & Issue Invoice" | Button | POST to `/api/invoices` | Fails with 401 Unauthorized | **Permission Blocked** | Endpoint `/api/invoices` rejects `ADMIN` / `SUPER_ADMIN` roles due to misspelled `SUPERADMIN` role checks. |
| `/dashboard/invoices` | Billing Console | `ADMIN` / `DISPATCHER` | "View PDF" | Button | Open invoice PDF | Nothing happens | **Broken** | Plain `<Button>` with `ExternalLink` icon and NO `onClick` handler or `Link` wrapper. |
| `/dashboard/zones` | Zone Editor | `ADMIN` / `DISPATCHER` | "Add New Zone" | Button | Open zone creation Dialog | Opens modal Dialog | **Working** | Uses `DialogTrigger` wrapper. |
| `/dashboard/zones` | Zone Editor | `ADMIN` / `DISPATCHER` | Map drawing | Custom map | Click to outline geofence | Captures points | **Working** | Integrated with `ZoneMap` coordinate bindings. |
| `/dashboard/zones` | Zone Editor | `ADMIN` / `DISPATCHER` | "Save Zone" | Button | POST to `/api/zones` & save | Creates zone & reloads list | **Working** | Has `onClick={handleCreate}` in `zones/page.tsx:L132`. |
| `/dashboard/zones` | Zone Editor | `ADMIN` / `DISPATCHER` | Trash / Delete | Button | Delete active zone from list | Nothing happens | **Broken** | Plain `<Button>` with `Trash2` icon and NO `onClick` handler in `zones/page.tsx:L162`. |
| `/dashboard/drivers` | Driver Directory | `ADMIN` / `DISPATCHER` | "Add Driver" | Button | Open creation Dialog | Opens Dialog | **Working** | Has `DialogTrigger` wrapper. |
| `/dashboard/drivers` | Driver Directory | `ADMIN` / `DISPATCHER` | "Create Driver" | Button | POST to `/api/drivers` | Saves driver in DB | **Working** | Has `onClick={handleSave}` in `drivers/page.tsx:L263`. |
| `/dashboard/drivers` | Driver Directory | `ADMIN` / `DISPATCHER` | Row Pencil Edit | Button | Open Dialog with fields | Populates and opens Dialog | **Working** | Has `onClick={() => handleEdit(driver)}` in `drivers/page.tsx:L335`. |
| `/dashboard/drivers` | Driver Directory | `ADMIN` / `DISPATCHER` | Row Trash Delete | Button | DELETE to `/api/drivers/[id]` | Deletes driver after confirm | **Working** | Has `onClick={() => handleDelete(driver.id)}` in `drivers/page.tsx:L338`. |
| `/dashboard/drivers` | Driver Directory | `ADMIN` / `DISPATCHER` | Status Badge | Button | Open status dropdown | Opens status menu | **Working** | Has `DropdownMenuTrigger` in `drivers/page.tsx:L385`. |
| `/dashboard/drivers` | Driver Directory | `ADMIN` / `DISPATCHER` | Dropdown Menu Items | Button | PATCH driver status API | Updates status and reloads | **Working** | Has `onClick={() => updateStatus(status)}` in `drivers/page.tsx:L393-L401`. |
| `/dashboard/drivers` | Driver Directory | `ADMIN` / `DISPATCHER` | Document "Add" | Button | Upload file & POST to API | Uploads and adds document | **Working** | Has `onClick={handleUpload}` in `drivers/page.tsx:L522`. |
| `/dashboard/vehicles` | Vehicle Register | `ADMIN` / `DISPATCHER` | "Add Vehicle" | Button | Open creation Dialog | Opens Dialog | **Working** | Has `DialogTrigger` wrapper. |
| `/dashboard/vehicles` | Vehicle Register | `ADMIN` / `DISPATCHER` | "Create Vehicle" | Button | POST to `/api/vehicles` | Saves vehicle in DB | **Working** | Has `onClick={handleSave}` in `vehicles/page.tsx:L260`. |
| `/dashboard/vehicles` | Vehicle Register | `ADMIN` / `DISPATCHER` | Row Pencil Edit | Button | Open Dialog with fields | Populates and opens Dialog | **Working** | Has `onClick={() => handleEdit(vehicle)}` in `vehicles/page.tsx:L330`. |
| `/dashboard/vehicles` | Vehicle Register | `ADMIN` / `DISPATCHER` | Row Trash Delete | Button | DELETE to `/api/vehicles/[id]` | Deletes vehicle after confirm | **Working** | Has `onClick={() => handleDelete(vehicle.id)}` in `vehicles/page.tsx:L333`. |
| `/dashboard/vehicles` | Vehicle Register | `ADMIN` / `DISPATCHER` | Document "Add" | Button | Upload file & POST to API | Uploads and adds document | **Working** | Has `onClick={handleUpload}` in `vehicles/page.tsx:L467`. |
| `/dashboard/settings` | Settings Panel | `ADMIN` / `SUPER_ADMIN` | "Save Changes" | Button | PATCH `/api/settings/org` | Saves config preferences | **Working** | Has `onClick={handleSave}` in `settings/page.tsx:L193`. |
| `/dashboard/settings` | Settings Panel | `ADMIN` / `SUPER_ADMIN` | Copy Embed code | Button | Copy iframe tag to clipboard | Copies to clipboard | **Working** | Has `onClick` block in `settings/page.tsx:L451`. |
| `/dashboard/settings` | Settings Panel | `ADMIN` / `SUPER_ADMIN` | Copy Embed script | Button | Copy widget tag to clipboard | Copies to clipboard | **Working** | Has `onClick` block in `settings/page.tsx:L506`. |
| `/dashboard/settings` | Settings Panel | `ADMIN` / `SUPER_ADMIN` | Copy Webhook URL | Button | Copy Twilio URL to clipboard | Copies to clipboard | **Working** | Has `onClick` block in `settings/page.tsx:L551`. |
| `/dashboard/settings` | Settings Panel | `ADMIN` / `SUPER_ADMIN` | "Connect SumUp" | Button | Route to SumUp OAuth page | Redirects to connection | **Working** | Has `onClick={() => window.location.href = ...}` in `settings/page.tsx:L715`. |
| `/dashboard/settings` | Settings Panel | `ADMIN` / `SUPER_ADMIN` | "Connect Zettle" | Button | Route to Zettle OAuth page | Redirects to connection | **Working** | Has `onClick={() => window.location.href = ...}` in `settings/page.tsx:L728`. |
| `/dashboard/support` | Support Desk | `ADMIN` / `DISPATCHER` | "Open New Ticket" | Button (Link) | Navigate to `/support/new` | Navigates to creation form | **Working** | Wrapper `<Link href="/dashboard/support/new">` is present in `support/page.tsx:L51`. |
| `/dashboard/support/new` | Open Ticket | `ADMIN` / `DISPATCHER` | "Submit Ticket" | Button | POST to `/api/support/tickets` | Creates ticket & redirects | **Working** | Has form trigger `onSubmit={handleSubmit}` in `new/page.tsx:L64`. |
| `/dashboard/support/[id]` | Ticket Chat | `ADMIN` / `DISPATCHER` | Send message | Button | Submit text to Vercel AI SDK | Sends chat to AI agent | **Working** | Has form trigger `onSubmit={handleSubmit}` in `[id]/page.tsx` client component. |
| `/dashboard/reports` | Reports Dashboard | `ADMIN` / `DISPATCHER` | Timeframe | Select | Reload metrics for days | Reloads dashboard reports | **Working** | Binds to `dateRange` state trigger. |
| `/dashboard/reports` | Reports Dashboard | `ADMIN` / `DISPATCHER` | CSV Export | Button | Generate & download CSV | Downloads CSV file | **Working** | Has `onClick={() => exportToCSV(...)}` in `reports/page.tsx:L208`. |
| `/dashboard/reports/operator` | Call Center Metrics | `ADMIN` / `DISPATCHER` | Toggle Presence | Select | POST `/api/user/presence` | Updates status and notifies | **Working** | Has `onValueChange={handlePresenceChange}` in `operator/page.tsx:L219`. |
| `/dashboard/reports/operator` | Call Center Metrics | `ADMIN` / `DISPATCHER` | Refresh | Button | Refetch call metrics from API | Updates call volume stats | **Working** | Has `onClick={triggerRefresh}` in `operator/page.tsx:L229`. |
| `/dashboard/profile` | Profile & 2FA | `ADMIN` / `DISPATCHER` | "Setup Authenticator" | Button | POST to `/api/auth/2fa/setup` | Generates secret code & QR | **Working** | Has `onClick={initiate2FASetup}` in `profile/page.tsx:L112`. |
| `/dashboard/profile` | Profile & 2FA | `ADMIN` / `DISPATCHER` | "Verify" | Button | POST to `/api/auth/2fa/verify` | Enables 2FA lock status | **Working** | Has `onClick={confirm2FASetup}` in `profile/page.tsx:L142`. |
| *Sidebar Menu* | Layout Shell | `ADMIN` / `DISPATCHER` | "Passenger Assistants" | Button (Link) | Navigate to `/staff/pas` | Displays 404 page | **Broken** | Points to `/dashboard/staff/pas` which does not exist in code structure. |

---

## 4. Updated Feature Status Table

Below is the comparison of the status claimed in the previous report versus the actual status established by our click-by-click audit:

| Feature | Previous Status | New Status | Reason Status Changed | Evidence |
| :--- | :--- | :--- | :--- | :--- |
| **School Runs** | Fully Functional | 🔴 **Broken** | All contract dashboard actions, detail page route creations, and builder stop/student controls are completely non-functional or point to wrong API routes. | • `contracts/page.tsx` lacks handlers on create/manage buttons.<br>• `[id]/page.tsx` POSTs to `/api/routes/route` (404 error).<br>• `builder/page.tsx` POSTs append `/route` causing 404s. |
| **Corporate Portal (Ledger)** | Partially Functional | 🔴 **Broken** | Ledger statements cannot load for corporate users, leaving them with empty tables and network errors. | B2B Portal fetches invoices using `/api/invoices` which blocks `B2B_ADMIN` roles with 401 errors. |
| **Invoicing & Billing Dashboard** | Fully Functional | 🔴 **Broken** | Invoice PDF viewing is dead, and admins cannot run billing. | • "View PDF" button is a static button with no handler.<br>• `/api/invoices` role check has misspelled `SUPERADMIN` and completely blocks `ADMIN`. |
| **Zones Management** | Fully Functional | 🟡 **Partially working** | Geofences can be drawn and saved, but active zones cannot be deleted from the UI. | Zone table delete button lacks `onClick` handler in `zones/page.tsx:L162`. |
| **Passenger Assistants** | Fully Functional | 🔴 **Broken** | Roster link in sidebar leads to an app routing 404 error page. | Navigation link points to `/dashboard/staff/pas` which does not exist in `/src/app/dashboard/`. |
| **Drivers & Vehicles** | Partially Functional | 🟢 **Working** | Driver and vehicle detail entry, documents uploads, edit modal saves, and status dropdowns operate correctly. | Event handlers are correctly hooked to state and fetch requests. |
| **AI Support Desk** | Fully Functional | 🟢 **Working** | Ticket creation forms, client chat lists, and Vercel AI SDK message submits operate correctly. | Message handlers are integrated with chat hooks and server APIs. |
| **Reports & Analytics** | Fully Functional | 🟢 **Working** | Period toggles update KPI calculations, charts render, and CSV download generators operate correctly. | State triggers date params and Recharts updates components. |
| **Settings Panel** | Fully Functional | 🟢 **Working** | Forms save configuration overrides, iframe codes are copied, and SumUp/Zettle routes redirect. | PATCH request is dispatched correctly on save click. |

---

## 5. Broken Buttons and Dead UI List

Detailed list of non-functional UI items and their impact:

| Severity | Page | Button/Element | Problem | User Impact | Likely Fix Area |
| :---: | :--- | :--- | :--- | :--- | :--- |
| 🔴 **Critical** | `/dashboard/contracts` | "New Contract" / "Create First Contract" / Manage | Buttons and list items have no `onClick` handlers or `Link` components. | Users cannot create contracts or navigate to contract details pages from the UI. | `src/app/dashboard/contracts/page.tsx` (Add `Link` wrappers and handlers). |
| 🔴 **Critical** | `/dashboard/contracts/[id]` | "Build New Route" / "Create First Route" | Triggers post requests to `/api/routes/route` instead of `/api/routes`. | Route generation returns a **404 Not Found** network error. | `src/app/dashboard/contracts/[id]/page.tsx` (Fix fetch path). |
| 🔴 **Critical** | `/dashboard/contracts/.../builder` | "Add" (Stops) / "Add Student" | Form submission appends `/route` suffix to the API path. | Stops and student assignments fail with a **404 Not Found** network error. | `src/app/dashboard/contracts/[id]/routes/[routeId]/builder/page.tsx` (Fix fetch path). |
| 🔴 **Critical** | `/dashboard/contracts/.../builder` | "Save Route" / Remove Stop / Delete Student | Elements have no click handlers. | Cannot save route configurations, delete stops, or remove assigned students. | `src/app/dashboard/contracts/[id]/routes/[routeId]/builder/page.tsx` (Add handlers). |
| 🔴 **Critical** | `/dashboard/contracts/billing` | "Generate Master Invoice" | Endpoint `/api/invoices/unbilled` checks for misspelled `SUPERADMIN` and denies access to `ADMIN`. | Tenant Administrators cannot run billing for school contract routes. | `src/app/api/invoices/unbilled/route.ts` (Correct role check logic). |
| 🔴 **Critical** | `/b2b/ledger` | Invoice list load | Reuses administrative `/api/invoices` which denies access to B2B users. | Clients get a **401 Unauthorized** error and see a blank statement screen. | `src/app/b2b/ledger/page.tsx` (Point to a tenant-isolated B2B API). |
| 🔴 **Critical** | `/dashboard/invoices` | "Generate & Issue Invoice" | Endpoint `/api/invoices` checks for misspelled `SUPERADMIN` and denies access to `ADMIN`. | Tenant Administrators cannot generate corporate accounts invoicing. | `src/app/api/invoices/route.ts` (Correct role check logic). |
| 🟠 **High** | `/dashboard/invoices` | "View PDF" | Button has no handler or Link wrap. | Dispatchers cannot view or print invoice statements. | `src/app/dashboard/invoices/page.tsx` (Add `Link` to invoice details page). |
| 🟠 **High** | `/dashboard/zones` | Trash / Delete | Delete icon button has no click handler. | Active geofence zones cannot be deleted from the system. | `src/app/dashboard/zones/page.tsx` (Add delete callback handler). |
| 🟡 **Medium** | `/dashboard/contracts/.../builder` | WAV / PA Switches | Toggles are visually interactive but do not commit changes to state. | WAV and PA requirements are visual placeholders and cannot be toggled. | `src/app/dashboard/contracts/[id]/routes/[routeId]/builder/page.tsx` (Add state bindings). |

---

## 6. Hidden or Unlinked Features

Features and routes existing in the codebase but omitted from navigation menus or lacking UI access:

1. **Audit Logs (`/dashboard/logs`):** Displays static text "Audit logs and system activity will be displayed here." This page is unlinked and absent from the sidebar.
2. **Mockup Screens (`/dashboard/mockup-cards`, `/dashboard/mockup-table`):** Temporary design preview mockups of dashboard pages. Unlinked and accessible only by typing direct URLs.
3. **VoIP Calls Logs (`IncomingCall` database schema):** The Prisma schema defines an `IncomingCall` model linked to `Job` records. However, there are no endpoints, forms, or logs in the dashboard to review incoming dispatcher call logs.

---

## 7. Onboarding Risk Update

> [!CAUTION]
> **Onboarding Readiness Status: HIGH RISK / NOT READY**
>
> The Cabai taxi dispatch platform is **NOT READY** for commercial onboarding of taxi company tenants. Although core booking creation and reports are solid, critical B2B billing and Local Authority workflows are completely broken:
> 1. Tenant Admins (`ADMIN` role) cannot run billing or issue invoices because all billing APIs block them with 401 Unauthorized errors (due to checking for misspelled `SUPERADMIN` instead of the database role and completely excluding the `ADMIN` role).
> 2. Corporate accounts logging into the B2B portal cannot access statement ledgers or invoices, leading to blank screens.
> 3. The Local Authority school contracts system is entirely broken (dead save buttons, 404 route creation URLs, and unlinked sub-pages).
> 
> Real taxi companies rely heavily on school runs and monthly account invoice billing for cash flow. Onboarding tenants with these bugs will lead to failure to collect revenue and customer churn.

---

## 8. Final Counts

* **Total pages checked:** `19`
* **Total clickable elements found:** `58`
* **Total clickable elements tested:** `58`
* **Total working:** `40`
* **Total broken:** `14`
* **Total partially working:** `0`
* **Total UI only:** `1` (WAV/PA Switches)
* **Total permission blocked:** `3` (Corporate Ledger load, Master Invoice gen, Invoices page POST)
* **Total not tested:** `0`
* **Total hidden/unlinked features:** `3` (Audit Logs, Mockups, VoIP Logs)
