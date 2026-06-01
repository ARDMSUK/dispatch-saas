'use client';

import { useState, useEffect } from 'react';
import { 
    Loader2, Users, Calendar, Activity, AlertTriangle, CheckCircle, 
    Clock, Smartphone, Globe, PhoneCall, Radio, Phone, BarChart2,
    TrendingUp, Percent, Coins, Maximize2, Minus, X, Sun, Moon, 
    CloudSun, CloudRain, ShieldCheck, MapPin, DollarSign
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, PieChart, Pie, Cell 
} from 'recharts';

interface JobFeedItem {
    id: number;
    passengerName: string;
    pickupAddress: string;
    dropoffAddress: string;
    status: string;
    pickupTime: string;
    fare: number | null;
}

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
    automationRate: number;
    avgFare: number;
    avgDispatchTime: number;
    avgDriverEarning: number;
    avgPickupTime: number;
    avgPobTime: number;
    paymentSplit: {
        cash: number;
        card: number;
        account: number;
    };
    weather: {
        temp: number;
        condition: string;
        icon: string;
    };
    channels: {
        web: number;
        app: number;
        voice: number;
        ivr: number;
        dispatcher: number;
    };
    recentJobs: JobFeedItem[];
    hourlyTrend: Array<{ hour: string; Today: number; 'Last Week': number }>;
}

function WidgetCard({ 
    title, 
    icon: Icon, 
    children, 
    className = "", 
    glowColor = "" 
}: { 
    title: string; 
    icon?: any; 
    children: React.ReactNode; 
    className?: string; 
    glowColor?: string;
}) {
    return (
        <div className={`bg-zinc-950/70 border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative group hover:border-white/10 transition-all duration-300 ${className} ${glowColor}`}>
            {/* Widget Chrome Header */}
            <div className="bg-zinc-900/60 px-4 py-2 border-b border-white/5 flex justify-between items-center select-none">
                <div className="flex items-center gap-2">
                    {/* Window Controls Decorators */}
                    <div className="flex gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-red-500/60 hover:bg-red-500 transition-colors cursor-pointer"></span>
                        <span className="w-2 h-2 rounded-full bg-amber-500/60 hover:bg-amber-500 transition-colors cursor-pointer"></span>
                        <span className="w-2 h-2 rounded-full bg-emerald-500/60 hover:bg-emerald-500 transition-colors cursor-pointer"></span>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 pl-2">
                        {title}
                    </span>
                </div>
                {Icon && <Icon className="w-3.5 h-3.5 text-slate-500" />}
            </div>
            {/* Widget Content */}
            <div className="p-4 md:p-5 relative z-10">
                {children}
            </div>
        </div>
    );
}

