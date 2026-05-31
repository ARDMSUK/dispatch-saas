'use client';

import React from 'react';
import { Shield, FileText, Download, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function TermsOfServicePage() {
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
                        <Link href="/legal/terms.pdf" target="_blank" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-white px-4 py-2 rounded-xl transition-all">
                            <Download className="w-3.5 h-3.5" /> PDF Version
                        </Link>
                    </div>
                </div>
            </header>

            {/* Content Container */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <article className="prose prose-invert prose-emerald max-w-none">
                    <div className="border-b border-zinc-800 pb-8 mb-10">
                        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">Terms of Service</h1>
                        <p className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">Effective Date: May 31, 2026</p>
                    </div>

                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 mb-10 text-emerald-300 text-sm leading-relaxed">
                        <strong className="text-white block mb-1">Important Notice:</strong>
                        Cabai Ltd is a technology service provider and software-as-a-service (SaaS) provider. Cabai Ltd is NOT a private hire vehicle (PHV) operator, transport provider, or common carrier. All transportation services are contractually arranged and delivered solely by the subscribing licensed taxi operator (the &quot;Tenant&quot;).
                    </div>

                    {/* SECTION 1 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            1. Terms for Subscribing Taxi Operators (SaaS Agreement)
                        </h2>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p>
                                <strong>1.1 License Grant:</strong> Subject to compliance with these Terms, Cabai Ltd grants subscribing taxi fleets (each a &quot;Tenant&quot;) a limited, non-exclusive, non-transferable, revocable license to access and use the Cabai SaaS platform, including the dispatcher console, active dispatch algorithms, driver applications, customer booking widgets, and B2B portals.
                            </p>
                            <p>
                                <strong>1.2 Platform Operations & Surcharges:</strong> Tenants configure their own pricing structures, tariffs, fixed route costs, zones, out-of-hours surcharges, and vehicle groupings. Cabai provides automated calculation utilities based on Mapbox Matrix API distance/time routing or zone intersections. Cabai does not guarantee pricing accuracy and is not responsible for fare discrepancies.
                            </p>
                            <p>
                                <strong>1.3 Driver & Vehicle Compliance:</strong> The SaaS platform provides automated compliance checkgates (blocking drivers with expired driving licenses, vehicle insurance, or PHV badges from going online). <strong>The Tenant remains solely and strictly responsible</strong> for verifying that all drivers hold valid private hire licenses, undergo background checks, and maintain continuous commercial passenger insurance. Cabai Ltd disclaims all liability for unauthorized, unlicensed, or uninsured driver dispatching.
                            </p>
                            <p>
                                <strong>1.4 AI Add-On Modules:</strong> Tenants utilizing AI features (Web Chat AI, WhatsApp chatbot, Voice AI VoIP phone booking channels) acknowledge that natural language processing is statistical and can occasionally produce incorrect booking configurations or estimated quotes. Human dispatchers should review AI-created bookings, and Cabai Ltd is not liable for system misinterpretations or billing errors resulting from automated AI dialogues.
                            </p>
                        </div>
                    </section>

                    {/* SECTION 2 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            2. Terms for End-Users & Passengers (Booker Agreement)
                        </h2>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p>
                                <strong>2.1 Carriage Contract:</strong> When booking a ride through a Cabai web widget, booking console, or passenger mobile app, you are entering into a direct contract for private hire transportation services with the independent taxi operator matching the tenant subdomain (the &quot;Operator&quot;). Cabai Ltd is not a party to this contract.
                            </p>
                            <p>
                                <strong>2.2 Instant Quotes:</strong> All quotes provided by the booking widget are estimates based on distance, duration, and time of booking. Final fares may vary due to actual route taken, waiting times, traffic conditions, or tolls.
                            </p>
                            <p>
                                <strong>2.3 Payments & Card Pre-authorization:</strong> Payments can be made via Cash in the vehicle or securely via Card. Card transactions are processed securely using Stripe, SumUp, or Zettle. Cabai Ltd does not store raw credit card details. When card pre-authorization is used, funds are captured only upon successful ride completion.
                            </p>
                            <p>
                                <strong>2.4 Cancellation Policy:</strong> Cancellation rules are determined by the independent taxi operator. Any refund requests, fare disputes, or lost property claims must be directed to the respective taxi operator, whose details are listed on your receipt.
                            </p>
                        </div>
                    </section>

                    {/* SECTION 3 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            3. Intellectual Property
                        </h2>
                        <p className="text-sm leading-relaxed">
                            All intellectual property rights in the SaaS platforms, source code, database structures, UI/UX designs, trademarks, brand logos, AI model integrations, and custom algorithms belong exclusively to Cabai Ltd. You may not copy, reverse engineer, decompile, or modify any portion of the platform.
                        </p>
                    </section>

                    {/* SECTION 4 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            4. Limitation of Liability
                        </h2>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p>
                                To the maximum extent permitted by law, Cabai Ltd shall not be liable for any direct, indirect, incidental, special, consequential, or punitive damages, including loss of profits, data, goodwill, or service interruptions.
                            </p>
                            <p>
                                Cabai Ltd is not liable for system outages, mapping API connectivity issues, cellular network drops in driver apps, Supabase real-time sync delays, Twilio/Yay.com VoIP failure, or SMS delivery delays.
                            </p>
                        </div>
                    </section>

                    {/* SECTION 5 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            5. Governing Law & Contact Info
                        </h2>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p>
                                These Terms are governed by and construed in accordance with the laws of England and Wales. Any disputes arising under these terms shall be subject to the exclusive jurisdiction of the English courts.
                            </p>
                            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 text-zinc-400 space-y-1.5">
                                <p className="text-white font-bold mb-1">Company Contact Information:</p>
                                <p>Company Name: Cabai Ltd</p>
                                <p>Registered Address: 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom</p>
                                <p>Support Email: <a href="mailto:help@cabai.co.uk" className="text-emerald-400 hover:underline">help@cabai.co.uk</a></p>
                            </div>
                        </div>
                    </section>
                </article>
            </main>
        </div>
    );
}
