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
                        <div className="order-2 md:order-1 bg-slate-100 rounded-3xl aspect-square border border-slate-200 flex items-center justify-center p-8">
                            <div className="w-full h-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col gap-4">
                                <div className="h-12 w-3/4 bg-slate-100 rounded-lg animate-pulse"></div>
                                <div className="h-24 w-full bg-blue-50 rounded-lg border border-blue-100"></div>
                                <div className="h-24 w-full bg-slate-50 rounded-lg border border-slate-100"></div>
                            </div>
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
                        <div className="bg-emerald-50 rounded-3xl aspect-square border border-emerald-100 flex items-center justify-center p-8">
                            {/* Mockup */}
                            <div className="w-64 h-full bg-white rounded-[2rem] shadow-2xl border-4 border-slate-900 flex flex-col p-4">
                                <div className="flex gap-2 items-end mb-4">
                                    <div className="bg-emerald-100 text-emerald-900 p-3 rounded-2xl rounded-bl-none text-sm w-4/5">I need a taxi from Heathrow to Central London</div>
                                </div>
                                <div className="flex gap-2 items-end justify-end mb-4">
                                    <div className="bg-slate-100 text-slate-900 p-3 rounded-2xl rounded-br-none text-sm w-4/5 text-right">A standard car will be £65. Shall I book that for you now?</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Feature 3 */}
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div className="order-2 md:order-1 bg-purple-50 rounded-3xl aspect-square border border-purple-100 flex items-center justify-center p-8">
                            <div className="w-full h-full bg-white rounded-2xl shadow-xl border border-slate-200 p-6 flex flex-col gap-4">
                                <div className="flex justify-between items-center border-b pb-4">
                                    <div className="font-bold text-slate-900">Driver Settlement</div>
                                    <div className="font-bold text-emerald-600">£1,250.00</div>
                                </div>
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Cash Collected</span><span>£450.00</span>
                                </div>
                                <div className="flex justify-between text-sm text-slate-500">
                                    <span>Platform Fees (15%)</span><span className="text-red-500">-£187.50</span>
                                </div>
                            </div>
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
