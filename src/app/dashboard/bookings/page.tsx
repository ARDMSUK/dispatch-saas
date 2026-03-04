'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, Navigation, User, Car } from 'lucide-react';
import { toast } from 'sonner';

export default function BookingsPage() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchJobs();
    }, []);

    const fetchJobs = async () => {
        try {
            const res = await fetch('/api/jobs');
            if (res.ok) {
                const data = await res.json();
                setJobs(data);
            } else {
                toast.error("Failed to load bookings");
            }
        } catch (error) {
            toast.error("An error occurred loading bookings");
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-zinc-500 hover:bg-zinc-600 text-slate-900';
            case 'DISPATCHED': return 'bg-blue-700 hover:bg-blue-800 text-black';
            case 'EN_ROUTE': return 'bg-blue-500 hover:bg-blue-600 text-slate-900';
            case 'ARRIVED': return 'bg-blue-600 hover:bg-blue-700 text-slate-900';
            case 'POB': return 'bg-purple-500 hover:bg-purple-600 text-slate-900';
            case 'COMPLETED': return 'bg-emerald-500 hover:bg-emerald-600 text-slate-900';
            case 'CANCELLED': return 'bg-red-500 hover:bg-red-600 text-slate-900';
            case 'NO_SHOW': return 'bg-orange-500 hover:bg-orange-600 text-slate-900';
            default: return 'bg-slate-300 text-slate-900';
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="text-slate-400 animate-pulse text-lg font-medium">Loading bookings...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">All Bookings</h1>
                    <p className="text-slate-500 mt-1">Manage and view all recent system bookings.</p>
                </div>
                <Button variant="outline" onClick={fetchJobs} className="border-slate-200 text-slate-900 hover:bg-slate-200">
                    Refresh List
                </Button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-slate-100">
                {jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <Clock className="h-12 w-12 text-slate-500 mb-4" />
                        <h3 className="text-xl font-bold text-slate-600">No Bookings Found</h3>
                        <p className="text-slate-400 mt-2">There are currently no bookings in the system.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-slate-100 z-10 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="p-4 rounded-tl-xl w-32">Ref / Date</th>
                                <th className="p-4">Customer</th>
                                <th className="p-4">Route</th>
                                <th className="p-4 w-40">Status</th>
                                <th className="p-4 w-48">Driver & Fare</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 align-top">
                            {jobs.map((job) => (
                                <tr key={job.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="p-4">
                                        <div className="text-sm font-bold text-slate-900 mb-1">
                                            #{job.id.toString().padStart(5, '0')}
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            {new Date(job.pickupTime).toLocaleString('en-GB', {
                                                day: '2-digit', month: 'short',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-slate-400 shrink-0" />
                                            <div>
                                                <div className="text-sm font-medium text-slate-900">{job.passengerName}</div>
                                                <div className="text-xs text-slate-400 font-mono mt-0.5">{job.passengerPhone}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <Navigation className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                                <div className="text-sm text-slate-600 line-clamp-2">{job.pickupAddress}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <MapPin className="h-4 w-4 text-blue-700 shrink-0 mt-0.5" />
                                                <div className="text-sm text-slate-600 line-clamp-2">{job.dropoffAddress}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <Badge className={`font-bold tracking-tight shadow-sm ${getStatusColor(job.status)}`}>
                                            {job.status.replace('_', ' ')}
                                        </Badge>
                                        {job.returnBooking && (
                                            <Badge variant="outline" className="mt-2 text-[10px] border-blue-700/30 text-blue-600 bg-blue-700/5 block w-fit">
                                                Return Trip
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col h-full justify-between gap-3">
                                            {job.driver ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {job.driver.callsign?.substring(0, 2) || <Car className="h-3 w-3" />}
                                                    </div>
                                                    <div className="text-sm text-slate-600 max-w-[120px] truncate">
                                                        {job.driver.name}
                                                    </div>
                                                </div>
                                            ) : job.preAssignedDriver ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-blue-700/20 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {job.preAssignedDriver.callsign?.substring(0, 2)}
                                                    </div>
                                                    <div className="text-sm text-slate-500 max-w-[120px] truncate italic">
                                                        {job.preAssignedDriver.name} (Designated)
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-slate-400 italic flex items-center gap-2">
                                                    <Car className="h-4 w-4 opacity-50" /> Unassigned
                                                </div>
                                            )}

                                            <div className="flex items-baseline gap-1.5 mt-auto">
                                                <span className="text-lg font-mono font-bold text-slate-900">
                                                    £{job.fare ? job.fare.toFixed(2) : '0.00'}
                                                </span>
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                    {job.paymentType}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
