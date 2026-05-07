import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, BarChart3, Globe2, ShieldCheck, Zap } from 'lucide-react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function CorporateHomePage() {
    const host = (await headers()).get('host') || '';
    if (host.startsWith('app.')) {
        redirect('/login');
    }

    return (
        <div className="w-full">
            {/* Hero Section */}
            <section className="relative pt-32 pb-24 overflow-hidden bg-slate-900 text-white">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3">
                    <div className="w-[800px] h-[800px] bg-yellow-500/20 rounded-full blur-[120px]"></div>
                </div>
                
                <div className="max-w-7xl mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
                    <div className="space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-semibold tracking-wide">
                            The Next Generation of Cloud Dispatch
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05]">
                            Accelerate Your <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">
                                Fleet Growth.
                            </span>
                        </h1>
                        <p className="text-xl text-slate-300 max-w-xl font-medium leading-relaxed">
                            CABAI is the ultimate B2B SaaS platform for taxi and private hire operators. Automate dispatch, lower operational costs, and scale your business effortlessly.
                        </p>
                        
                        <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <Button size="lg" className="h-14 bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-full px-8 text-lg font-bold" asChild>
                                <Link href="/contact">Request a Demo <ArrowRight className="ml-2 h-5 w-5" /></Link>
                            </Button>
                            <Button size="lg" variant="outline" className="h-14 bg-white/5 border-white/10 hover:bg-white/10 text-white rounded-full px-8 text-lg font-bold" asChild>
                                <Link href="/features">Explore Platform</Link>
                            </Button>
                        </div>
                    </div>
                    
                    <div className="relative hidden lg:block">
                        <div className="absolute inset-0 bg-gradient-to-tr from-yellow-400/20 to-transparent blur-3xl -z-10 rounded-full"></div>
                        <img src="/dashboard.png" alt="CABAI Dispatch Software Interface" className="rounded-2xl border border-white/10 shadow-2xl bg-slate-800 aspect-video object-cover" />
                    </div>
                </div>
            </section>

            {/* Trusted By / Stats */}
            <section className="py-12 bg-slate-950 border-y border-slate-800">
                <div className="max-w-7xl mx-auto px-6">
                    <p className="text-center text-sm font-bold uppercase tracking-widest text-slate-500 mb-8">Powering modern fleets across the UK</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center divide-x divide-slate-800">
                        <div>
                            <div className="text-3xl md:text-4xl font-black text-white mb-2">&lt; 1s</div>
                            <div className="text-slate-400 font-medium">Dispatch Speed</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-4xl font-black text-white mb-2">99.99%</div>
                            <div className="text-slate-400 font-medium">Uptime Guarantee</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-4xl font-black text-white mb-2">100%</div>
                            <div className="text-slate-400 font-medium">Cloud Native</div>
                        </div>
                        <div>
                            <div className="text-3xl md:text-4xl font-black text-white mb-2">24/7</div>
                            <div className="text-slate-400 font-medium">Technical Support</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core USPs */}
            <section className="py-24 px-6 bg-slate-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-4xl font-black tracking-tight text-slate-900 mb-4">Why Industry Leaders Choose CABAI</h2>
                        <p className="text-xl text-slate-600 font-medium">We built CABAI from the ground up to solve the real-world problems faced by operators today.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="h-14 w-14 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                                <Zap className="h-7 w-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">True Auto-Dispatch</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                Our AI algorithms assign jobs to drivers faster and more accurately than human operators, reducing dead mileage by up to 30%.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="h-14 w-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                                <Globe2 className="h-7 w-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">Cloud Native</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                No servers to maintain. Access your dispatch console from any browser, anywhere in the world, securely and instantaneously.
                            </p>
                        </div>
                        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="h-14 w-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                                <BarChart3 className="h-7 w-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">Driver Settlements</h3>
                            <p className="text-slate-600 leading-relaxed font-medium">
                                Fully automated financial reporting. Calculate commission splits, card fees, and driver balances with a single click.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-24 px-6 bg-yellow-400">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-6 tracking-tight">Ready to modernize your fleet?</h2>
                    <p className="text-xl text-slate-800 mb-10 font-semibold">Join the growing network of operators using CABAI to dominate their local markets.</p>
                    <Button size="lg" className="h-14 bg-slate-900 hover:bg-slate-800 text-white rounded-full px-10 text-lg font-bold shadow-xl" asChild>
                        <Link href="/contact">Contact Sales Team</Link>
                    </Button>
                </div>
            </section>
        </div>
    );
}
