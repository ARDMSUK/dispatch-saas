import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Check } from 'lucide-react';

export default function CorporatePricingPage() {
    return (
        <div className="w-full bg-slate-50">
            <section className="pt-20 pb-16 border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6">Simple, Transparent Pricing</h1>
                    <p className="text-xl text-slate-600 font-medium leading-relaxed">
                        Scale your fleet without worrying about unpredictable software costs.
                    </p>
                </div>
            </section>

            <section className="py-24 px-6">
                <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
                    {/* Growth Tier */}
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col">
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Growth Plan</h2>
                            <p className="text-slate-500 font-medium">Perfect for small to medium fleets looking to modernize their dispatch operations.</p>
                        </div>
                        <div className="mb-8">
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black tracking-tight text-slate-900">£149</span>
                                <span className="text-slate-500 font-medium">/ month</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-2">+ £5 per active driver</p>
                        </div>
                        <div className="flex-1">
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-slate-700 font-medium">
                                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> Core AI Dispatch Engine
                                </li>
                                <li className="flex items-start gap-3 text-slate-700 font-medium">
                                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> Web Booker Widget
                                </li>
                                <li className="flex items-start gap-3 text-slate-700 font-medium">
                                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> Basic Driver Settlements
                                </li>
                                <li className="flex items-start gap-3 text-slate-700 font-medium">
                                    <Check className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" /> Email Support
                                </li>
                            </ul>
                        </div>
                        <Button className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold" asChild>
                            <Link href="/contact">Start 14-Day Free Trial</Link>
                        </Button>
                    </div>

                    {/* Enterprise Tier */}
                    <div className="bg-slate-900 rounded-3xl border border-slate-800 shadow-xl p-8 flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-10">
                            <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                        </div>
                        <div className="mb-8 relative z-10">
                            <div className="inline-block px-3 py-1 bg-yellow-400 text-yellow-950 text-xs font-bold uppercase tracking-wider rounded-full mb-4">Most Popular</div>
                            <h2 className="text-2xl font-bold text-white mb-2">Enterprise Plan</h2>
                            <p className="text-slate-400 font-medium">For established operators requiring high-volume automation and custom branding.</p>
                        </div>
                        <div className="mb-8 relative z-10">
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black tracking-tight text-white">Custom</span>
                            </div>
                            <p className="text-sm text-slate-400 mt-2">Volume-based pricing</p>
                        </div>
                        <div className="flex-1 relative z-10">
                            <ul className="space-y-4 mb-8">
                                <li className="flex items-start gap-3 text-slate-300 font-medium">
                                    <Check className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" /> Everything in Growth
                                </li>
                                <li className="flex items-start gap-3 text-slate-300 font-medium">
                                    <Check className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" /> White-label Passenger Apps (iOS & Android)
                                </li>
                                <li className="flex items-start gap-3 text-slate-300 font-medium">
                                    <Check className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" /> WhatsApp AI Booking Agent
                                </li>
                                <li className="flex items-start gap-3 text-slate-300 font-medium">
                                    <Check className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" /> Advanced B2B Account Billing
                                </li>
                                <li className="flex items-start gap-3 text-slate-300 font-medium">
                                    <Check className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" /> 24/7 Priority Phone Support & SLA
                                </li>
                            </ul>
                        </div>
                        <Button className="w-full h-12 rounded-xl bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold relative z-10" asChild>
                            <Link href="/contact">Contact Sales</Link>
                        </Button>
                    </div>
                </div>
            </section>
        </div>
    );
}
