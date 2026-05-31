'use client';

import { useState, useEffect } from 'react';
import { Loader2, Users, Calendar, Activity, AlertTriangle, CheckCircle, Clock, Smartphone, Globe, PhoneCall, Radio, Phone, BarChart2 } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface StatsData {
    operatorsActive: number;
    driversOnline: number;
    driversAvailable: number;
    driversBooked: number;
    totalDrivers: number;
    completedCount: number;
    cancelledCount: number;
    noShowCount: number;
    lateCount: number;
    dispatchingCount: number;
    prebookingsCount: number;
    channels: {
        web: number;
        app: number;
        voice: number;
        ivr: number;
        dispatcher: number;
    };
    hourlyTrend: Array<{ hour: string; Today: number; 'Last Week': number }>;
}

export default function WallboardPage() {
    const [data, setData] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [time, setTime] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    // Set client-side clock
    useEffect(() => {
        setIsMounted(true);
        const updateClock = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        };
        updateClock();
        const interval = setInterval(updateClock, 1000);
        return () => clearInterval(interval);
    }, []);

    // Fetch wallboard data
    const fetchStats = async () => {
        try {
            const res = await fetch('/api/reports/wallboard');
            if (res.ok) {
                const stats = await res.json();
                setData(stats);
            }
        } catch (e) {
            console.error("Failed to load wallboard stats", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
        const statsInterval = setInterval(fetchStats, 10000); // Poll every 10 seconds
        return () => clearInterval(statsInterval);
    }, []);

    if (loading || !data || !isMounted) {
        return (
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#09090b] text-white">
                <Loader2 className="h-10 w-10 animate-spin text-emerald-500 mb-4" />
                <p className="text-slate-400 font-medium tracking-wide">Loading Real-Time Wallboard...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen w-full bg-[#0a0a0c] text-white p-6 font-sans flex flex-col gap-6 selection:bg-emerald-500/30 overflow-y-auto select-none">
            
            {/* Header section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900/40 border border-white/5 rounded-3xl p-6 backdrop-blur">
                <div className="flex items-center gap-3">
                    <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_#10b981]"></div>
                    <div>
                        <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white">
                            Operational Wallboard
                        </h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Live Dispatch Monitoring Control</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 ml-auto md:ml-0 bg-black/30 border border-white/5 px-6 py-2.5 rounded-2xl">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Time</span>
                        <span className="text-2xl font-black font-mono text-emerald-400 tracking-wider">{time}</span>
                    </div>
                </div>
            </div>

            {/* Grid of Live Stats */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                
                {/* Operators Active */}
                <div className="bg-zinc-900/30 border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full"></div>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black tracking-widest text-slate-500 uppercase">Operators</span>
                        <Phone className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-4xl md:text-5xl font-black text-blue-400 tracking-tight group-hover:scale-105 transition-transform duration-300">
                        {data.operatorsActive}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Active Extensions</p>
                </div>

                {/* Drivers Online */}
                <div className="bg-zinc-900/30 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full"></div>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black tracking-widest text-slate-500 uppercase">Drivers Online</span>
                        <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
                    </div>
                    <p className="text-4xl md:text-5xl font-black text-emerald-400 tracking-tight">
                        {data.driversOnline}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Out of {data.totalDrivers} Drivers</p>
                </div>

                {/* Drivers Available */}
                <div className="bg-zinc-900/30 border border-teal-500/20 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 blur-2xl rounded-full"></div>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black tracking-widest text-slate-500 uppercase">Drivers Available</span>
                        <Users className="w-5 h-5 text-teal-400" />
                    </div>
                    <p className="text-4xl md:text-5xl font-black text-teal-400 tracking-tight">
                        {data.driversAvailable}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Ready for Job Dispatch</p>
                </div>

                {/* Drivers Booked */}
                <div className="bg-zinc-900/30 border border-indigo-500/20 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-2xl rounded-full"></div>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black tracking-widest text-slate-500 uppercase">Drivers Booked</span>
                        <Clock className="w-5 h-5 text-indigo-400" />
                    </div>
                    <p className="text-4xl md:text-5xl font-black text-indigo-400 tracking-tight">
                        {data.driversBooked}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Currently POB or En Route</p>
                </div>

                {/* Completed Bookings */}
                <div className="bg-zinc-900/30 border border-emerald-500/20 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full"></div>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black tracking-widest text-slate-500 uppercase">Completed</span>
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                    <p className="text-4xl md:text-5xl font-black text-emerald-500 tracking-tight">
                        {data.completedCount}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Finished Jobs Today</p>
                </div>

                {/* Dispatching Bookings */}
                <div className="bg-zinc-900/30 border border-amber-500/20 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full"></div>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black tracking-widest text-slate-500 uppercase">Dispatching</span>
                        <Activity className="w-5 h-5 text-amber-400" />
                    </div>
                    <p className="text-4xl md:text-5xl font-black text-amber-400 tracking-tight">
                        {data.dispatchingCount}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Active Auto-Dispatch Loops</p>
                </div>

                {/* Late bookings */}
                <div className="bg-zinc-900/30 border border-rose-500/20 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-2xl rounded-full"></div>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black tracking-widest text-slate-500 uppercase text-rose-500">Late bookings</span>
                        <AlertTriangle className="w-5 h-5 text-rose-500 animate-bounce" />
                    </div>
                    <p className="text-4xl md:text-5xl font-black text-rose-500 tracking-tight">
                        {data.lateCount}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Pickup Time Exceeded</p>
                </div>

                {/* Cancelled Bookings */}
                <div className="bg-zinc-900/30 border border-red-500/20 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 blur-2xl rounded-full"></div>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black tracking-widest text-slate-500 uppercase">Cancelled</span>
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                    </div>
                    <p className="text-4xl md:text-5xl font-black text-red-400 tracking-tight">
                        {data.cancelledCount}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Cancelled/Rejected Today</p>
                </div>

                {/* Prebookings */}
                <div className="bg-zinc-900/30 border border-zinc-500/20 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-zinc-500/5 blur-2xl rounded-full"></div>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black tracking-widest text-slate-500 uppercase">Prebookings</span>
                        <Calendar className="w-5 h-5 text-slate-400" />
                    </div>
                    <p className="text-4xl md:text-5xl font-black text-slate-300 tracking-tight">
                        {data.prebookingsCount}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Scheduled Future Rides</p>
                </div>

                {/* Bookings No Show */}
                <div className="bg-zinc-900/30 border border-yellow-500/20 rounded-3xl p-6 relative overflow-hidden group shadow-lg">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-yellow-500/5 blur-2xl rounded-full"></div>
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs font-black tracking-widest text-slate-500 uppercase">Bookings No Show</span>
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    </div>
                    <p className="text-4xl md:text-5xl font-black text-yellow-400 tracking-tight">
                        {data.noShowCount}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-wide">Passenger Did Not Arrive</p>
                </div>

            </div>

            {/* Middle Section: Chart and Channels Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Bookings Trend Chart */}
                <div className="lg:col-span-2 bg-zinc-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur shadow-2xl flex flex-col h-[400px]">
                    <div className="flex items-center gap-2 mb-6">
                        <BarChart2 className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-sm font-black uppercase tracking-wider text-slate-300">Bookings Hourly Trend</h2>
                        <div className="flex items-center gap-4 ml-auto text-xs">
                            <span className="flex items-center gap-1 text-slate-400">
                                <span className="h-2 w-2 rounded-full bg-slate-500"></span> Last Week
                            </span>
                            <span className="flex items-center gap-1 text-emerald-400 font-bold">
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span> Today
                            </span>
                        </div>
                    </div>
                    <div className="flex-1 w-full text-xs font-bold font-mono">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.hourlyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="colorToday" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="colorLastWeek" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#71717a" stopOpacity={0.1}/>
                                        <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                                <XAxis dataKey="hour" stroke="#71717a" tickLine={false} />
                                <YAxis stroke="#71717a" tickLine={false} />
                                <Tooltip 
                                    contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', color: '#ffffff' }}
                                    labelStyle={{ fontWeight: 'bold', color: '#a1a1aa' }}
                                />
                                <Area type="monotone" dataKey="Today" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorToday)" />
                                <Area type="monotone" dataKey="Last Week" stroke="#71717a" strokeWidth={1.5} fillOpacity={1} fill="url(#colorLastWeek)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Booking Channels attribution */}
                <div className="bg-zinc-900/30 border border-white/5 rounded-3xl p-6 backdrop-blur shadow-2xl flex flex-col justify-between gap-4">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-6 flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                            Attribution Channels
                        </h2>

                        <div className="space-y-4">
                            
                            {/* Web bookings */}
                            <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-300">Web Booker</span>
                                </div>
                                <span className="text-xl font-black text-white">{data.channels.web}</span>
                            </div>

                            {/* App bookings */}
                            <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <Smartphone className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-300">Passenger App</span>
                                </div>
                                <span className="text-xl font-black text-white">{data.channels.app}</span>
                            </div>

                            {/* Voice AI bookings */}
                            <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                                        <PhoneCall className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-300">Voice AI Agent</span>
                                </div>
                                <span className="text-xl font-black text-white">{data.channels.voice}</span>
                            </div>

                            {/* IVR Bookings / WhatsApp */}
                            <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-400">
                                        <Globe className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-300">WhatsApp / Chatbot</span>
                                </div>
                                <span className="text-xl font-black text-white">{data.channels.ivr}</span>
                            </div>

                            {/* Console bookings */}
                            <div className="flex justify-between items-center bg-black/20 p-3 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-2.5">
                                    <div className="h-8 w-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400">
                                        <Radio className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-slate-300">Dispatcher Console</span>
                                </div>
                                <span className="text-xl font-black text-white">{data.channels.dispatcher}</span>
                            </div>

                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
}
