'use client';

import React from 'react';
import { Shield, Eye, Download } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
    return (
        <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans selection:bg-emerald-500/30 selection:text-white">
            {/* Header */}
            <header className="border-b border-zinc-800 bg-[#09090b]/80 backdrop-blur sticky top-0 z-50">
                <div className="max-w-4xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Shield className="w-6 h-6 text-emerald-400" />
                        <span className="text-xl font-bold tracking-tight text-white">Cabai <span className="text-emerald-400">Legal</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/legal/privacy.pdf" target="_blank" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-white px-4 py-2 rounded-xl transition-all">
                            <Download className="w-3.5 h-3.5" /> PDF Version
                        </Link>
                    </div>
                </div>
            </header>

            {/* Content Container */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <article className="prose prose-invert prose-emerald max-w-none">
                    <div className="border-b border-zinc-800 pb-8 mb-10">
                        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">Privacy Policy</h1>
                        <p className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">Effective Date: May 31, 2026</p>
                    </div>

                    {/* Intro */}
                    <div className="space-y-4 text-sm leading-relaxed mb-8">
                        <p>
                            Cabai Ltd (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting the privacy and personal data of our users, subscribing taxi operators (&quot;Tenants&quot;), their drivers, and passengers who use our dispatch technology. This Privacy Policy explains how personal data is collected, processed, shared, and protected in compliance with the UK General Data Protection Regulation (UK GDPR), the EU GDPR, and the UK Data Protection Act 2018.
                        </p>
                    </div>

                    {/* SECTION 1 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            1. Data Processor vs. Data Controller Roles
                        </h2>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p>
                                <strong>1.1 Cabai as Data Processor:</strong> For passenger booking details, driver location tracking coordinates, call recordings, VoIP transcriptions, and driver compliance documents uploaded by a taxi fleet, <strong>the subscribing Taxi Operator (Tenant) is the Data Controller</strong>. Cabai Ltd processes this personal data strictly as a **Data Processor** on behalf of and according to the instructions of the Tenant.
                            </p>
                            <p>
                                <strong>1.2 Cabai as Data Controller:</strong> Cabai Ltd acts as a **Data Controller** solely for personal data collected from direct representatives of the subscribing taxi fleets (e.g. system login credentials, payment details of the fleet, support tickets, and general visitors of the cabai.co.uk website).
                            </p>
                        </div>
                    </section>

                    {/* SECTION 2 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            2. Personal Data We Process
                        </h2>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p>To facilitate fleet dispatching operations, we process the following categories of data:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Passenger Information:</strong> Name, phone number, email address, pickup and drop-off coordinates, journey travel histories, and feedback/ratings.</li>
                                <li><strong>Driver Information:</strong> Name, phone number, email, vehicle details (registration plate, model, color), real-time GPS location coordinates (tracked while online or on duty), compliance documents (driving license, private hire vehicle license, insurance policy certificates, PCO badges), and performance stats.</li>
                                <li><strong>VoIP Call & AI Data:</strong> Audio call recordings from Yay.com/VoIP endpoints, text transcriptions, and summaries generated during dispatch interactions with Voice AI, WhatsApp chatbots, or WebChat interfaces.</li>
                                <li><strong>Billing & Payments:</strong> Transaction details, fare costs, payment status (paid, pending, cash, card), stripe tokens, and terminal transaction receipts. Raw credit card numbers are never sent to or stored on Cabai servers.</li>
                            </ul>
                        </div>
                    </section>

                    {/* SECTION 3 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            3. Purposes and Lawful Bases of Processing
                        </h2>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p>We process personal data under the following lawful bases:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Performance of Contract:</strong> Processing is necessary to perform dispatch bookings, estimate fares, route drivers, and manage user accounts.</li>
                                <li><strong>Legitimate Interests:</strong> Running the platform, preventing double-bookings, verifying driver compliance limits, analyzing call center talk times, and monitoring operational wallboard statistics.</li>
                                <li><strong>Legal Obligation:</strong> Ensuring public safety by blocking non-compliant drivers (e.g. invalid license expiry limits) and retaining invoice records for tax compliance.</li>
                                <li><strong>Consent:</strong> When you voluntarily record support chat lines or enable location permissions on your mobile devices.</li>
                            </ul>
                        </div>
                    </section>

                    {/* SECTION 4 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            4. Subprocessors & Data Sharing
                        </h2>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p>We share data with trusted subprocessors strictly to provide our platform services. These subprocessors include:</p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs border-collapse border border-zinc-800">
                                    <thead>
                                        <tr className="bg-zinc-900 border-b border-zinc-800">
                                            <th className="p-3 border-r border-zinc-800 font-bold text-white">Subprocessor</th>
                                            <th className="p-3 border-r border-zinc-800 font-bold text-white">Purpose</th>
                                            <th className="p-3 font-bold text-white">Data Location</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-zinc-800">
                                        <tr>
                                            <td className="p-3 border-r border-zinc-800 font-medium">Amazon Web Services (AWS)</td>
                                            <td className="p-3 border-r border-zinc-800">Cloud Hosting & File Storage</td>
                                            <td className="p-3">UK / Europe</td>
                                        </tr>
                                        <tr className="bg-zinc-900/30">
                                            <td className="p-3 border-r border-zinc-800 font-medium">Supabase Inc.</td>
                                            <td className="p-3 border-r border-zinc-800">Real-time DB Sync & WebSockets</td>
                                            <td className="p-3">Europe (AWS)</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 border-r border-zinc-800 font-medium">Neon Database</td>
                                            <td className="p-3 border-r border-zinc-800">PostgreSQL Cloud Database</td>
                                            <td className="p-3">Europe (AWS)</td>
                                        </tr>
                                        <tr className="bg-zinc-900/30">
                                            <td className="p-3 border-r border-zinc-800 font-medium">Twilio & Resend</td>
                                            <td className="p-3 border-r border-zinc-800">SMS Notifications & Email Receipts</td>
                                            <td className="p-3">Global / US (SCCs)</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 border-r border-zinc-800 font-medium">OpenAI & Vapi AI</td>
                                            <td className="p-3 border-r border-zinc-800">Voice AI & Chatbot Processing</td>
                                            <td className="p-3">Global / US (SCCs)</td>
                                        </tr>
                                        <tr className="bg-zinc-900/30">
                                            <td className="p-3 border-r border-zinc-800 font-medium">Stripe / SumUp / Zettle</td>
                                            <td className="p-3 border-r border-zinc-800">Payment Gateway Services</td>
                                            <td className="p-3">Global / Europe</td>
                                        </tr>
                                        <tr>
                                            <td className="p-3 border-r border-zinc-800 font-medium">Mapbox & Google Maps</td>
                                            <td className="p-3 border-r border-zinc-800">Geocoding & ETA Matrix Calculations</td>
                                            <td className="p-3">Global</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </section>

                    {/* SECTION 5 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            5. Security & Data Retention
                        </h2>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p>
                                <strong>5.1 Security:</strong> All data is encrypted in transit using TLS 1.3 and at rest using AES-256. Database tenants are logically separated using Row Level Security (RLS) to prevent unauthorized cross-tenant access.
                            </p>
                            <p>
                                <strong>5.2 Retention:</strong> Passenger coordinates, booking history, and billing records are kept for the duration of the Tenant's account lifecycle, or up to 7 years to meet statutory tax auditing obligations in the UK. Call recordings and transcription records are retained for 90 days unless customized otherwise by the Tenant's compliance policies.
                            </p>
                        </div>
                    </section>

                    {/* SECTION 6 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            6. Your Rights
                        </h2>
                        <p className="text-sm leading-relaxed mb-4">
                            Under the GDPR, you have the right to access, rectify, delete, restrict, or object to the processing of your data, as well as the right to data portability.
                        </p>
                        <p className="text-sm leading-relaxed">
                            To exercise these rights, passengers and drivers should contact the respective taxi fleet operator (the Data Controller). If you have compliance concerns regarding Cabai Ltd directly, email us at <a href="mailto:help@cabai.co.uk" className="text-emerald-400 hover:underline">help@cabai.co.uk</a>.
                        </p>
                    </section>
                </article>
            </main>
        </div>
    );
}
