"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format, subDays, startOfWeek, startOfMonth, startOfToday, endOfToday } from "date-fns";
import { TrendingUp, Users, AlertCircle, Calendar, Download, Building2, Clock } from "lucide-react";

interface ReportData {
    kpis: {
        totalRevenue: number;
        totalJobs: number;
        completedJobs: number;
        cancelledJobs: number;
        cancellationRate: number;
        avgFare: number;
        totalWaitRevenue: number;
    };
    timeSeries: Array<{ date: string; revenue: number; jobs: number }>;
    driverPerformance: Array<{ driverId: string; name: string; callsign: string; revenue: number; jobs: number }>;
    accountPerformance: Array<{ accountId: string; name: string; code: string; revenue: number; jobs: number }>;
    shiftData: Array<{ hour: number; label: string; jobs: number }>;
    meta: {
        startDate: string;
        endDate: string;
    }
}

export default function ReportsPage() {
    const [data, setData] = useState<ReportData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Date Range Presets
    const [dateRange, setDateRange] = useState("30d");

    const fetchReports = async (range: string) => {
        setLoading(true);
        setError(null);
        try {
            let start = "";
            let end = new Date().toISOString(); // End is usually now

            const today = new Date();
            if (range === "today") {
                start = startOfToday().toISOString();
            } else if (range === "7d") {
                start = subDays(today, 7).toISOString();
            } else if (range === "30d") {
                start = subDays(today, 30).toISOString();
            } else if (range === "month") {
                start = startOfMonth(today).toISOString();
            } else if (range === "all") {
                start = subDays(today, 365).toISOString(); // Simplified 'all time' to 1 year for rendering safety
            }

            const res = await fetch(`/api/reports?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`);

            if (!res.ok) throw new Error("Failed to fetch reports");

            const json = await res.json();
            setData(json);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports(dateRange);
    }, [dateRange]);

    const exportToCSV = (tableName: string, rows: any[]) => {
        if (!rows || rows.length === 0) return;
        const keys = Object.keys(rows[0]);
        const csv = [
            keys.join(","),
            ...rows.map(row => keys.map(k => `"${row[k]}"`).join(","))
        ].join("\\n");

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `report_${tableName}_${format(new Date(), 'yyyyMMdd')}.csv`;
        a.click();
    };

    // Custom Tooltip for charts
    const formatCurrency = (val: number) => `£${val.toFixed(2)}`;

    return (
        <div className="flex h-full flex-col bg-zinc-950 p-6 space-y-6 overflow-y-auto w-full">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b border-zinc-800 pb-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Reports & Analytics</h1>
                    <p className="text-zinc-400 text-sm">Comprehensive platform metrics showing Revenue, Operations, and Fleet Performance.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-md flex items-center px-3 py-1.5 shadow-sm">
                        <Calendar className="w-4 h-4 text-zinc-400 mr-2" />
                        <Select value={dateRange} onValueChange={setDateRange}>
                            <SelectTrigger className="w-[180px] h-8 border-0 bg-transparent shadow-none focus:ring-0 text-white font-medium">
                                <SelectValue placeholder="Select timeframe" />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-zinc-800 text-white">
                                <SelectItem value="today">Today</SelectItem>
                                <SelectItem value="7d">Last 7 Days</SelectItem>
                                <SelectItem value="month">This Month</SelectItem>
                                <SelectItem value="30d">Last 30 Days</SelectItem>
                                <SelectItem value="all">Last 12 Months</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {error && (
                <Alert variant="destructive" className="bg-red-500/10 border-red-500/20 text-red-400">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <AlertTitle>Analytics Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {loading && !data ? (
                <div className="flex-1 flex items-center justify-center min-h-[400px]">
                    <div className="flex flex-col items-center gap-4 text-zinc-500">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                        <p>Aggregating millions of data points...</p>
                    </div>
                </div>
            ) : data && (
                <>
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card className="bg-zinc-950/50 border-zinc-800 shadow-md">
                            <CardContent className="p-6">
                                <div className="flex flex-col space-y-2">
                                    <span className="text-sm font-medium text-zinc-400">Total Revenue Generated</span>
                                    <span className="text-4xl font-black text-white tracking-tight">£{data.kpis.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    <span className="text-xs text-emerald-500 pt-1 flex items-center"><TrendingUp className="w-3 h-3 mr-1" /> Accurately scaled</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-950/50 border-zinc-800 shadow-md">
                            <CardContent className="p-6">
                                <div className="flex flex-col space-y-2">
                                    <span className="text-sm font-medium text-zinc-400">Platform Jobs</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-4xl font-black text-indigo-400 tracking-tight">{data.kpis.totalJobs.toLocaleString()}</span>
                                        <span className="text-sm text-zinc-500">dispatched</span>
                                    </div>
                                    <span className="text-xs text-zinc-500 pt-1 border-t border-zinc-800/50 mt-2">{data.kpis.completedJobs} Completed / {data.kpis.cancelledJobs} Blocked</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-950/50 border-zinc-800 shadow-md">
                            <CardContent className="p-6">
                                <div className="flex flex-col space-y-2">
                                    <span className="text-sm font-medium text-zinc-400">Average Fare</span>
                                    <span className="text-4xl font-black text-emerald-400 tracking-tight">£{data.kpis.avgFare.toFixed(2)}</span>
                                    <span className="text-xs text-zinc-500 pt-1 w-full truncate">Includes wait times (£{data.kpis.totalWaitRevenue.toFixed(0)} total)</span>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-zinc-950/50 border-zinc-800 shadow-md">
                            <CardContent className="p-6">
                                <div className="flex flex-col space-y-2">
                                    <span className="text-sm font-medium text-zinc-400">Cancellation Rate</span>
                                    <span className="text-4xl font-black text-rose-400 tracking-tight">{(data.kpis.cancellationRate * 100).toFixed(1)}%</span>
                                    <span className="text-xs text-zinc-500 pt-1">Percent of bookings abandoned</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Main Tabbed Layout */}
                    <Tabs defaultValue="overview" className="flex-1 flex flex-col pt-4">
                        <TabsList className="bg-zinc-900 border border-zinc-800 self-start p-1 h-auto mb-6 rounded-md">
                            <TabsTrigger value="overview" className="py-2 px-6 data-[state=active]:bg-indigo-600 data-[state=active]:text-white text-zinc-400 font-medium">
                                <TrendingUp className="w-4 h-4 mr-2" /> Revenue Overview
                            </TabsTrigger>
                            <TabsTrigger value="drivers" className="py-2 px-6 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 font-medium">
                                <Users className="w-4 h-4 mr-2" /> Driver Performance
                            </TabsTrigger>
                            <TabsTrigger value="accounts" className="py-2 px-6 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 font-medium">
                                <Building2 className="w-4 h-4 mr-2" /> Account Billing
                            </TabsTrigger>
                            <TabsTrigger value="shifts" className="py-2 px-6 data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 font-medium">
                                <Clock className="w-4 h-4 mr-2" /> Shift Analysis
                            </TabsTrigger>
                        </TabsList>

                        {/* TAB 1: OVERVIEW CHARTS */}
                        <TabsContent value="overview" className="flex-1 m-0 space-y-6">
                            <Card className="bg-zinc-950 border-zinc-800 shadow-xl">
                                <CardHeader className="border-b border-zinc-800/60 pb-4">
                                    <CardTitle className="text-lg font-bold text-white flex justify-between">
                                        Time Series: Daily Revenue
                                        <Button variant="ghost" size="sm" className="h-8 text-indigo-400" onClick={() => exportToCSV('daily_revenue', data.timeSeries)}>
                                            <Download className="w-4 h-4 mr-2" /> CSV
                                        </Button>
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={data.timeSeries} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                            <XAxis dataKey="date" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} tickMargin={10} minTickGap={30} />
                                            <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 12 }} tickFormatter={formatCurrency} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                                                itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                                                formatter={(value: number) => [`£${value.toFixed(2)}`, 'Revenue']}
                                            />
                                            <Line type="monotone" dataKey="revenue" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: "#6366f1", strokeWidth: 0 }} activeDot={{ r: 6, fill: "#818cf8" }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                            <Card className="bg-zinc-950 border-zinc-800 shadow-xl">
                                <CardHeader className="border-b border-zinc-800/60 pb-4">
                                    <CardTitle className="text-lg font-bold text-white flex justify-between">
                                        Time Series: Job Volume
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 h-[300px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.timeSeries} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                            <XAxis dataKey="date" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} tickMargin={10} minTickGap={30} />
                                            <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                                                formatter={(value: number) => [value, 'Completed Jobs']}
                                                cursor={{ fill: '#27272a', opacity: 0.4 }}
                                            />
                                            <Bar dataKey="jobs" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* TAB 2: DRIVER PERFORMANCE */}
                        <TabsContent value="drivers" className="flex-1 m-0">
                            <Card className="bg-zinc-950 border-zinc-800 shadow-xl h-full flex flex-col">
                                <CardHeader className="border-b border-zinc-800/60 flex flex-row items-center justify-between pb-4">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-white">Driver Leaderboard</CardTitle>
                                        <CardDescription className="text-zinc-400">Ranked by total revenue generated in the selected period.</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-8 text-indigo-400" onClick={() => exportToCSV('driver_performance', data.driverPerformance)}>
                                        <Download className="w-4 h-4 mr-2" /> Export
                                    </Button>
                                </CardHeader>
                                <div className="overflow-auto flex-1 p-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-zinc-900/50 sticky top-0">
                                            <tr>
                                                <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">Rank</th>
                                                <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">Driver Name</th>
                                                <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">Callsign</th>
                                                <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800 text-right">Completed Jobs</th>
                                                <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800 text-right">Total Generated</th>
                                                <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800 text-right">Avg / Job</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.driverPerformance.map((driver, idx) => (
                                                <tr key={driver.driverId} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                                                    <td className="py-4 px-4 font-mono text-zinc-500">#{idx + 1}</td>
                                                    <td className="py-4 px-4 font-bold text-white">{driver.name}</td>
                                                    <td className="py-4 px-4 text-zinc-400"><span className="bg-zinc-800 px-2 py-0.5 rounded text-xs">{driver.callsign}</span></td>
                                                    <td className="py-4 px-4 text-right text-indigo-300 font-medium">{driver.jobs}</td>
                                                    <td className="py-4 px-4 text-right font-bold text-emerald-400">£{driver.revenue.toFixed(2)}</td>
                                                    <td className="py-4 px-4 text-right text-zinc-400 text-sm">£{(driver.revenue / driver.jobs).toFixed(2)}</td>
                                                </tr>
                                            ))}
                                            {data.driverPerformance.length === 0 && (
                                                <tr><td colSpan={6} className="text-center py-10 text-zinc-500">No driver data for this period.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* TAB 3: ACCOUNT BILLING */}
                        <TabsContent value="accounts" className="flex-1 m-0">
                            <Card className="bg-zinc-950 border-zinc-800 shadow-xl h-full flex flex-col">
                                <CardHeader className="border-b border-zinc-800/60 flex flex-row items-center justify-between pb-4">
                                    <div>
                                        <CardTitle className="text-lg font-bold text-white">Corporate Account Spending</CardTitle>
                                        <CardDescription className="text-zinc-400">Total volume and billing size per B2B Client.</CardDescription>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-8 text-amber-400" onClick={() => exportToCSV('account_billing', data.accountPerformance)}>
                                        <Download className="w-4 h-4 mr-2" /> Export
                                    </Button>
                                </CardHeader>
                                <div className="overflow-auto flex-1 p-0">
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-zinc-900/50 sticky top-0">
                                            <tr>
                                                <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">Account Name</th>
                                                <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800">Code</th>
                                                <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800 text-right">Trips Requested</th>
                                                <th className="py-3 px-4 font-bold text-xs uppercase tracking-wider text-zinc-400 border-b border-zinc-800 text-right">Total Net Spend</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {data.accountPerformance.map((account) => (
                                                <tr key={account.accountId} className="border-b border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                                                    <td className="py-4 px-4 font-bold text-white">{account.name}</td>
                                                    <td className="py-4 px-4 text-zinc-400 font-mono text-sm">{account.code}</td>
                                                    <td className="py-4 px-4 text-right text-indigo-300 font-medium">{account.jobs}</td>
                                                    <td className="py-4 px-4 text-right font-bold text-amber-400 text-lg">£{account.revenue.toFixed(2)}</td>
                                                </tr>
                                            ))}
                                            {data.accountPerformance.length === 0 && (
                                                <tr><td colSpan={4} className="text-center py-10 text-zinc-500">No corporate account jobs for this period.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </TabsContent>

                        {/* TAB 4: SHIFT ANALYSIS */}
                        <TabsContent value="shifts" className="flex-1 m-0 space-y-6">
                            <Alert className="bg-indigo-500/10 border-indigo-500/20 text-indigo-300">
                                <Clock className="h-4 w-4 shrink-0" />
                                <AlertTitle>Operational Insight</AlertTitle>
                                <AlertDescription>Use this heatmap to identify peak demand hours. Ensure optimal driver coverage during the highest volume times shown below.</AlertDescription>
                            </Alert>

                            <Card className="bg-zinc-950 border-zinc-800 shadow-xl">
                                <CardHeader className="border-b border-zinc-800/60 pb-4 flex flex-row items-center justify-between">
                                    <CardTitle className="text-lg font-bold text-white">Job Volume by Hour of Day</CardTitle>
                                    <Button variant="ghost" size="sm" className="h-8 text-indigo-400" onClick={() => exportToCSV('shift_analysis', data.shiftData)}>
                                        <Download className="w-4 h-4 mr-2" /> CSV
                                    </Button>
                                </CardHeader>
                                <CardContent className="pt-6 h-[400px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.shiftData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                            <XAxis dataKey="label" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
                                            <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
                                            <Tooltip
                                                contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                                                formatter={(value: number) => [`${value} Rides`, 'Frequency']}
                                                labelFormatter={(label) => `Hour block starting: ${label}`}
                                                cursor={{ fill: '#27272a', opacity: 0.4 }}
                                            />
                                            <Bar dataKey="jobs" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </>
            )}
        </div>
    );
}
