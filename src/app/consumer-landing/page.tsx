import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Smartphone, MapPin, Clock, ShieldCheck, Star, ArrowRight } from 'lucide-react';

export default function ConsumerLandingPage() {
    return (
        <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-yellow-100">
            {/* Navigation */}
            <nav className="fixed top-0 w-full bg-white/90 backdrop-blur-md border-b border-slate-100 z-50">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center font-black text-black text-xl shadow-sm">C</div>
                        <span className="text-2xl font-black tracking-tight text-slate-900">CABAI</span>
                    </div>
                    <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
                        <a href="#how-it-works" className="hover:text-yellow-600 transition-colors">How it Works</a>
                        <a href="#safety" className="hover:text-yellow-600 transition-colors">Safety</a>
                        <a href="#about" className="hover:text-yellow-600 transition-colors">About Us</a>
                        <a href="#contact" className="hover:text-yellow-600 transition-colors">Contact</a>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="pt-32 pb-20 px-6 overflow-hidden">
                <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8 relative z-10">
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight text-slate-900 leading-[1.05]">
                            Book a Ride <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-yellow-600">
                                Instantly.
                            </span>
                        </h1>
                        <p className="text-xl text-slate-600 max-w-lg leading-relaxed font-medium">
                            The smartest, safest, and most reliable way to book a taxi. Download the CABAI app to get upfront pricing and real-time tracking today.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Button size="lg" className="h-14 bg-black hover:bg-zinc-800 text-white rounded-xl px-8 flex items-center justify-center gap-3 w-full sm:w-auto">
                                <span className="text-2xl">🍎</span>
                                <div className="text-left flex flex-col justify-center">
                                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70 leading-none mb-0.5">Download on the</span>
                                    <span className="font-bold text-base leading-none">App Store</span>
                                </div>
                            </Button>
                            <Button size="lg" className="h-14 bg-black hover:bg-zinc-800 text-white rounded-xl px-8 flex items-center justify-center gap-3 w-full sm:w-auto">
                                <span className="text-2xl">🤖</span>
                                <div className="text-left flex flex-col justify-center">
                                    <span className="text-[10px] uppercase tracking-wider font-semibold opacity-70 leading-none mb-0.5">GET IT ON</span>
                                    <span className="font-bold text-base leading-none">Google Play</span>
                                </div>
                            </Button>
                        </div>
                        <p className="text-xs font-semibold text-slate-400 tracking-wide uppercase">Apps currently under review by Apple and Google.</p>
                    </div>
                    
                    <div className="relative flex justify-center lg:justify-end z-0">
                        {/* Abstract Background Shapes */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-gradient-to-tr from-yellow-200 to-orange-100 rounded-full blur-3xl opacity-50 -z-10"></div>
                        <div className="absolute top-0 right-10 w-64 h-64 bg-yellow-400 rounded-full blur-3xl opacity-20 -z-10"></div>
                        
                        {/* Mockup Phone Frame */}
                        <div className="relative w-72 h-[600px] bg-black rounded-[3rem] border-[8px] border-slate-900 shadow-2xl flex items-center justify-center overflow-hidden">
                            {/* Dynamic Island Notch */}
                            <div className="absolute top-0 w-full flex justify-center z-20">
                                <div className="w-32 h-7 bg-slate-900 rounded-b-3xl"></div>
                            </div>
                            {/* Placeholder App Screen */}
                            <div className="w-full h-full bg-slate-50 flex flex-col relative">
                                <div className="h-2/3 bg-slate-200 w-full relative">
                                    <div className="absolute inset-0 bg-[url('https://maps.gstatic.com/mapfiles/api-3/images/google_gray.svg')] bg-center bg-cover opacity-10"></div>
                                    {/* Fake Route */}
                                    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                        <path d="M 20 80 Q 40 40 80 20" fill="none" stroke="#eab308" strokeWidth="3" strokeLinecap="round" />
                                        <circle cx="20" cy="80" r="4" fill="#3b82f6" />
                                        <circle cx="80" cy="20" r="4" fill="#10b981" />
                                    </svg>
                                </div>
                                <div className="h-1/3 bg-white w-full rounded-t-3xl -mt-6 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative z-10 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-bold text-lg text-slate-900">Your Ride is Arriving</h3>
                                        <p className="text-sm text-slate-500">Black Mercedes E-Class • LA21 ABC</p>
                                    </div>
                                    <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                                        <div className="h-10 w-10 bg-slate-200 rounded-full flex items-center justify-center">👤</div>
                                        <div className="flex-1">
                                            <p className="font-bold text-sm text-slate-900">John D.</p>
                                            <div className="flex text-yellow-500 text-[10px]">★ 4.9</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section id="how-it-works" className="py-24 bg-slate-50 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-4">How CABAI Works</h2>
                        <p className="text-lg text-slate-600 font-medium">Three simple steps to your destination.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-12 text-center">
                        <div className="flex flex-col items-center">
                            <div className="h-20 w-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                                <Smartphone className="h-8 w-8 text-yellow-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">1. Book in Seconds</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                Enter your destination and get an upfront price immediately. Choose your vehicle type and confirm.
                            </p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="h-20 w-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                                <MapPin className="h-8 w-8 text-yellow-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">2. Track Real-Time</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                Watch your driver approach on the live map. We'll notify you the moment they arrive.
                            </p>
                        </div>
                        <div className="flex flex-col items-center">
                            <div className="h-20 w-20 bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-center mb-6">
                                <Clock className="h-8 w-8 text-yellow-600" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">3. Arrive Relaxed</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                Pay seamlessly via card, cash, or Apple Pay. Rate your driver and enjoy the rest of your day.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Safety & Quality */}
            <section id="safety" className="py-24 bg-white px-6">
                <div className="max-w-7xl mx-auto flex flex-col-reverse lg:grid lg:grid-cols-2 gap-16 items-center">
                    <div className="grid grid-cols-2 gap-4 w-full">
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                            <ShieldCheck className="h-8 w-8 text-emerald-500 mb-4" />
                            <h4 className="font-bold text-slate-900 mb-2">Vetted Drivers</h4>
                            <p className="text-sm text-slate-600 font-medium">Every driver on our platform passes rigorous background checks and local authority licensing.</p>
                        </div>
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 mt-8">
                            <Star className="h-8 w-8 text-yellow-500 mb-4" />
                            <h4 className="font-bold text-slate-900 mb-2">Quality Standards</h4>
                            <p className="text-sm text-slate-600 font-medium">Vehicles are inspected regularly to ensure your ride is always clean, comfortable, and safe.</p>
                        </div>
                    </div>
                    <div>
                        <h2 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 mb-6">Your Safety is Our Top Priority.</h2>
                        <p className="text-lg text-slate-600 mb-8 leading-relaxed font-medium">
                            At CABAI, we don't compromise on safety. From sharing your trip status with loved ones to 24/7 dedicated support, we've built our platform to give you peace of mind.
                        </p>
                        <Button className="bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-full px-6 font-bold shadow-none border border-slate-200">
                            Read our Safety Guidelines
                        </Button>
                    </div>
                </div>
            </section>

            {/* Footer / Contact / About */}
            <footer id="contact" className="bg-slate-900 pt-20 pb-10 px-6 text-slate-300 font-medium">
                <div className="max-w-7xl mx-auto grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
                    <div className="lg:col-span-2">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center font-black text-black text-xl shadow-sm">C</div>
                            <span className="text-2xl font-black tracking-tight text-white">CABAI</span>
                        </div>
                        <p className="text-slate-400 max-w-sm mb-6 leading-relaxed">
                            Providing seamless, reliable, and safe transportation services through cutting-edge technology.
                        </p>
                    </div>
                    
                    <div id="about">
                        <h4 className="text-white font-bold mb-6 uppercase tracking-wide text-sm">Contact Us</h4>
                        <ul className="space-y-4 text-sm text-slate-400">
                            <li><span className="text-slate-500 block text-xs uppercase tracking-wider mb-1">Customer Support Email</span> <a href="mailto:hello@cabai.co.uk" className="hover:text-yellow-400 transition-colors">hello@cabai.co.uk</a></li>
                            <li><span className="text-slate-500 block text-xs uppercase tracking-wider mb-1">Phone Number (UK)</span> <a href="tel:02034321381" className="hover:text-yellow-400 transition-colors">0203 432 1381</a></li>
                            <li><span className="text-slate-500 block text-xs uppercase tracking-wider mb-1">Support Hours</span> Monday-Friday, 9:00 AM - 6:00 PM (GMT)</li>
                        </ul>
                    </div>

                    <div>
                        <h4 className="text-white font-bold mb-6 uppercase tracking-wide text-sm">Corporate Office</h4>
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
