'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { toast } from 'sonner';
import { Phone, Users, ShieldAlert, Clock, RefreshCw, Radio, UserCheck, Calendar } from 'lucide-react';
import { format, subDays, startOfToday, endOfToday } from 'date-fns';

interface Operator {
    id: string;
    name: string;
    email: string;
    role: string;
    sipExtension: string | null;
    presenceStatus: string;
    lastPresenceUpdate: string | null;
    activeCall: { phone: string; createdAt: string } | null;
}

interface OperatorPerformance {
    userId: string;
    name: string;
    sipExtension: string | null;
    callsAnswered: number;
    totalTalkTime: number;
    avgTalkTime: number;
    bookingsEntered: number;
    revenueGenerated: number;
}

interface HourlyTimeline {
    hour: number;
    label: string;
    incoming: number;
    answered: number;
    missed: number;
}

interface CallCenterKPIs {
    totalCalls: number;
    answeredCalls: number;
    missedCalls: number;
    missedCallRate: number;
    avgSpeedOfAnswer: number;
    avgHandleTime: number;
    totalTalkTime: number;
}

export default function OperatorPerformanceDashboard() {
    const [kpis, setKpis] = useState<CallCenterKPIs | null>(null);
    const [operators, setOperators] = useState<Operator[]>([]);
    const [performance, setPerformance] = useState<OperatorPerformance[]>([]);
    const [timeline, setTimeline] = useState<HourlyTimeline[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [myUser, setMyUser] = useState<Operator | null>(null);
    
    // Live call duration ticker state
    const [secondsTicker, setSecondsTicker] = useState(0);

    const triggerRefresh = useCallback(() => setRefreshTrigger(p => p + 1), []);

    // 1. Ticker for active calls
    useEffect(() => {
        const interval = setInterval(() => {
            setSecondsTicker(s => s + 1);
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    // 2. Fetch Dashboard Analytics Data
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const start = startOfToday().toISOString();
                const end = endOfToday().toISOString();
                
                const res = await fetch(`/api/reports/operator?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`);
                if (!res.ok) throw new Error("Failed to load operator stats");
                
                const data = await res.json();
                setKpis(data.kpis);
                setOperators(data.operatorDirectory);
                setPerformance(data.operatorPerformance);
                setTimeline(data.hourlyTimeline);
                
                // Find current logged in user inside operator grid to let them modify their own presence status
                const currentSessionRes = await fetch('/api/settings/organization');
                if (currentSessionRes.ok) {
                    // Check settings or user session endpoint, fallback to matching email or first in list
                    // For safety, look up matching agent extension later or let UI pick first matched user with profile
                }
            } catch (err) {
                console.error(err);
                toast.error("Failed to load call center reports");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
        
        // Refresh API details every 30 seconds for non-realtime statistics (e.g. hourly timeline, totals)
        const poll = setInterval(() => {
            fetchDashboardData();
        }, 30000);

        return () => clearInterval(poll);
    }, [refreshTrigger]);

    // 3. Supabase WebSocket Listener for Operator Status Changes
    useEffect(() => {
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) return;

        try {
            const supabase = createClient();
            const channel = supabase.channel('operator-presence');

            channel.on('broadcast', { event: 'status-change' }, (payload: any) => {
                const data = payload.payload;
                if (data && data.userId) {
                    setOperators(prev => {
                        return prev.map(op => {
                            if (op.id === data.userId) {
                                return {
                                    ...op,
                                    presenceStatus: data.status,
                                    lastPresenceUpdate: new Date().toISOString(),
                                    activeCall: data.status === 'BUSY' ? {
                                        phone: data.activeCallPhone || 'Active Call',
                                        createdAt: new Date().toISOString()
                                    } : null
                                };
                            }
                            return op;
                        });
                    });
                    
                    // Trigger a silent KPI update in background to count call volumes
                    setRefreshTrigger(p => p + 1);
                }
            });

            channel.subscribe();
            
            return () => {
                supabase.removeChannel(channel);
            };
        } catch (err) {
            console.error('[WebSockets] Setup failed:', err);
        }
    }, []);

    // 4. Manual Presence Trigger
    const handlePresenceChange = async (newStatus: string) => {
        try {
            const res = await fetch('/api/user/presence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Presence updated to ${newStatus}`);
                triggerRefresh();
            } else {
                toast.error("Failed to update presence");
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to connect to presence service");
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'ONLINE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'AWAY': return 'bg-indigo-600/10 text-indigo-600 border-indigo-600/20';
            case 'BUSY': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
            case 'OFFLINE': return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const formatSeconds = (totalSeconds: number) => {
        const mins = Math.floor(totalSeconds / 60);
        const secs = Math.floor(totalSeconds % 60);
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getLiveCallDuration = (createdAtStr: string) => {
        const start = new Date(createdAtStr).getTime();
        const diffSec = Math.max(0, Math.floor((Date.now() - start) / 1000));
        return formatSeconds(diffSec);
    };

    return (
        <div className="flex h-full flex-col bg-background text-foreground p-6 space-y-6 overflow-y-auto w-full font-sans">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-border pb-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-2">
                        <Radio className="w-8 h-8 text-primary animate-pulse shrink-0" />
                        Call Center Floor & Operator Performance
                    </h1>
                    <p className="text-muted-foreground text-sm">Real-time dispatcher statuses, talk-times, active phone lines, and console bookings.</p>
                </div>

                <div className="flex items-center gap-3 bg-card border border-border rounded-lg p-2.5 shadow-sm">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">My Status:</span>
                    <Select onValueChange={handlePresenceChange}>
                        <SelectTrigger className="w-[140px] h-8 bg-background border-input text-foreground font-semibold text-xs rounded">
                            <SelectValue placeholder="Toggle Presence" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-border text-foreground">
                            <SelectItem value="ONLINE">🟢 Online</SelectItem>
                            <SelectItem value="AWAY">🟡 Away</SelectItem>
                            <SelectItem value="OFFLINE">⚪ Offline</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={triggerRefresh}>
                        <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4 text-muted-foreground">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        <p className="font-medium">Connecting to VoIP stream...</p>
                    </div>
                </div>
            ) : kpis && (
                <>
                    {/* Live Floor Status Directory */}
                    <div className="space-y-3">
                        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" /> Live Agent Presence
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {operators.map((op) => (
                                <Card key={op.id} className="bg-card border-border hover:border-primary/30 transition-all shadow-md">
                                    <CardContent className="p-4 flex flex-col justify-between h-36">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="font-bold text-base text-foreground leading-tight">{op.name}</div>
                                                <div className="text-xs font-mono text-muted-foreground mt-0.5">{op.role}</div>
                                            </div>
                                            <Badge variant="outline" className={`font-black text-[9px] uppercase px-2 py-0.5 rounded-sm ${getStatusStyle(op.presenceStatus)}`}>
                                                {op.presenceStatus}
                                            </Badge>
                                        </div>

                                        <div className="mt-3 pt-3 border-t border-border flex items-center justify-between text-xs">
                                            {op.presenceStatus === 'BUSY' && op.activeCall ? (
                                                <div className="bg-rose-500/10 text-rose-500 font-bold px-2 py-1 rounded border border-rose-500/20 w-full flex items-center justify-between animate-pulse">
                                                    <span className="flex items-center gap-1.5">
                                                        <Phone className="w-3.5 h-3.5" /> {op.activeCall.phone}
                                                    </span>
                                                    <span className="font-mono text-[11px]">{getLiveCallDuration(op.activeCall.createdAt)}</span>
                                                </div>
                                            ) : (
                                                <div className="text-muted-foreground flex justify-between items-center w-full">
                                                    <span>Ext: <span className="font-mono font-bold text-foreground">{op.sipExtension || 'N/A'}</span></span>
                                                    <span className="text-[10px]">
                                                        {op.lastPresenceUpdate ? `Updated: ${format(new Date(op.lastPresenceUpdate), 'HH:mm')}` : ''}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                            {operators.length === 0 && (
                                <div className="col-span-full text-center py-8 text-muted-foreground bg-card border border-border rounded-lg">No active dispatch agents found.</div>
                            )}
                        </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-card border-border shadow-md">
                            <CardContent className="p-6">
                                <div className="flex flex-col space-y-1">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Total Calls Logged</span>
                                    <span className="text-4xl font-black text-foreground tracking-tight">{kpis.totalCalls}</span>
                                    <span className="text-[11px] text-emerald-500 font-medium pt-1 flex items-center gap-1">
                                        <UserCheck className="w-3 h-3" /> {kpis.answeredCalls} Answered
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-card border-border shadow-md">
                            <CardContent className="p-6">
                                <div className="flex flex-col space-y-1">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Abandoned Calls</span>
                                    <span className="text-4xl font-black text-rose-500 tracking-tight">{kpis.missedCalls}</span>
                                    <span className="text-[11px] text-muted-foreground pt-1">
                                        cancellation rate: <span className="font-bold text-rose-500">{(kpis.missedCallRate * 100).toFixed(1)}%</span>
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-card border-border shadow-md">
                            <CardContent className="p-6">
                                <div className="flex flex-col space-y-1">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Avg Speed of Answer</span>
                                    <span className="text-4xl font-black text-primary tracking-tight">{kpis.avgSpeedOfAnswer.toFixed(1)}s</span>
                                    <span className="text-[11px] text-muted-foreground pt-1">Average time elapsed before pickup</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-card border-border shadow-md">
                            <CardContent className="p-6">
                                <div className="flex flex-col space-y-1">
                                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Average Talk Time</span>
                                    <span className="text-4xl font-black text-indigo-600 tracking-tight">{formatSeconds(kpis.avgHandleTime)}</span>
                                    <span className="text-[11px] text-muted-foreground pt-1">Average duration per answered call</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Operational Timelines & Agent Breakdowns */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* CHART 1: HOURLY CALLS */}
                        <Card className="bg-card border-border shadow-xl">
                            <CardHeader className="border-b border-border pb-4">
                                <CardTitle className="text-base font-bold text-foreground">Inbound Call Timeline (Today)</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Volume distribution of incoming calls over 24 hours.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={timeline} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                        <XAxis dataKey="label" stroke="var(--muted-foreground)" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} tickMargin={10} minTickGap={30} />
                                        <YAxis stroke="var(--muted-foreground)" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                                            itemStyle={{ fontSize: 12 }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                                        <Line type="monotone" name="Incoming" dataKey="incoming" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                                        <Line type="monotone" name="Answered" dataKey="answered" stroke="#10b981" strokeWidth={2} dot={false} />
                                        <Line type="monotone" name="Missed" dataKey="missed" stroke="#f43f5e" strokeWidth={2} dot={false} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        {/* CHART 2: AGENT PERFORMANCE */}
                        <Card className="bg-card border-border shadow-xl">
                            <CardHeader className="border-b border-border pb-4">
                                <CardTitle className="text-base font-bold text-foreground">Agent Performance (Today)</CardTitle>
                                <CardDescription className="text-xs text-muted-foreground">Comparison of answered calls vs bookings entered.</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-6 h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={performance} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                                        <XAxis dataKey="name" stroke="var(--muted-foreground)" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                                        <YAxis stroke="var(--muted-foreground)" tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)', borderRadius: '8px', color: 'var(--foreground)' }}
                                            itemStyle={{ fontSize: 12 }}
                                        />
                                        <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                                        <Bar name="Calls Answered" dataKey="callsAnswered" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                        <Bar name="Bookings Entered" dataKey="bookingsEntered" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Operator Leaderboard table */}
                    <Card className="bg-card border-border shadow-xl">
                        <CardHeader className="border-b border-border pb-4">
                            <CardTitle className="text-base font-bold text-foreground">Operator Performance Log</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground">Historical talk times and job booking entries for this period.</CardDescription>
                        </CardHeader>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-muted/30">
                                    <tr>
                                        <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border">Operator</th>
                                        <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border text-center">Ext</th>
                                        <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border text-center">Calls Handled</th>
                                        <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border text-center">Total Talk Time</th>
                                        <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border text-center">Avg Talk Time (AHT)</th>
                                        <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border text-center">Bookings Entered</th>
                                        <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-muted-foreground border-b border-border text-right">Revenue Generated</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {performance.map((op) => (
                                        <tr key={op.userId} className="border-b border-border hover:bg-muted/10 transition-colors">
                                            <td className="py-4 px-4 font-bold text-foreground">{op.name}</td>
                                            <td className="py-4 px-4 text-center font-mono font-medium text-muted-foreground">{op.sipExtension || '-'}</td>
                                            <td className="py-4 px-4 text-center text-primary font-bold">{op.callsAnswered}</td>
                                            <td className="py-4 px-4 text-center text-muted-foreground font-medium">{formatSeconds(op.totalTalkTime)}</td>
                                            <td className="py-4 px-4 text-center text-muted-foreground font-medium">{formatSeconds(op.avgTalkTime)}</td>
                                            <td className="py-4 px-4 text-center text-indigo-400 font-bold">{op.bookingsEntered}</td>
                                            <td className="py-4 px-4 text-right text-emerald-500 font-bold">£{op.revenueGenerated.toFixed(2)}</td>
                                        </tr>
                                    ))}
                                    {performance.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="text-center py-10 text-muted-foreground">No operator activity logged.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </>
            )}
        </div>
    );
}
