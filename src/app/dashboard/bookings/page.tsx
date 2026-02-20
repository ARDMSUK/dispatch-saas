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
            case 'PENDING': return 'bg-zinc-500 hover:bg-zinc-600 text-white';
            case 'DISPATCHED': return 'bg-amber-500 hover:bg-amber-600 text-black';
            case 'EN_ROUTE': return 'bg-blue-500 hover:bg-blue-600 text-white';
            case 'ARRIVED': return 'bg-blue-600 hover:bg-blue-700 text-white';
            case 'POB': return 'bg-purple-500 hover:bg-purple-600 text-white';
            case 'COMPLETED': return 'bg-emerald-500 hover:bg-emerald-600 text-white';
            case 'CANCELLED': return 'bg-red-500 hover:bg-red-600 text-white';
            case 'NO_SHOW': return 'bg-orange-500 hover:bg-orange-600 text-white';
            default: return 'bg-zinc-700 text-white';
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center p-8">
                <div className="text-zinc-500 animate-pulse text-lg font-medium">Loading bookings...</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-zinc-950 p-6">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">All Bookings</h1>
                    <p className="text-zinc-400 mt-1">Manage and view all recent system bookings.</p>
                </div>
                <Button variant="outline" onClick={fetchJobs} className="border-white/10 text-white hover:bg-white/5">
                    Refresh List
                </Button>
            </div>

            <div className="flex-1 overflow-auto rounded-xl border border-white/10 bg-zinc-900/50">
                {jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-center">
                        <Clock className="h-12 w-12 text-zinc-600 mb-4" />
                        <h3 className="text-xl font-bold text-zinc-300">No Bookings Found</h3>
                        <p className="text-zinc-500 mt-2">There are currently no bookings in the system.</p>
                    </div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="sticky top-0 bg-zinc-900 z-10 text-xs font-bold text-zinc-500 uppercase tracking-wider border-b border-white/10">
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
                                        <div className="text-sm font-bold text-white mb-1">
                                            #{job.id.toString().padStart(5, '0')}
                                        </div>
                                        <div className="text-xs text-zinc-400">
                                            {new Date(job.pickupTime).toLocaleString('en-GB', {
                                                day: '2-digit', month: 'short',
                                                hour: '2-digit', minute: '2-digit'
                                            })}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-zinc-500 shrink-0" />
                                            <div>
                                                <div className="text-sm font-medium text-white">{job.passengerName}</div>
                                                <div className="text-xs text-zinc-500 font-mono mt-0.5">{job.passengerPhone}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="space-y-2">
                                            <div className="flex gap-2">
                                                <Navigation className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                                <div className="text-sm text-zinc-300 line-clamp-2">{job.pickupAddress}</div>
                                            </div>
                                            <div className="flex gap-2">
                                                <MapPin className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                                <div className="text-sm text-zinc-300 line-clamp-2">{job.dropoffAddress}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <Badge className={`font-bold tracking-tight shadow-sm ${getStatusColor(job.status)}`}>
                                            {job.status.replace('_', ' ')}
                                        </Badge>
                                        {job.returnBooking && (
                                            <Badge variant="outline" className="mt-2 text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/5 block w-fit">
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
                                                    <div className="text-sm text-zinc-300 max-w-[120px] truncate">
                                                        {job.driver.name}
                                                    </div>
                                                </div>
                                            ) : job.preAssignedDriver ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-500 flex items-center justify-center text-xs font-bold shrink-0">
                                                        {job.preAssignedDriver.callsign?.substring(0, 2)}
                                                    </div>
                                                    <div className="text-sm text-zinc-400 max-w-[120px] truncate italic">
                                                        {job.preAssignedDriver.name} (Designated)
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-sm text-zinc-500 italic flex items-center gap-2">
                                                    <Car className="h-4 w-4 opacity-50" /> Unassigned
                                                </div>
                                            )}

                                            <div className="flex items-baseline gap-1.5 mt-auto">
                                                <span className="text-lg font-mono font-bold text-white">
                                                    £{job.fare ? job.fare.toFixed(2) : '0.00'}
                                                </span>
                                                <span className="text-[10px] font-bold text-zinc-500 uppercase">
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