export default function WallboardPage() {
    const [data, setData] = useState<StatsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [time, setTime] = useState('');
    const [dateString, setDateString] = useState('');
    const [isMounted, setIsMounted] = useState(false);

    // Set client-side clock
    useEffect(() => {
        setIsMounted(true);
        const updateClock = () => {
            const now = new Date();
            setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            setDateString(now.toLocaleDateString([], { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }));
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
                <p className="text-slate-400 font-medium tracking-wide">Initializing Operations Console...</p>
            </div>
        );
    }

    // Format seconds to readable format (e.g. 501 -> 8m 21s)
    const formatDuration = (seconds: number) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    };

    // Calculate total bookings today
    const totalTodayBookings = data.completedCount + data.cancelledCount + data.noShowCount + data.dispatchingCount + data.prebookingsCount;

    // Pie chart values
    const pieData = [
        { name: 'Card', value: data.paymentSplit.card, color: '#10b981' },
        { name: 'Cash', value: data.paymentSplit.cash, color: '#f59e0b' },
        { name: 'Account', value: data.paymentSplit.account, color: '#8b5cf6' }
    ].filter(item => item.value > 0);

    // Weather condition selector
    const renderWeatherIcon = (iconName: string) => {
        switch (iconName) {
            case 'cloud-sun':
                return <CloudSun className="w-8 h-8 text-amber-400 animate-pulse" />;
            case 'moon':
                return <Moon className="w-8 h-8 text-blue-300 animate-pulse" />;
            default:
                return <Sun className="w-8 h-8 text-amber-500 animate-pulse" />;
        }
    };

    return (
        <div className="min-h-screen w-full bg-[#050507] text-white p-4 md:p-6 font-sans flex flex-col gap-6 select-none overflow-y-auto">
            
            {/* Top Status Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-950/60 border border-white/5 rounded-3xl p-5 md:p-6 backdrop-blur shadow-2xl">
                <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_12px_#10b981]"></div>
                    <div>
                        <h1 className="text-lg md:text-xl font-black uppercase tracking-widest text-white flex items-center gap-2">
                            Cabai Control Center <span className="text-[10px] font-bold text-slate-500 normal-case tracking-normal px-2 py-0.5 bg-white/5 border border-white/5 rounded">v6.4</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Live Operational Telemetry Dashboard</p>
                    </div>
                </div>

                <div className="flex items-center gap-6 ml-auto md:ml-0 bg-black/40 border border-white/5 px-5 py-2.5 rounded-2xl shadow-inner">
                    <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{dateString}</span>
                        <span className="text-xl md:text-2xl font-black font-mono text-emerald-400 tracking-wider select-text">{time}</span>
                    </div>
                </div>
            </div>

            {/* High Density Control Deck (Grid Layout) */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                
                {/* 1. Real-Time Status Widgets */}
                <WidgetCard title="Operators" icon={Phone}>
                    <p className="text-3xl md:text-4xl font-black text-blue-400 tracking-tight">
                        {data.operatorsActive}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Active Extensions</p>
                </WidgetCard>

                <WidgetCard title="Drivers Online" icon={Radio}>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl md:text-4xl font-black text-emerald-400 tracking-tight">
                            {data.driversOnline}
                        </span>
                        <span className="text-xs text-slate-500">/ {data.totalDrivers}</span>
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Active Duty Drivers</p>
                </WidgetCard>

                <WidgetCard title="Drivers Available" icon={Users}>
                    <p className="text-3xl md:text-4xl font-black text-teal-400 tracking-tight">
                        {data.driversAvailable}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Available for Jobs</p>
                </WidgetCard>

                <WidgetCard title="Drivers Booked" icon={Clock}>
                    <p className="text-3xl md:text-4xl font-black text-indigo-400 tracking-tight">
                        {data.driversBooked}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">POB or Assigned</p>
                </WidgetCard>

                {/* 2. Today's Performance Widgets */}
                <WidgetCard title="Completed Jobs" icon={CheckCircle}>
                    <p className="text-3xl md:text-4xl font-black text-emerald-500 tracking-tight">
                        {data.completedCount}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Rides Executed Today</p>
                </WidgetCard>

                <WidgetCard title="Dispatching" icon={Activity}>
                    <p className="text-3xl md:text-4xl font-black text-amber-500 tracking-tight">
                        {data.dispatchingCount}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Pending Assignment</p>
                </WidgetCard>

                {/* Late bookings widget: Red glow and pulse outline if there's any late job */}
                <WidgetCard 
                    title="Late Bookings" 
                    icon={AlertTriangle}
                    glowColor={data.lateCount > 0 ? "border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse" : ""}
                >
                    <p className={`text-3xl md:text-4xl font-black tracking-tight ${data.lateCount > 0 ? 'text-red-500 animate-bounce' : 'text-slate-400'}`}>
                        {data.lateCount}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Pickup Time Exceeded</p>
                </WidgetCard>

                <WidgetCard title="Cancelled" icon={AlertTriangle}>
                    <p className="text-3xl md:text-4xl font-black text-rose-500 tracking-tight">
                        {data.cancelledCount}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Today's Cancelled / Rejected</p>
                </WidgetCard>

                <WidgetCard title="Prebookings" icon={Calendar}>
                    <p className="text-3xl md:text-4xl font-black text-slate-300 tracking-tight">
                        {data.prebookingsCount}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Scheduled Future Runs</p>
                </WidgetCard>

                <WidgetCard title="No Shows" icon={AlertTriangle}>
                    <p className="text-3xl md:text-4xl font-black text-yellow-500 tracking-tight">
                        {data.noShowCount}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Passenger No-Show</p>
                </WidgetCard>

            </div>

            {/* Middle telemetry & KPI section */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                
                {/* 3. Efficiency & Financial metrics */}
                <WidgetCard title="Automation Rate" icon={Percent}>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl md:text-4xl font-black text-emerald-400 tracking-tight">
                            {data.automationRate}%
                        </span>
                    </div>
                    <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${data.automationRate}%` }}
                        ></div>
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 mt-2 uppercase tracking-wide">Web, App & AI Bookings</p>
                </WidgetCard>

                <WidgetCard title="Avg Dispatch Time" icon={ShieldCheck}>
                    <p className="text-3xl md:text-4xl font-black text-teal-400 tracking-tight">
                        {data.avgDispatchTime}s
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Assignation Latency</p>
                </WidgetCard>

                <WidgetCard title="Avg Pickup Time" icon={MapPin}>
                    <p className="text-3xl md:text-4xl font-black text-blue-400 tracking-tight">
                        {formatDuration(data.avgPickupTime)}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Dispatched to Arrived</p>
                </WidgetCard>

                <WidgetCard title="Avg Fare" icon={DollarSign}>
                    <p className="text-3xl md:text-4xl font-black text-indigo-400 tracking-tight">
                        £{data.avgFare}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Completed Booking Average</p>
                </WidgetCard>

                <WidgetCard title="Driver Earning (7D)" icon={Coins}>
                    <p className="text-3xl md:text-4xl font-black text-amber-500 tracking-tight">
                        £{data.avgDriverEarning}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500 mt-1 uppercase tracking-wide">Average Commission Take</p>
                </WidgetCard>

            </div>

            {/* Charts & Interactive Panels */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Column 1 & 2: Main Booking Trend (Hourly chart) */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    
                    {/* Hourly Booking Trend Chart */}
                    <div className="bg-zinc-950/70 border border-white/5 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur flex flex-col h-[400px]">
                        <div className="bg-zinc-900/60 px-4 py-2 border border-white/5 rounded-2xl flex justify-between items-center mb-6 select-none">
                            <div className="flex items-center gap-2">
                                <BarChart2 className="w-4 h-4 text-emerald-400" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Hourly Booking Trend Comparison
                                </span>
                            </div>
                            <div className="flex items-center gap-4 text-[10px] font-bold font-mono">
                                <span className="flex items-center gap-1.5 text-slate-400">
                                    <span className="h-2 w-2 rounded-full bg-slate-500"></span> Last Week
                                </span>
                                <span className="flex items-center gap-1.5 text-emerald-400">
                                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span> Today
                                </span>
                            </div>
                        </div>

                        <div className="flex-1 w-full text-[10px] font-bold font-mono">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={data.hourlyTrend} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorToday" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorLastWeek" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#71717a" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#71717a" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1d1d21" vertical={false} />
                                    <XAxis dataKey="hour" stroke="#71717a" tickLine={false} />
                                    <YAxis stroke="#71717a" tickLine={false} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '1rem', color: '#ffffff' }}
                                        labelStyle={{ fontWeight: 'bold', color: '#a1a1aa' }}
                                    />
                                    <Area type="monotone" dataKey="Today" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorToday)" />
                                    <Area type="monotone" dataKey="Last Week" stroke="#71717a" strokeWidth={1.5} fillOpacity={1} fill="url(#colorLastWeek)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Live Dispatch Job Feed (Real-Time ticker) */}
                    <WidgetCard title="Live Dispatch Feed" icon={Activity}>
                        <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                            {data.recentJobs.length > 0 ? (
                                data.recentJobs.map((job) => (
                                    <div 
                                        key={job.id} 
                                        className="flex items-center justify-between p-3 bg-zinc-900/30 border border-white/5 rounded-2xl hover:bg-zinc-900/50 transition-colors duration-200 select-text"
                                    >
                                        <div className="flex flex-col gap-0.5">
                                            <div className="flex items-center gap-2">
                                                <span className="text-xs font-black text-slate-200 uppercase">{job.passengerName}</span>
                                                <span className="text-[10px] text-slate-500 font-mono">#{job.id}</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                                <span className="truncate max-w-[150px] md:max-w-[200px]">{job.pickupAddress.split(',')[0]}</span>
                                                <span className="text-slate-600">→</span>
                                                <span className="truncate max-w-[150px] md:max-w-[200px]">{job.dropoffAddress.split(',')[0]}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            {job.fare && (
                                                <span className="text-xs font-black text-slate-200 font-mono">£{job.fare}</span>
                                            )}
                                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-wide border ${
                                                job.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                job.status === 'CANCELLED' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
                                                ['DISPATCHING', 'ACCEPTED', 'EN_ROUTE', 'POB'].includes(job.status) ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse' :
                                                'bg-slate-500/10 text-slate-400 border-white/5'
                                            }`}>
                                                {job.status}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-xs text-slate-500 text-center py-6 font-bold uppercase tracking-widest">No Active Bookings Today</p>
                            )}
                        </div>
                    </WidgetCard>

                </div>

                {/* Column 3: Payment Split & Channels & Weather Widgets */}
                <div className="flex flex-col gap-6">
                    
                    {/* Payment Split & Booking Channels */}
                    <div className="bg-zinc-950/70 border border-white/5 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur flex flex-col justify-between gap-6">
                        {/* Weather Widget Header */}
                        <div className="bg-zinc-900/60 px-4 py-2 border border-white/5 rounded-2xl flex justify-between items-center select-none">
                            <div className="flex items-center gap-2">
                                <Sun className="w-4 h-4 text-amber-500" />
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Local Operations Weather
                                </span>
                            </div>
                        </div>

                        {/* Weather Details */}
                        <div className="flex items-center justify-between bg-black/40 border border-white/5 p-4 rounded-2xl select-text">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Covent Garden, London</span>
                                <span className="text-2xl font-black text-white">{data.weather.temp}°C</span>
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">{data.weather.condition}</span>
                            </div>
                            {renderWeatherIcon(data.weather.icon)}
                        </div>

                        <hr className="border-white/5" />

                        {/* Payment Split Distribution */}
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                                Payment Split (Card vs Cash vs A/C)
                            </h2>

                            {pieData.length > 0 ? (
                                <div className="h-[120px] flex items-center justify-center relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={30}
                                                outerRadius={45}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '0.5rem', color: '#ffffff' }}
                                                itemStyle={{ fontSize: '10px' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Middle value display */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                                        <span className="text-xs font-black text-slate-400">Today</span>
                                        <span className="text-lg font-black text-white font-mono leading-none">{totalTodayBookings}</span>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-[10px] text-slate-500 text-center py-6 font-bold uppercase tracking-widest">No Payments Settled Today</p>
                            )}

                            {/* Legend labels */}
                            <div className="flex justify-center gap-4 mt-2 text-[10px] font-bold font-mono">
                                <span className="flex items-center gap-1.5 text-emerald-400">
                                    <span className="h-2 w-2 rounded bg-emerald-500"></span> Card ({data.paymentSplit.card})
                                </span>
                                <span className="flex items-center gap-1.5 text-amber-500">
                                    <span className="h-2 w-2 rounded bg-amber-500"></span> Cash ({data.paymentSplit.cash})
                                </span>
                                <span className="flex items-center gap-1.5 text-purple-400">
                                    <span className="h-2 w-2 rounded bg-purple-500"></span> A/C ({data.paymentSplit.account})
                                </span>
                            </div>
                        </div>

                        <hr className="border-white/5" />

                        {/* Channels attribution list */}
                        <div>
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span>
                                Attribution Channels
                            </h2>

                            <div className="space-y-2">
                                
                                {/* Web bookings */}
                                <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                                            <Globe className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-300">Web Booker</span>
                                    </div>
                                    <span className="text-sm font-black text-white font-mono">{data.channels.web}</span>
                                </div>

                                {/* App bookings */}
                                <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded bg-blue-500/10 flex items-center justify-center text-blue-400">
                                            <Smartphone className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-300">Passenger App</span>
                                    </div>
                                    <span className="text-sm font-black text-white font-mono">{data.channels.app}</span>
                                </div>

                                {/* Voice AI bookings */}
                                <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded bg-purple-500/10 flex items-center justify-center text-purple-400">
                                            <PhoneCall className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-300">Voice AI Agent</span>
                                    </div>
                                    <span className="text-sm font-black text-white font-mono">{data.channels.voice}</span>
                                </div>

                                {/* WhatsApp bookings */}
                                <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded bg-teal-500/10 flex items-center justify-center text-teal-400">
                                            <Globe className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-300">WhatsApp AI</span>
                                    </div>
                                    <span className="text-sm font-black text-white font-mono">{data.channels.ivr}</span>
                                </div>

                                {/* Console bookings */}
                                <div className="flex justify-between items-center bg-black/20 p-2.5 rounded-xl border border-white/5">
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded bg-amber-500/10 flex items-center justify-center text-amber-400">
                                            <Radio className="w-3.5 h-3.5" />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-300">Dispatcher Console</span>
                                    </div>
                                    <span className="text-sm font-black text-white font-mono">{data.channels.dispatcher}</span>
                                </div>

                            </div>
                        </div>
                    </div>

                </div>

            </div>

        </div>
    );
}
