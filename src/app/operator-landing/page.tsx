import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Shield, Zap, MessageSquare, BarChart } from 'lucide-react';

export default function OperatorLandingPage() {
    return (
        <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100">
            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white shadow-sm">C</div>
                        <span className="text-xl font-bold tracking-tight text-slate-900">CABAI</span>
                        <span className="text-sm font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded ml-2">For Operators</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
                        <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
                        <a href="#about" className="hover:text-blue-600 transition-colors">About Us</a>
                        <a href="#contact" className="hover:text-blue-600 transition-colors">Contact Support</a>
                    </div>
                    <div className="flex items-center gap-4">
                        <Link href="/login">
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 shadow-sm">
                                Dispatch Console Login
                            </Button>
                        </Link>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-sm font-medium">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            v2.0 Dispatch Engine Now Live
                        </div>
                        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                            The Smartest AI Dispatch System for <span className="text-blue-600">Modern Fleets</span>.
                        </h1>
                        <p className="text-xl text-slate-600 max-w-lg leading-relaxed">
                            Automate bookings, optimize driver routing, and increase your fleet's revenue with CABAI's enterprise-grade dispatch and telematics platform.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Link href="/login">
                                <Button size="lg" className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-full px-8 h-12 text-base">
                                    Access Dispatch Console <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        </div>
                    </div>
                    <div className="relative">
                        <div className="absolute -inset-4 bg-gradient-to-r from-blue-100 to-indigo-50 rounded-3xl blur-2xl opacity-50 -z-10"></div>
                        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl p-2">
                            <img src="/placeholder-dashboard.jpg" alt="CABAI Dispatch Dashboard" className="rounded-xl w-full h-auto bg-slate-100" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-slate-50 px-6 border-t border-slate-200">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-4">Enterprise Features Built for Scale</h2>
                        <p className="text-lg text-slate-600">Everything you need to run a high-volume taxi or private hire business efficiently.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center mb-6">
                                <Zap className="h-6 w-6 text-blue-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">AI Auto-Dispatch</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Our algorithm assigns jobs based on closest GPS proximity and queue times, minimizing dead mileage and maximizing driver earnings.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="h-12 w-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-6">
                                <MessageSquare className="h-6 w-6 text-emerald-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">WhatsApp AI Agent</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Allow customers to book instantly via WhatsApp. Our AI understands addresses, quotes prices, and creates jobs automatically.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
                            <div className="h-12 w-12 bg-purple-50 rounded-xl flex items-center justify-center mb-6">
                                <BarChart className="h-6 w-6 text-purple-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Dynamic Surge Pricing</h3>
                            <p className="text-slate-600 leading-relaxed">
                                Automatically increase fares during peak hours, bad weather, or high demand events to keep drivers on the road.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* About & Trust Section */}
            <section id="about" className="py-24 bg-white px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900 mb-6">Trusted by UK Fleets</h2>
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed">
                                CABAI Ltd is a London-based technology company dedicated to modernizing the private hire and taxi industry. We provide mission-critical software that securely handles thousands of bookings, payments, and live tracking events daily.
                            </p>
                            <ul className="space-y-4">
                                <li className="flex items-center gap-3 text-slate-700 font-medium">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Fully GDPR Compliant Data Storage
                                </li>
                                <li className="flex items-center gap-3 text-slate-700 font-medium">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> 99.99% Guaranteed Uptime SLA
                                </li>
                                <li className="flex items-center gap-3 text-slate-700 font-medium">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Secure Stripe Payment Processing
                                </li>
                                <li className="flex items-center gap-3 text-slate-700 font-medium">
                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" /> UK-Based Technical Support
                                </li>
                            </ul>
                        </div>
                        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-200">
                            <div className="flex items-center gap-4 mb-6">
                                <Shield className="h-10 w-10 text-blue-600" />
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900">Enterprise Security</h3>
                                    <p className="text-sm text-slate-500">Your fleet's data is protected.</p>
                                </div>
                            </div>
                            <p className="text-slate-600 mb-6 text-sm">
                                CABAI uses industry-standard encryption to protect passenger details, driver documents, and financial data. We are continuously monitored and audited to ensure compliance with local regulations.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer / Contact */}
            <footer id="contact" className="bg-slate-900 pt-20 pb-10 px-6 border-t border-slate-800">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="h-8 w-8 bg-blue-500 rounded flex items-center justify-center font-bold text-white">C</div>
                            <span className="text-xl font-bold tracking-tight text-white">CABAI Ltd</span>
                        </div>
                        <p className="text-slate-400 max-w-sm mb-6 leading-relaxed">
                            The comprehensive dispatch and management platform for forward-thinking transport businesses.
                        </p>
                    </div>
                    
                    <div>
                        <h4 className="text-white font-semibold mb-6">Contact & Support</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><span className="text-slate-500 block text-xs uppercase tracking-wider mb-1">Email Support</span> <a href="mailto:hello@cabai.co.uk" className="hover:text-blue-400 transition-colors">hello@cabai.co.uk</a></li>
                            <li><span className="text-slate-500 block text-xs uppercase tracking-wider mb-1">Phone (UK)</span> <a href="tel:02034321381" className="hover:text-blue-400 transition-colors">0203 432 1381</a></li>
                            <li><span className="text-slate-500 block text-xs uppercase tracking-wider mb-1">Support Hours</span> Monday-Friday, 9:00 AM - 6:00 PM (GMT)</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-semibold mb-6">Corporate Office</h4>
                        <address className="not-italic text-sm text-slate-400 space-y-1">
                            CABAI Ltd<br />
                            71-75 Shelton Street<br />
                            Covent Garden<br />
                            London, WC2H 9JQ<br />
                            United Kingdom
                        </address>
                    </div>
                </div>
                
                <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-slate-500">
                    <p>&copy; {new Date().getFullYear()} CABAI Ltd. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms of Service</Link>
                    </div>
                </div>
            </footer>
        </main>
    );
}
