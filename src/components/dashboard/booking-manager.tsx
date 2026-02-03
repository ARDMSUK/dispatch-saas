'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, MapPin, Calendar as CalendarIcon, Clock, Filter, ChevronDown, User, Phone, Briefcase, Car, MoreVertical, Edit, Trash2, CheckCircle, XCircle, AlertCircle, Play, Ban, RefreshCw, UserX, Send } from "lucide-react";
import { toast } from 'sonner';
import {
    differenceInMinutes, parseISO, isToday, isTomorrow, isThisWeek, isSameMonth,
    isAfter, startOfDay, endOfDay, isWithinInterval, addDays
} from 'date-fns';
import { EditBookingDialog } from './edit-booking-dialog';
import { DesignateDriverDialog } from './designate-driver-dialog';

interface Job {
    id: number;
    pickupAddress: string;
    dropoffAddress: string;
    passengerName: string;
    passengerPhone: string;
    pickupTime: string;
    vehicleType: string;
    status: 'PENDING' | 'UNASSIGNED' | 'DISPATCHED' | 'EN_ROUTE' | 'POB' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
    fare: number;
    returnBooking?: boolean;
    notes?: string;
    flightNumber?: string;
    passengers: number;
    luggage: number;
    paymentType: string;
    preAssignedDriver?: { id: string; name: string; callsign: string }; // Populated from API
    driver?: { id: string; name: string; callsign: string }; // Populated from API
    driverInstructions?: string;
    isPrebooked: boolean;
    isReturn: boolean;
    returnJobId?: number;
    originalJobId?: number;
    bookingRef?: string;
    companyName?: string;
    accountRef?: string;
    pricePaid?: number;
    paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
    commission?: number;
    driverPayment?: number;
    driverPaymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL';
    createdAt: string;
    updatedAt: string;
}


interface BookingManagerProps {
    onSelectJob: (job: Job) => void;
    selectedJobId?: number;
    refreshTrigger: number;
}

