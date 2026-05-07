import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Car } from 'lucide-react';

export default function CorporateLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-yellow-200 flex flex-col">
            {/* Global Corporate Navbar */}
            <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-slate-200 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/corporate" className="flex items-center gap-3">
                            <div className="h-10 w-10 bg-yellow-400 rounded-xl flex items-center justify-center font-black text-slate-900 text-xl shadow-sm">
                                <Car className="h-6 w-6" />
                            </div>
                            <span className="text-2xl font-black tracking-tight text-slate-900">CABAI</span>
                        </Link>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
                        <Link href="/corporate/about" className="hover:text-yellow-600 transition-colors">About Us</Link>
                        <Link href="/corporate/features" className="hover:text-yellow-600 transition-colors">Platform Features</Link>
                        <Link href="/corporate/pricing" className="hover:text-yellow-600 transition-colors">Pricing</Link>
                        <Link href="/corporate/contact" className="hover:text-yellow-600 transition-colors">Contact</Link>
                    </div>

                    <div className="flex items-center gap-4">
                        <Button variant="ghost" className="hidden sm:inline-flex text-slate-600 font-medium hover:bg-slate-100" asChild>
                            <a href="https://app.cabai.co.uk">Operator Login</a>
                        </Button>
                        <Button className="bg-slate-900 hover:bg-slate-800 text-white rounded-full px-6 shadow-sm font-semibold" asChild>
                            <Link href="/corporate/contact">Book Demo</Link>
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-grow pt-20">
                {children}
            </main>

            {/* Global Corporate Footer */}
            <footer className="bg-slate-950 pt-20 pb-10 px-6 text-slate-300">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 bg-yellow-400 rounded-xl flex items-center justify-center font-black text-slate-900 shadow-sm">
                                <Car className="h-6 w-6" />
                            </div>
                            <span className="text-2xl font-black tracking-tight text-white">CABAI Ltd</span>
                        </div>
                        <p className="text-slate-400 max-w-sm mb-6 leading-relaxed font-medium">
                            CABAI is the UK's leading cloud-based dispatch and telematics platform, powering forward-thinking taxi, private hire, and chauffeur fleets.
                        </p>
                    </div>
                    
                    <div>
                        <h4 className="text-white font-bold mb-6 uppercase tracking-wide text-sm">Platform</h4>
                        <ul className="space-y-4 text-sm font-medium text-slate-400">
                            <li><Link href="/corporate/features" className="hover:text-yellow-400 transition-colors">AI Dispatch Engine</Link></li>
                            <li><Link href="/corporate/features" className="hover:text-yellow-400 transition-colors">WhatsApp AI Booker</Link></li>
                            <li><Link href="/corporate/features" className="hover:text-yellow-400 transition-colors">Driver Settlements</Link></li>
                            <li><Link href="/corporate/pricing" className="hover:text-yellow-400 transition-colors">Pricing Plans</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6 uppercase tracking-wide text-sm">Company</h4>
                        <ul className="space-y-4 text-sm font-medium text-slate-400">
                            <li><Link href="/corporate/about" className="hover:text-yellow-400 transition-colors">About CABAI</Link></li>
                            <li><Link href="/corporate/contact" className="hover:text-yellow-400 transition-colors">Contact Sales</Link></li>
                            <li><a href="https://app.cabai.co.uk" className="hover:text-yellow-400 transition-colors">Operator Login</a></li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6 uppercase tracking-wide text-sm">Contact Details</h4>
                        <address className="not-italic text-sm text-slate-400 space-y-2 font-medium">
                            <p className="text-white">CABAI Ltd</p>
                            <p>71-75 Shelton Street<br />Covent Garden<br />London, WC2H 9JQ<br />United Kingdom</p>
                            <p className="pt-2"><a href="tel:02034321381" className="hover:text-yellow-400">0203 432 1381</a></p>
                            <p><a href="mailto:hello@cabai.co.uk" className="hover:text-yellow-400">hello@cabai.co.uk</a></p>
                        </address>
                    </div>
                </div>
                
                <div className="max-w-7xl mx-auto pt-8 border-t border-slate-800/50 flex flex-col md:flex-row justify-between items-center gap-4 text-sm font-medium text-slate-500">
                    <p>&copy; {new Date().getFullYear()} CABAI Ltd. All rights reserved.</p>
                    <div className="flex gap-6">
                        <Link href="/privacy" className="hover:text-slate-300 transition-colors">Privacy Policy</Link>
                        <Link href="/terms" className="hover:text-slate-300 transition-colors">Terms & Conditions</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
