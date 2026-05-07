import { CheckCircle2 } from 'lucide-react';

export default function CorporateFeaturesPage() {
    return (
        <div className="w-full bg-white">
            <section className="pt-20 pb-16 bg-slate-50 border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h1 className="text-4xl md:text-6xl font-black tracking-tight text-slate-900 mb-6">Platform Features</h1>
                    <p className="text-xl text-slate-600 font-medium leading-relaxed">
                        A comprehensive suite of tools designed to automate dispatching, empower drivers, and delight passengers.
                    </p>
                </div>
            </section>

            <section className="py-20 px-6">
                <div className="max-w-6xl mx-auto space-y-24">
                    {/* Feature 1 */}
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1 flex items-center justify-center p-4">
                            <img src="/features/dispatch_map.png" alt="Intelligent AI Dispatching Dashboard" className="rounded-2xl shadow-2xl border border-slate-200 object-cover w-full aspect-square" />
                        </div>
                        <div className="order-1 md:order-2">
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">Intelligent AI Dispatching</h2>
                            <p className="text-lg text-slate-600 leading-relaxed font-medium mb-6">
                                Stop manually assigning jobs. Our proprietary dispatch algorithm considers driver proximity, live traffic, vehicle type, and driver queue positions to automatically assign bookings in milliseconds.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-5 w-5 text-blue-500" /> Reduces dead mileage</li>
                                <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-5 w-5 text-blue-500" /> Fair driver queue management</li>
                                <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-5 w-5 text-blue-500" /> Zonal routing and surge pricing</li>
                            </ul>
                        </div>
                    </div>

                    {/* Feature 2 */}
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">WhatsApp AI Booking Agent</h2>
                            <p className="text-lg text-slate-600 leading-relaxed font-medium mb-6">
                                Meet your customers where they already are. CABAI integrates a fully autonomous AI agent into your business WhatsApp number. It chats with customers, parses addresses, quotes fares, and creates jobs directly in the dispatch system.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Zero hold times for passengers</li>
                                <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> Natural language understanding</li>
                                <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> 24/7 automated booking channel</li>
                            </ul>
                        </div>
                        <div className="flex items-center justify-center p-4">
                            <img src="/features/whatsapp_agent.png" alt="WhatsApp AI Booking Agent Interface" className="rounded-[2rem] shadow-2xl border border-slate-200 object-cover w-full max-w-sm aspect-[9/16] md:aspect-square" />
                        </div>
                    </div>

                    {/* Feature 3 */}
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1 flex items-center justify-center p-4">
                            <img src="/features/settlement.png" alt="Automated Driver Settlements Dashboard" className="rounded-2xl shadow-2xl border border-slate-200 object-cover w-full aspect-square" />
                        </div>
                        <div className="order-1 md:order-2">
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">Automated Settlements</h2>
                            <p className="text-lg text-slate-600 leading-relaxed font-medium mb-6">
                                Financial administration is the most time-consuming part of running a fleet. CABAI tracks every card payment, cash collection, and account booking, automatically calculating driver commissions and generating detailed settlement statements.
                            </p>
                            <ul className="space-y-3">
                                <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-5 w-5 text-purple-500" /> Custom commission rates per driver</li>
                                <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-5 w-5 text-purple-500" /> Export to accounting software</li>
                                <li className="flex items-center gap-3 text-slate-700 font-medium"><CheckCircle2 className="h-5 w-5 text-purple-500" /> Transparent driver earnings dashboard</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