export function BookingManager({ onSelectJob, selectedJobId, refreshTrigger }: BookingManagerProps) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('PENDING_NOW');

    // Future Filter State
    const [futureFilter, setFutureFilter] = useState('TOMORROW');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    // Edit State
    const [editJob, setEditJob] = useState<Job | null>(null);
    const [editOpen, setEditOpen] = useState(false);

    // Designate State
    const [designateJob, setDesignateJob] = useState<Job | null>(null);
    const [designateOpen, setDesignateOpen] = useState(false);

    useEffect(() => {
        fetchJobs(); // Initial load

        const interval = setInterval(() => {
            fetchJobs(false); // Silent background refresh
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [refreshTrigger]);

    const fetchJobs = async (showLoading = true) => {
        if (showLoading) setLoading(true);
        try {
            const res = await fetch('/api/jobs');
            if (res.ok) {
                const data = await res.json();
                setJobs(data);
            }
        } catch (error) {
            console.error("Failed to fetch jobs", error);
            // Don't toast on silent refresh failure to avoid annoyance
            if (showLoading) toast.error("Failed to load bookings");
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleStatusUpdate = async (jobId: number, newStatus: string) => {
        try {
            const res = await fetch(`/api/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                toast.success(`Job status updated to ${newStatus}`);

                if (newStatus === 'COMPLETED') {
                    handleSendNotification('JOB_COMPLETED', jobId);
                }

                fetchJobs();
            } else {
                toast.error("Failed to update status");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error updating status");
        }
    };


    const handleSendNotification = async (type: 'CONFIRMATION' | 'DRIVER_ASSIGNED' | 'JOB_COMPLETED', bookingId: number, driverId?: string) => {
        try {
            const res = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type, bookingId, driverId })
            });
            if (res.ok) {
                toast.success(`${type} email sent successfully`);
            } else {
                toast.error(`Failed to send ${type} email`);
            }
        } catch (error) {
            console.error("Notification Error", error);
            toast.error("Error sending notification");
        }
    };

    const handleManualDispatch = async (job: Job) => {
        if (!job.preAssignedDriver) {
            toast.error("No driver designated to dispatch to");
            return;
        }

        try {
            // We set status to DISPATCHED and formally assign the driverId from the preAssigned driver
            const res = await fetch(`/api/jobs/${job.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: 'DISPATCHED',
                    driverId: job.preAssignedDriver.id
                })
            });

            if (res.ok) {
                toast.success(`Job dispatched to ${job.preAssignedDriver.callsign}`);

                // Trigger Driver Assigned Email
                handleSendNotification('DRIVER_ASSIGNED', job.id, job.preAssignedDriver.id);

                fetchJobs();
            } else {
                toast.error("Failed to dispatch job");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error dispatching job");
        }
    };


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
            case 'UNASSIGNED': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            case 'DISPATCHED': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'EN_ROUTE': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'POB': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
            case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'CANCELLED': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'NO_SHOW': return 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20 line-through';
            default: return 'bg-zinc-500/10 text-zinc-500 border-zinc-500/20';
        }
    };

    const filterJobs = (statusGroup: string) => {
        const now = new Date();

        // Base pending check for time-based tabs
        const isPendingType = (j: Job) => j.status === 'PENDING' || j.status === 'UNASSIGNED';

        switch (statusGroup) {
            case 'PENDING_NOW':
                return jobs.filter(j => {
                    if (!isPendingType(j)) return false;
                    const minutesUntilPickup = differenceInMinutes(parseISO(j.pickupTime), now);
                    return minutesUntilPickup <= 30; // Within 30 mins or overdue
                });

            case 'TODAY':
                return jobs.filter(j => {
                    if (!isPendingType(j)) return false;
                    const pickup = parseISO(j.pickupTime);
                    const minutesUntilPickup = differenceInMinutes(pickup, now);
                    // > 30 mins AND is Today
                    return minutesUntilPickup > 30 && isToday(pickup);
                });

            case 'DISPATCHED':
                return jobs.filter(j => ['DISPATCHED', 'EN_ROUTE'].includes(j.status));
            case 'POB':
                return jobs.filter(j => j.status === 'POB');
            case 'COMPLETED':
                return jobs.filter(j => j.status === 'COMPLETED');
            case 'CANCELLED':
                return jobs.filter(j => j.status === 'CANCELLED');
            case 'NO_SHOW':
                return jobs.filter(j => j.status === 'NO_SHOW');

            case 'FUTURE':
                return jobs.filter(j => {
                    if (!isPendingType(j)) return false;

                    const pickup = parseISO(j.pickupTime);
                    const isFutureDate = !isToday(pickup) && isAfter(pickup, now);

                    if (!isFutureDate) return false;

                    // Apply Sub-Filters
                    if (futureFilter === 'TOMORROW') return isTomorrow(pickup);
                    if (futureFilter === 'THIS_WEEK') return isThisWeek(pickup, { weekStartsOn: 1 }); // Monday start
                    if (futureFilter === 'THIS_MONTH') return isSameMonth(pickup, now);
                    if (futureFilter === 'CUSTOM') {
                        if (!customStartDate || !customEndDate) return true; // Show all if dates invalid
                        return isWithinInterval(pickup, {
                            start: startOfDay(parseISO(customStartDate)),
                            end: endOfDay(parseISO(customEndDate))
                        });
                    }

                    return true;
                });

            default:
                return [];
        }
    };

    const getVehicleStyle = (vType: string) => {
        if (vType === 'Saloon') return 'border-white/5 bg-zinc-900/50';
        if (vType === 'Estate') return 'border-blue-500/30 bg-blue-500/5';
        if (vType === 'Executive') return 'border-emerald-500/30 bg-emerald-500/5';
        if (vType.includes('MPV')) return 'border-purple-500/30 bg-purple-500/5';
        if (vType === 'Minibus' || vType === 'Coach') return 'border-amber-500/30 bg-amber-500/5';
        return 'border-zinc-500/30 bg-zinc-500/5';
    };

    const getVehicleTextColor = (vType: string) => {
        if (vType === 'Estate') return 'text-blue-500';
        if (vType === 'Executive') return 'text-emerald-500';
        if (vType.includes('MPV')) return 'text-purple-500';
        if (vType === 'Minibus' || vType === 'Coach') return 'text-amber-500';
        return 'text-zinc-500';
    };

    const JobCard = ({ job }: { job: Job }) => {
        const hasMeetGreet = job.notes?.includes('MEET & GREET');
        const hasReminder = job.notes?.includes('REMINDER:');

        return (
            <div
                onClick={(e) => {
                    e.stopPropagation();
                    onSelectJob(job);
                }}
                className={`
                    group relative p-4 rounded-lg border transition-all duration-200 cursor-pointer mb-2
                    ${selectedJobId === job.id ? 'bg-amber-500/10 border-amber-500/50' : `${getVehicleStyle(job.vehicleType)} hover:border-white/20`}
                `}
            >
                <div className="flex justify-between items-start mb-3">
                    <div className="flex gap-2 items-center">
                        <Badge variant="outline" className={`${getStatusColor(job.status)} font-mono text-[10px] tracking-wider`}>
                            {job.status}
                        </Badge>
                        {/* M&G Badge */}
                        {hasMeetGreet && (
                            <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20 font-mono text-[10px]">
                                M&G
                            </Badge>
                        )}
                        {job.returnBooking && (
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 font-mono text-[10px]">
                                RETURN
                            </Badge>
                        )}
                        {job.preAssignedDriver && job.status !== 'DISPATCHED' && job.status !== 'EN_ROUTE' && job.status !== 'POB' && job.status !== 'COMPLETED' && (
                            <Badge variant="outline" className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-mono text-[10px]">
                                RES: {job.preAssignedDriver.callsign}
                            </Badge>
                        )}
                        {job.paymentType === 'ACCOUNT' && (
                            <Badge variant="outline" className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 font-mono text-[10px]">
                                ACC
                            </Badge>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Prominent Time */}
                        <div className="text-right">
                            <div className="text-amber-400 font-black text-2xl leading-none tracking-tight">
                                {new Date(job.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                            <div className="text-zinc-500 text-[10px] uppercase font-bold">
                                {new Date(job.pickupTime).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                            </div>
                        </div>

                        {/* Action Menu */}
                        <Popover>
                            <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 text-zinc-500 hover:text-white">
                                    <MoreVertical className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 bg-zinc-950 border-white/10 p-1" align="end">
                                <div className="space-y-0.5">
                                    <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); setEditJob(job); setEditOpen(true); }}>
                                        <Edit className="mr-2 h-3.5 w-3.5 text-amber-500" /> Edit Booking
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); setDesignateJob(job); setDesignateOpen(true); }}>
                                        <Car className="mr-2 h-3.5 w-3.5 text-purple-500" /> Designate Driver
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => {
                                        e.stopPropagation();
                                        handleSendNotification('CONFIRMATION', job.id);
                                    }}>
                                        <div className="flex items-center">
                                            <div className="w-[14px] mr-2 flex justify-center"><Send className="h-3 w-3 text-blue-400" /></div>
                                            Resend Confirmation
                                        </div>
                                    </Button>

                                    {/* Dispatch Action */}
                                    {job.preAssignedDriver && job.status === 'PENDING' && (
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start h-8 text-xs font-normal bg-purple-500/10 text-purple-200 hover:bg-purple-500/20"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleManualDispatch(job);
                                            }}
                                        >
                                            <Send className="mr-2 h-3.5 w-3.5 text-purple-400" /> Dispatch Now
                                        </Button>
                                    )}

                                    {/* Driver Simulation Actions */}
                                    {job.status === 'DISPATCHED' && (
                                        <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(job.id, 'EN_ROUTE'); }}>
                                            <Play className="mr-2 h-3.5 w-3.5 text-blue-500" /> Mark En Route
                                        </Button>
                                    )}
                                    {job.status === 'EN_ROUTE' && (
                                        <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(job.id, 'POB'); }}>
                                            <User className="mr-2 h-3.5 w-3.5 text-pink-500" /> Mark POB
                                        </Button>
                                    )}

                                    <div className="h-px bg-white/10 my-1" />
                                    <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(job.id, 'COMPLETED'); }}>
                                        <CheckCircle className="mr-2 h-3.5 w-3.5 text-emerald-500" /> Mark Completed
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(job.id, 'CANCELLED'); }}>
                                        <Ban className="mr-2 h-3.5 w-3.5 text-red-500" /> Mark Cancelled
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(job.id, 'NO_SHOW'); }}>
                                        <UserX className="mr-2 h-3.5 w-3.5 text-zinc-400" /> Mark No Show
                                    </Button>
                                    <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(job.id, 'PENDING'); }}>
                                        <RefreshCw className="mr-2 h-3.5 w-3.5 text-blue-500" /> Re-Active (Pending)
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>

                <div className="grid grid-cols-12 gap-4">
                    {/* ... existing card content ... */}
                    <div className="col-span-12 md:col-span-5 space-y-2">
                        <div className="flex items-start gap-2">
                            <div className="mt-1 min-w-[16px]"><MapPin className="h-4 w-4 text-emerald-500" /></div>
                            <span className="text-sm text-zinc-100 font-medium leading-tight line-clamp-2">{job.pickupAddress}</span>
                        </div>
                        <div className="pl-[7px] py-1"><div className="w-[2px] h-3 bg-zinc-800 ml-[1px]"></div></div>
                        <div className="flex items-start gap-2">
                            <div className="mt-1 min-w-[16px]"><MapPin className="h-4 w-4 text-amber-500" /></div>
                            <span className="text-sm text-zinc-100 font-medium leading-tight line-clamp-2">{job.dropoffAddress}</span>
                        </div>
                        {/* Reminder Line */}
                        {hasReminder && (
                            <div className="flex items-start gap-2 mt-2 pt-2 border-t border-white/5">
                                <AlertCircle className="h-3 w-3 text-red-400 mt-0.5" />
                                <span className="text-xs text-red-300 font-bold">{job.notes?.split('\n')[0].replace('[', '').replace(']', '')}</span>
                            </div>
                        )}
                    </div>

                    <div className="col-span-12 md:col-span-4 flex flex-col justify-center space-y-2 border-l border-white/5 pl-4">
                        <div className="flex items-center gap-2 text-zinc-300 text-xs font-medium">
                            <User className="h-3 w-3 text-zinc-500" /> {job.passengerName}
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400 text-xs">
                            <Phone className="h-3 w-3" /> {job.passengerPhone}
                        </div>
                        {/* Pax/Lug Data */}
                        <div className="flex items-center gap-3 mt-1">
                            <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 flex items-center gap-1">
                                <User className="h-2.5 w-2.5" /> {job.passengers}
                            </span>
                            <span className="text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded text-zinc-400 flex items-center gap-1">
                                <span className="font-bold">LUG</span> {job.luggage}
                            </span>
                        </div>
                    </div>

                    <div className="col-span-12 md:col-span-3 flex flex-col justify-center items-end border-l border-white/5 pl-4">
                        <span className="text-xl font-bold text-white">£{job.fare?.toFixed(2) || '0.00'}</span>
                        <span className={`text-[10px] uppercase tracking-wider font-bold ${getVehicleTextColor(job.vehicleType)}`}>{job.vehicleType}</span>
                        <span className="text-[10px] text-zinc-500 mt-1">{job.paymentType}</span>
                    </div>
                </div>
            </div>
        )
    };

    return (
        <div className="h-full flex flex-col bg-zinc-950/50">
            <div className="p-4 border-b border-white/5 space-y-3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center gap-2 pb-2">
                        <div className="flex-1 overflow-x-auto scrollbar-none">
                            <TabsList className="inline-flex w-auto bg-black/40 border border-white/10 h-9 p-1 gap-1">
                                <TabsTrigger value="PENDING_NOW" className="px-3 text-[10px] data-[state=active]:bg-amber-500 data-[state=active]:text-black font-bold uppercase whitespace-nowrap">
                                    Pending {filterJobs('PENDING_NOW').length > 0 && `(${filterJobs('PENDING_NOW').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="TODAY" className="px-3 text-[10px] data-[state=active]:bg-teal-500 data-[state=active]:text-black font-bold uppercase whitespace-nowrap">
                                    Today {filterJobs('TODAY').length > 0 && `(${filterJobs('TODAY').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="DISPATCHED" className="px-3 text-[10px] data-[state=active]:bg-blue-500 data-[state=active]:text-black font-bold uppercase whitespace-nowrap">
                                    Dispatched {filterJobs('DISPATCHED').length > 0 && `(${filterJobs('DISPATCHED').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="POB" className="px-3 text-[10px] data-[state=active]:bg-pink-500 data-[state=active]:text-black font-bold uppercase whitespace-nowrap">
                                    POB {filterJobs('POB').length > 0 && `(${filterJobs('POB').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="COMPLETED" className="px-3 text-[10px] data-[state=active]:bg-emerald-500 data-[state=active]:text-black font-bold uppercase whitespace-nowrap">
                                    Completed {filterJobs('COMPLETED').length > 0 && `(${filterJobs('COMPLETED').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="CANCELLED" className="px-3 text-[10px] data-[state=active]:bg-red-500 data-[state=active]:text-black font-bold uppercase whitespace-nowrap">
                                    Cancelled {filterJobs('CANCELLED').length > 0 && `(${filterJobs('CANCELLED').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="NO_SHOW" className="px-3 text-[10px] data-[state=active]:bg-zinc-500 data-[state=active]:text-white font-bold uppercase whitespace-nowrap">
                                    No Show {filterJobs('NO_SHOW').length > 0 && `(${filterJobs('NO_SHOW').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="FUTURE" className="px-3 text-[10px] data-[state=active]:bg-zinc-700 data-[state=active]:text-white font-bold uppercase whitespace-nowrap">
                                    Future {filterJobs('FUTURE').length > 0 && `(${filterJobs('FUTURE').length})`}
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <Button variant="outline" size="icon" className="h-9 w-9 border-white/10 bg-black/40 text-zinc-400 hover:text-white hover:bg-zinc-800 shrink-0" onClick={() => fetchJobs(true)}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </Tabs>

                {/* Future Tab Filter Toolbar */}
                {activeTab === 'FUTURE' && (
                    <div className="flex items-center gap-2 bg-zinc-900/50 p-2 rounded border border-white/5 animate-in slide-in-from-top-2">
                        <CalendarIcon className="h-4 w-4 text-zinc-500" />
                        <Select value={futureFilter} onValueChange={setFutureFilter}>
                            <SelectTrigger className="h-7 w-[120px] text-xs bg-zinc-800 border-white/10">
                                <SelectValue placeholder="Period" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="TOMORROW">Tomorrow</SelectItem>
                                <SelectItem value="THIS_WEEK">This Week</SelectItem>
                                <SelectItem value="THIS_MONTH">This Month</SelectItem>
                                <SelectItem value="CUSTOM">Custom Range</SelectItem>
                            </SelectContent>
                        </Select>

                        {futureFilter === 'CUSTOM' && (
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => setCustomStartDate(e.target.value)}
                                    className="h-7 bg-zinc-800 border border-white/10 rounded px-2 text-xs text-white"
                                />
                                <span className="text-zinc-500">-</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="h-7 bg-zinc-800 border border-white/10 rounded px-2 text-xs text-white"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-20 text-zinc-600 animate-pulse">Loading jobs...</div>
                ) : filterJobs(activeTab).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-zinc-600 border border-dashed border-white/5 rounded-lg bg-black/20">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">No bookings in this category.</p>
                        {activeTab === 'FUTURE' && <p className="text-xs text-zinc-500 mt-1">Try adjusting the period filter.</p>}
                    </div>
                ) : (
                    filterJobs(activeTab).map(job => (
                        <JobCard key={job.id} job={job} />
                    ))
                )}
            </div>

            <EditBookingDialog
                job={editJob}
                open={editOpen}
                onOpenChange={setEditOpen}
                onJobUpdated={() => {
                    fetchJobs();
                    setEditJob(null);
                }}
            />

            <DesignateDriverDialog
                job={designateJob}
                open={designateOpen}
                onOpenChange={setDesignateOpen}
                onSuccess={() => {
                    fetchJobs();
                    setDesignateJob(null);
                }}
            />
        </div>
    );
}
