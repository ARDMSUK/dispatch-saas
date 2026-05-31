'use client';

import React from 'react';
import { Shield, Lock, Download } from 'lucide-react';
import Link from 'next/link';

export default function GDPRPage() {
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
                        <Link href="/legal/gdpr.pdf" target="_blank" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider bg-zinc-900 border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800 text-white px-4 py-2 rounded-xl transition-all">
                            <Download className="w-3.5 h-3.5" /> PDF Version
                        </Link>
                    </div>
                </div>
            </header>

            {/* Content Container */}
            <main className="max-w-4xl mx-auto px-6 py-12">
                <article className="prose prose-invert prose-emerald max-w-none">
                    <div className="border-b border-zinc-800 pb-8 mb-10">
                        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-3">GDPR & Data Protection Commitment</h1>
                        <p className="text-zinc-500 text-sm font-semibold uppercase tracking-wider">Effective Date: May 31, 2026</p>
                    </div>

                    <div className="space-y-4 text-sm leading-relaxed mb-8">
                        <p>
                            At Cabai Ltd, we are fully committed to ensuring that our SaaS dispatch platform operates in strict compliance with the UK General Data Protection Regulation (UK GDPR), the European Union General Data Protection Regulation (EU GDPR), and the UK Data Protection Act 2018. This document outlines our data protection commitments, technical safety frameworks, and the Data Processing Addendum (DPA) structure incorporated into our service relationships.
                        </p>
                    </div>

                    {/* SECTION 1 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            1. Technical and Organizational Measures (TOMs)
                        </h2>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p>We implement robust technical and organizational security measures to protect client data, including:</p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Isolation of Tenant Data:</strong> Our multi-tenant architecture implements PostgreSQL Row-Level Security (RLS) policies. Each query is automatically scoped with the logged-in session's `tenantId`, guaranteeing that no tenant can view, access, or modify another fleet's passenger, driver, or billing records.</li>
                                <li><strong>Encryption Frameworks:</strong> All personal data is encrypted in transit using TLS 1.3/HTTPS, and all database tables, columns, backups, and file logs are encrypted at rest using AES-256 standards.</li>
                                <li><strong>Access Control & Multi-Factor Auth (MFA):</strong> Administrative access to database servers and production logs is restricted to authorized personnel using role-based access controls (RBAC) and mandatory MFA verification.</li>
                                <li><strong>Server Infrastructure:</strong> Our databases and hosting servers are deployed within secure, ISO 27001-certified cloud data centers located in the United Kingdom and the European Union.</li>
                            </ul>
                        </div>
                    </section>

                    {/* SECTION 2 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            2. Data Processing Addendum (DPA) Overview
                        </h2>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p>
                                Every subscription agreement with our Tenants incorporates a standard Data Processing Addendum (DPA) under Article 28 of the GDPR. Key commitments include:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li><strong>Processor Obligations:</strong> We process personal data solely to provide, support, and optimize the SaaS platform in accordance with the Tenant's documented configurations. We will not use passenger or driver data for marketing or profiling purposes.</li>
                                <li><strong>Subprocessor Engagement:</strong> We only engage third-party subprocessors who provide sufficient technical and organizational security measures. We maintain an up-to-date internal directory of subprocessors and notify Tenants of material changes.</li>
                                <li><strong>International Transfers:</strong> Where data is processed outside the UK/EEA (such as for telephony or automated voice processing engines), we enforce the UK International Data Transfer Addendum or EU Standard Contractual Clauses (SCCs) to ensure equivalent protection levels.</li>
                            </ul>
                        </div>
                    </section>

                    {/* SECTION 3 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            3. Incident Response and Breach Notifications
                        </h2>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p>
                                In the unlikely event of a security incident leading to the accidental or unlawful destruction, loss, alteration, unauthorized disclosure of, or access to personal data, Cabai Ltd will:
                            </p>
                            <ul className="list-disc pl-6 space-y-2">
                                <li>Investigate the root cause, scope, and impact of the incident immediately.</li>
                                <li>Notify affected taxi operators (Tenants) without undue delay, and in any event within **72 hours** of becoming aware of the breach, to allow them to comply with their reporting obligations under Article 33 of the GDPR.</li>
                                <li>Provide detailed reports outlining the categories of data breached, number of data subjects affected, and immediate mitigation actions taken.</li>
                            </ul>
                        </div>
                    </section>

                    {/* SECTION 4 */}
                    <section className="mb-10">
                        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2.5">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-full"></span>
                            4. DPO and Compliance Contact
                        </h2>
                        <div className="space-y-4 text-sm leading-relaxed">
                            <p>
                                We have appointed a Data Protection Officer (DPO) to oversee compliance with data protection laws. For inquiries regarding our GDPR compliance, Standard Contractual Clauses, or technical safety measures, please contact us:
                            </p>
                            <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-5 text-zinc-400 space-y-1.5">
                                <p className="text-white font-bold mb-1">Data Protection Officer:</p>
                                <p>Company: Cabai Ltd</p>
                                <p>Address: 71-75 Shelton Street, Covent Garden, London, WC2H 9JQ, United Kingdom</p>
                                <p>DPO Contact Email: <a href="mailto:help@cabai.co.uk" className="text-emerald-400 hover:underline">help@cabai.co.uk</a></p>
                            </div>
                        </div>
                    </section>
                </article>
            </main>
        </div>
    );
}
