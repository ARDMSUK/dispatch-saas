'use client';

import { useState, useEffect } from 'react';
import { 
    Loader2, Users, Calendar, Activity, AlertTriangle, CheckCircle, 
    Clock, Smartphone, Globe, PhoneCall, Radio, Phone, BarChart2,
    Sun, Moon, CloudSun, MapPin, DollarSign, Percent, Coins
} from 'lucide-react';
import { 
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, 
    Tooltip, PieChart, Pie, Cell 
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

function DashboardCard({ 
    title, 
    subtitle, 
    value, 
    accentColor = "", 
    icon: Icon,
    className = ""
}: { 
    title: string; 
    subtitle?: string; 
    value: string | number; 
    accentColor?: string; 
    icon?: any;
    className?: string;
}) {
    return (
        <div className={`bg-[#242424] border border-[#333333] rounded-lg p-4 shadow-[0_8px_20px_rgba(0,0,0,0.18)] flex flex-col justify-between relative overflow-hidden transition-all duration-200 hover:border-[#444] ${className}`}>
            {/* Subtle accent border at the bottom */}
            {accentColor && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px]" style={{ backgroundColor: accentColor }}></div>
            )}
            
            <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-bold text-[#a0a0a0] uppercase tracking-wider">{title}</span>
                {Icon && <Icon className="w-3.5 h-3.5 text-[#a0a0a0]" />}
            </div>
            
            <div className="bg-[#333333] rounded-[6px] p-3 my-1.5">
                <span className="text-2xl md:text-3xl font-bold text-[#f2f2f2] font-mono leading-none tracking-tight">{value}</span>
            </div>
            
            {subtitle && (
                <span className="text-[9px] font-bold text-[#a0a0a0] uppercase tracking-wider">{subtitle}</span>
            )}
        </div>
    );
}

function DriverStatusCard({ 
    online, 
    available, 
    booked,
    total
}: { 
    online: number; 
    available: number; 
    booked: number;
    total: number;
}) {
    return (
        <div className="bg-[#242424] border border-[#333333] rounded-lg p-4 shadow-[0_8px_20px_rgba(0,0,0,0.18)] flex flex-col justify-between">
            <span className="text-[10px] font-bold text-[#a0a0a0] uppercase tracking-wider block mb-2">Driver Status</span>
            
            <div className="grid grid-cols-3 gap-2 my-1">
                <div className="bg-[#333333] p-2 rounded-[6px] text-center">
                    <span className="text-[8px] font-bold text-[#a0a0a0] uppercase tracking-wide block">Online</span>
                    <span className="text-lg font-bold text-[#f2f2f2] font-mono">{online}</span>
                </div>
                <div className="bg-[#333333] p-2 rounded-[6px] text-center border-b-2 border-[#6fbf5f]">
                    <span className="text-[8px] font-bold text-[#6fbf5f] uppercase tracking-wide block">Free</span>
                    <span className="text-lg font-bold text-[#f2f2f2] font-mono">{available}</span>
                </div>
                <div className="bg-[#333333] p-2 rounded-[6px] text-center border-b-2 border-[#8b5cf6]">
                    <span className="text-[8px] font-bold text-[#8b5cf6] uppercase tracking-wide block">Busy</span>
                    <span className="text-lg font-bold text-[#f2f2f2] font-mono">{booked}</span>
                </div>
            </div>

            <div className="flex justify-between items-center text-[9px] font-bold text-[#a0a0a0] uppercase tracking-wider mt-1 pt-1 border-t border-[#333333]">
                <span>Registered Fleet</span>
                <span className="text-[#f2f2f2] font-mono">{total}</span>
            </div>
        </div>
    );
}

function OperationalAlertsCard({ 
    lateCount, 
    noShowCount, 
    availableDrivers 
}: { 
    lateCount: number; 
    noShowCount: number; 
    availableDrivers: number;
}) {
    const alerts = [];
    if (lateCount > 0) {
        alerts.push({
            id: 'late',
            text: `${lateCount} Late bookings pending`,
            color: '#d86666',
            badge: 'Urgent'
        });
    }
    if (noShowCount > 0) {
        alerts.push({
            id: 'noshow',
            text: `${noShowCount} Passenger no-shows`,
            color: '#d6a637',
            badge: 'No-Show'
        });
    }
    if (availableDrivers === 0) {
        alerts.push({
            id: 'shortage',
            text: 'Low driver capacity alert',
            color: '#d86666',
            badge: 'Shortage'
        });
    }

    if (alerts.length === 0) {
        alerts.push({
            id: 'none',
            text: 'All fleets operating normal',
            color: '#6fbf5f',
            badge: 'Normal'
        });
    }

    return (
        <div className="bg-[#242424] border border-[#333333] rounded-lg p-4 shadow-[0_8px_20px_rgba(0,0,0,0.18)] flex flex-col justify-between h-full">
            <span className="text-[10px] font-bold text-[#a0a0a0] uppercase tracking-wider block mb-2">Operational Alerts</span>
            <div className="space-y-1.5 my-1 overflow-y-auto max-h-[96px] pr-1">
                {alerts.map(alert => (
                    <div 
                        key={alert.id} 
                        className="flex items-center justify-between p-2 bg-[#1c1c1c] border border-[#333333] rounded-[4px] gap-2"
                    >
                        <span className="text-[10px] font-medium text-[#c8c8c8] truncate">{alert.text}</span>
                        <span 
                            className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded tracking-wide font-mono shrink-0"
                            style={{ color: alert.color, border: `1px solid ${alert.color}25`, backgroundColor: `${alert.color}08` }}
                        >
                            {alert.badge}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function WeatherCard({ temp, condition, icon }: { temp: number; condition: string; icon: string }) {
    const renderIcon = (name: string) => {
        switch (name) {
            case 'cloud-sun':
                return <CloudSun className="w-5 h-5 text-[#d6a637]" />;
            case 'moon':
                return <Moon className="w-5 h-5 text-[#6d9edb]" />;
            default:
                return <Sun className="w-5 h-5 text-[#d6a637]" />;
        }
    };

    return (
        <div className="bg-[#242424] border border-[#333333] rounded-lg p-4 shadow-[0_8px_20px_rgba(0,0,0,0.18)] flex items-center justify-between">
            <div className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-[#a0a0a0] uppercase tracking-wider">Weather</span>
                <span className="text-2xl font-bold text-[#f2f2f2] font-mono leading-none">{temp}°C</span>
                <span className="text-[9px] font-bold text-[#a0a0a0] uppercase tracking-wider">{condition}</span>
            </div>
            <div className="bg-[#333333] p-2.5 rounded-md">
                {renderIcon(icon)}
            </div>
        </div>
    );
}

function PaymentSplitCard({ 
    cash, 
    card, 
    account 
}: { 
    cash: number; 
    card: number; 
    account: number;
}) {
    const total = cash + card + account;
    const chartData = [
        { name: "Cash", value: cash || 55, color: "#d6a637" },
        { name: "Card", value: card || 30, color: "#6fbf5f" },
        { name: "Invoice", value: account || 15, color: "#6d9edb" }
    ].filter(d => d.value > 0);

    return (
        <div className="bg-[#242424] border border-[#333333] rounded-lg p-4 shadow-[0_8px_20px_rgba(0,0,0,0.18)] flex flex-col justify-between">
            <span className="text-[10px] font-bold text-[#a0a0a0] uppercase tracking-wider block mb-1">Payment Split</span>
            
            {chartData.length > 0 ? (
                <div className="h-[96px] flex items-center justify-center relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={chartData}
                                cx="50%"
                                cy="50%"
                                innerRadius={22}
                                outerRadius={36}
                                paddingAngle={3}
                                dataKey="value"
                            >
                                {chartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip 
                                contentStyle={{ backgroundColor: '#1c1c1c', border: '1px solid #333', borderRadius: '4px', color: '#f2f2f2' }}
                                itemStyle={{ fontSize: '10px' }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none mt-1">
                        <span className="text-[8px] font-bold text-[#a0a0a0]">Today</span>
                        <span className="text-sm font-bold text-[#f2f2f2] font-mono leading-none">{total}</span>
                    </div>
                </div>
            ) : (
                <div className="text-center py-6 text-[10px] text-[#a0a0a0] uppercase tracking-widest font-bold">No Records</div>
            )}

            <div className="flex justify-center gap-3 text-[9px] font-bold font-mono pt-1 border-t border-[#333333] mt-1">
                {chartData.map(item => (
                    <span key={item.name} className="flex items-center gap-1" style={{ color: item.color }}>
                        <span className="h-1.5 w-1.5 rounded" style={{ backgroundColor: item.color }}></span>
                        {item.name} ({item.value})
                    </span>
                ))}
            </div>
        </div>
    );
}

function HourlyTrendCard({ 
    trend 
}: { 
    trend: Array<{ hour: string; Today: number; 'Last Week': number }> 
}) {
    return (
        <div className="bg-[#242424] border border-[#333333] rounded-lg p-4 shadow-[0_8px_20px_rgba(0,0,0,0.18)] flex flex-col h-full min-h-[220px]">
            <div className="flex justify-between items-center mb-3">
                <span className="text-[10px] font-bold text-[#a0a0a0] uppercase tracking-wider">Bookings by Hour</span>
                <div className="flex items-center gap-3 text-[9px] font-bold font-mono">
                    <span className="flex items-center gap-1 text-[#a0a0a0]">
                        <span className="h-1.5 w-1.5 rounded bg-slate-500"></span> Last Week
                    </span>
                    <span className="flex items-center gap-1 text-[#6fbf5f]">
                        <span className="h-1.5 w-1.5 rounded bg-[#6fbf5f]"></span> Today
                    </span>
                </div>
            </div>

            <div className="flex-1 w-full text-[9px] font-bold font-mono">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trend} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorToday" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6fbf5f" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#6fbf5f" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorLastWeek" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#a0a0a0" stopOpacity={0.05}/>
                                <stop offset="95%" stopColor="#a0a0a0" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" vertical={false} />
                        <XAxis dataKey="hour" stroke="#a0a0a0" tickLine={false} />
                        <YAxis stroke="#a0a0a0" tickLine={false} />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1c1c1c', border: '1px solid #333', borderRadius: '4px', color: '#f2f2f2' }}
                            labelStyle={{ fontWeight: 'bold', color: '#a0a0a0' }}
                        />
                        <Area type="monotone" dataKey="Today" stroke="#6fbf5f" strokeWidth={1.5} fillOpacity={1} fill="url(#colorToday)" />
                        <Area type="monotone" dataKey="Last Week" stroke="#a0a0a0" strokeWidth={1} fillOpacity={1} fill="url(#colorLastWeek)" />
                    </AreaChart>
                </ResponsiveContainer>
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
            <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#111111] text-[#f2f2f2]">
                <Loader2 className="h-8 w-8 animate-spin text-[#6d9edb] mb-3" />
                <p className="text-[#a0a0a0] text-xs font-bold uppercase tracking-widest">Initializing Control Room Wallboard...</p>
            </div>
        );
    }

    // Format seconds to readable format (e.g. 501 -> 8m 21s)
    const formatDuration = (seconds: number) => {
        if (!seconds) return '0s';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return mins > 0 ? `${mins} Min ${secs} Sec` : `${secs} Sec`;
    };

    return (
        <div className="min-h-screen w-full bg-[#111111] text-[#f2f2f2] p-4 md:p-6 font-sans flex flex-col gap-5 select-none overflow-y-auto selection:bg-[#8b5cf6]/30">
            
            {/* Top Status Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-[#1c1c1c] border border-[#333333] rounded-lg px-5 py-3 shadow-[0_8px_20px_rgba(0,0,0,0.18)]">
                <div className="flex items-center gap-4">
                    <div>
                        <h1 className="text-sm font-bold text-[#f2f2f2] uppercase tracking-wider">
                            Operational Wallboard
                        </h1>
                        <p className="text-[10px] font-semibold text-[#a0a0a0] uppercase tracking-widest mt-0.5">Live dispatch monitoring</p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#242424] border border-[#333333] px-2 py-0.5 rounded text-[8px] font-bold text-[#6fbf5f]">
                        <span className="h-1.5 w-1.5 bg-[#6fbf5f] rounded-full animate-pulse"></span>
                        System Online
                    </div>
                </div>

                <div className="flex flex-col items-end sm:ml-auto">
                    <span className="text-base font-bold font-mono text-[#f2f2f2] tracking-wider select-text">{time}</span>
                    <span className="text-[8px] font-bold text-[#a0a0a0] uppercase tracking-widest mt-0.5">{dateString}</span>
                </div>
            </div>

            {/* High Density Control Deck (5-Column Grid Layout) */}
            
            {/* Row 1: Primary Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <DashboardCard 
                    title="Bookings Completed" 
                    subtitle="Today" 
                    value={data.completedCount} 
                    accentColor="#6fbf5f" 
                    icon={CheckCircle} 
                />
                <DashboardCard 
                    title="Prebookings" 
                    subtitle="Upcoming" 
                    value={data.prebookingsCount} 
                    accentColor="#6d9edb" 
                    icon={Calendar} 
                />
                <DashboardCard 
                    title="Late Bookings" 
                    subtitle="Now" 
                    value={data.lateCount} 
                    accentColor={data.lateCount > 0 ? "#d86666" : ""} 
                    icon={AlertTriangle} 
                />
                <DashboardCard 
                    title="Bookings Cancelled" 
                    subtitle="Today" 
                    value={data.cancelledCount} 
                    accentColor="#d86666" 
                    icon={AlertTriangle} 
                />
                <DashboardCard 
                    title="Bookings No Show" 
                    subtitle="Today" 
                    value={data.noShowCount} 
                    accentColor="#d6a637" 
                    icon={AlertTriangle} 
                />
            </div>

            {/* Row 2: Call Channels & Automation */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <DashboardCard 
                    title="Dispatch Bookings" 
                    subtitle="Today" 
                    value={data.channels.dispatcher} 
                    accentColor="#a0a0a0" 
                    icon={Radio} 
                />
                <DashboardCard 
                    title="Web Bookings" 
                    subtitle="Today" 
                    value={data.channels.web} 
                    accentColor="#6d9edb" 
                    icon={Globe} 
                />
                <DashboardCard 
                    title="App Bookings" 
                    subtitle="Today" 
                    value={data.channels.app} 
                    accentColor="#6d9edb" 
                    icon={Smartphone} 
                />
                <DashboardCard 
                    title="IVR Bookings" 
                    subtitle="Today" 
                    value={data.channels.ivr} 
                    accentColor="#6d9edb" 
                    icon={PhoneCall} 
                />
                
                {/* Automation Progress Widget */}
                <div className="bg-[#242424] border border-[#333333] rounded-lg p-4 shadow-[0_8px_20px_rgba(0,0,0,0.18)] flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-2">
                        <span className="text-[10px] font-bold text-[#a0a0a0] uppercase tracking-wider">Automation</span>
                        <Percent className="w-3.5 h-3.5 text-[#8b5cf6]" />
                    </div>
                    <div className="bg-[#333333] rounded-md p-3 my-1.5">
                        <div className="flex justify-between items-baseline mb-1">
                            <span className="text-2xl font-bold text-[#f2f2f2] font-mono leading-none tracking-tight">{data.automationRate}%</span>
                        </div>
                        <div className="w-full bg-[#111111] h-1.5 rounded-full overflow-hidden mt-1">
                            <div 
                                className="bg-[#8b5cf6] h-full rounded-full transition-all duration-500" 
                                style={{ width: `${data.automationRate}%` }}
                            ></div>
                        </div>
                    </div>
                    <span className="text-[9px] font-bold text-[#a0a0a0] uppercase tracking-wider">IVR, App, Web Today</span>
                </div>
            </div>

            {/* Row 3: Operational Latencies & Weather */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <DashboardCard 
                    title="Avg Dispatch Time" 
                    subtitle="Last Hour" 
                    value={`${data.avgDispatchTime} Sec`} 
                    accentColor="#6d9edb" 
                    icon={ShieldCheckIcon} 
                />
                <DashboardCard 
                    title="Avg Pickup Time" 
                    subtitle="Last Hour" 
                    value={formatDuration(data.avgPickupTime)} 
                    accentColor={data.avgPickupTime > 600 ? "#d86666" : "#d6a637"} 
                    icon={MapPin} 
                />
                <DashboardCard 
                    title="Avg POB Time" 
                    subtitle="Last Hour" 
                    value={formatDuration(data.avgPobTime)} 
                    accentColor="#a0a0a0" 
                    icon={Clock} 
                />
                <DashboardCard 
                    title="Avg Fare" 
                    subtitle="Today" 
                    value={`£${data.avgFare}`} 
                    accentColor="#6fbf5f" 
                    icon={DollarSign} 
                />
                <WeatherCard 
                    temp={data.weather.temp} 
                    condition={data.weather.condition} 
                    icon={data.weather.icon} 
                />
            </div>

            {/* Row 4: Analytics, Drivers, Alerts, & Charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* 1. Driver Status (Grouped mini-cards) */}
                <div className="lg:col-span-1">
                    <DriverStatusCard 
                        online={data.driversOnline} 
                        available={data.driversAvailable} 
                        booked={data.driversBooked} 
                        total={data.totalDrivers} 
                    />
                </div>

                {/* 2. Operational Alerts */}
                <div className="lg:col-span-1">
                    <OperationalAlertsCard 
                        lateCount={data.lateCount} 
                        noShowCount={data.noShowCount} 
                        availableDrivers={data.driversAvailable} 
                    />
                </div>

                {/* 3. Payment Split Chart */}
                <div className="lg:col-span-1">
                    <PaymentSplitCard 
                        cash={data.paymentSplit.cash} 
                        card={data.paymentSplit.card} 
                        account={data.paymentSplit.account} 
                    />
                </div>

                {/* 4. Hourly Activity Chart (Spans 2 columns to fit properly on widescreen) */}
                <div className="md:col-span-3 lg:col-span-2">
                    <HourlyTrendCard trend={data.hourlyTrend} />
                </div>
            </div>

        </div>
    );
}

// Simple fallback inline icons to prevent missing symbols compilation issues
function ShieldCheckIcon(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={props.className}
        >
            <path d="M20 13c0 5-3.5 7.5-7.66 9.7a1 1 0 0 1-.68 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 .76-.97l8-2a1 1 0 0 1 .48 0l8 2A1 1 0 0 1 20 6v7z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}
