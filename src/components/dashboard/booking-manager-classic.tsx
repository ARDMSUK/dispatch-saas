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
import { DispatchDriverDialog } from './dispatch-driver-dialog';

interface Job {
    id: number;
    pickupAddress: string;
    dropoffAddress: string;
    passengerName: string;
    passengerPhone: string;
    pickupTime: string;
    vehicleType: string;
    status: 'PENDING' | 'UNASSIGNED' | 'DISPATCHED' | 'EN_ROUTE' | 'ARRIVED' | 'POB' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
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
    paymentStatus?: 'PAID' | 'UNPAID' | 'PARTIAL' | 'AUTHORIZED' | 'REFUNDED';
    waitingTime?: number;
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

export function BookingManagerClassic({ onSelectJob, selectedJobId, refreshTrigger }: BookingManagerProps) {
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

    // Dispatch State (Immediate)
    const [dispatchJob, setDispatchJob] = useState<Job | null>(null);
    const [dispatchOpen, setDispatchOpen] = useState(false);

    // Flight Tracking State
    const [flights, setFlights] = useState<Record<string, any>>({});

    useEffect(() => {
        fetchJobs(); // Initial load

        const interval = setInterval(() => {
            fetchJobs(false); // Silent background refresh
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [refreshTrigger]);

    // Fetch Flight Data for active jobs with flight numbers
    useEffect(() => {
        const fetchFlights = async () => {
            const flightNumbersToFetch = new Set<string>();

            jobs.forEach(job => {
                // Only fetch flights for jobs that haven't been completed/cancelled
                if (job.flightNumber && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(job.status)) {
                    flightNumbersToFetch.add(job.flightNumber);
                }
            });

            for (const fn of Array.from(flightNumbersToFetch)) {
                // Skip if we already fetched it recently to save API calls
                if (flights[fn]) continue;

                try {
                    const res = await fetch(`/api/flights?flightNumber=${encodeURIComponent(fn)}`);
                    if (res.ok) {
                        const data = await res.json();
                        setFlights(prev => ({ ...prev, [fn]: data }));
                    }
                } catch (e) {
                    console.error(`Failed to fetch flight ${fn}`, e);
                }
            }
        };

        if (jobs.length > 0) {
            fetchFlights();
        }
    }, [jobs]); // Re-run when jobs list updates

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
            // Use the dedicated assign endpoint to ensure Driver status is updated to BUSY
            const res = await fetch(`/api/jobs/${job.id}/assign`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driverId: job.preAssignedDriver.id
                })
            });

            if (res.ok) {
                toast.success(`Job dispatched to ${job.preAssignedDriver.callsign}`);

                // Trigger Driver Assigned Email/SMS
                handleSendNotification('DRIVER_ASSIGNED', job.id, job.preAssignedDriver.id);

                fetchJobs();
            } else {
                const errorData = await res.json();
                toast.error(errorData.error || "Failed to dispatch job");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error dispatching job");
        }
    };


    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING':
            case 'UNASSIGNED': return 'bg-blue-700/10 text-blue-700 border-blue-700/20';
            case 'DISPATCHED': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'EN_ROUTE': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
            case 'ARRIVED': return 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20';
            case 'POB': return 'bg-pink-500/10 text-pink-500 border-pink-500/20';
            case 'COMPLETED': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
            case 'CANCELLED': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'NO_SHOW': return 'bg-zinc-500/10 text-slate-500 border-zinc-500/20 line-through';
            default: return 'bg-zinc-500/10 text-slate-400 border-zinc-500/20';
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
                return jobs.filter(j => ['DISPATCHED', 'EN_ROUTE', 'ARRIVED'].includes(j.status));
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
        if (vType === 'Saloon') return 'border-slate-200 bg-slate-100';
        if (vType === 'Estate') return 'border-blue-500/30 bg-blue-500/5';
        if (vType === 'Executive') return 'border-emerald-500/30 bg-emerald-500/5';
        if (vType.includes('MPV')) return 'border-purple-500/30 bg-purple-500/5';
        if (vType === 'Minibus' || vType === 'Coach') return 'border-blue-700/30 bg-blue-700/5';
        return 'border-zinc-500/30 bg-zinc-500/5';
    };

    const getVehicleTextColor = (vType: string) => {
        if (vType === 'Estate') return 'text-blue-500';
        if (vType === 'Executive') return 'text-emerald-500';
        if (vType.includes('MPV')) return 'text-purple-500';
        if (vType === 'Minibus' || vType === 'Coach') return 'text-blue-700';
        return 'text-slate-400';
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
                className={`flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-lg shadow-sm hover:border-blue-400 cursor-pointer transition-all group ${selectedJobId === job.id ? 'bg-blue-50/50 border-blue-400' : ''}`}
            >
                {/* COL: TIME & STATUS */}
                <div className="w-16 flex flex-col justify-center border-r border-slate-100 pr-2 h-full">
                    <div className="font-black text-blue-600 text-base leading-none">
                        {new Date(job.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                        {new Date(job.pickupTime).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                    </div>
                </div>

                {/* COL: DRIVER & STATUS BADGE */}
                <div className="w-20 flex flex-col items-center justify-center gap-1.5 border-r border-slate-100 pr-2 h-full">
                    <span className={`font-bold text-[9px] px-1.5 py-0.5 rounded w-full text-center ${getStatusColor(job.status)}`}>
                        {job.status}
                    </span>
                    {job.driver ? (
                        <span className="bg-purple-100 text-purple-700 font-bold text-[10px] px-1.5 py-0.5 rounded w-full text-center truncate">DRV: {job.driver.callsign}</span>
                    ) : job.preAssignedDriver && job.status === 'PENDING' ? (
                        <span className="bg-purple-50 text-purple-400 font-bold text-[10px] px-1.5 py-0.5 rounded border border-purple-200 w-full text-center truncate" title={`Pre-assigned: ${job.preAssignedDriver.callsign}`}>RES: {job.preAssignedDriver.callsign}</span>
                    ) : (
                        <span className="bg-slate-100 text-slate-400 font-bold text-[10px] px-1.5 py-0.5 rounded border border-slate-200 w-full text-center">UNASS</span>
                    )}
                </div>

                {/* COL: JOURNEY & NOTES (Flex-1) */}
                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 border-r border-slate-100 pr-2">
                    <div className="flex items-center gap-2 text-xs">
                        <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                        <span className="font-bold text-slate-700 truncate">{job.pickupAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                        <MapPin className="h-3 w-3 text-blue-600 shrink-0" />
                        <span className="font-medium text-slate-600 truncate">{job.dropoffAddress}</span>
                    </div>
                    {(job.notes || job.flightNumber || hasMeetGreet || job.returnBooking || job.waitingTime) && (
                        <div className="flex items-center gap-2 text-[10px] mt-0.5 overflow-hidden">
                            {hasMeetGreet && <span className="bg-indigo-50 text-indigo-600 px-1 py-0.5 border border-indigo-100 rounded font-bold whitespace-nowrap">M&G</span>}
                            {job.returnBooking && <span className="bg-indigo-50 text-indigo-600 px-1 py-0.5 border border-indigo-100 rounded font-bold whitespace-nowrap">RETURN</span>}
                            {(job.waitingTime || 0) > 0 && <span className="bg-yellow-50 text-yellow-600 px-1 py-0.5 border border-yellow-100 rounded font-bold whitespace-nowrap">WAIT: {job.waitingTime}m</span>}
                            
                            {/* Live Flight Info */}
                            {job.flightNumber && (
                                <span className={`px-1.5 py-0.5 border rounded font-mono flex items-center gap-1 whitespace-nowrap ${flights[job.flightNumber] && String(flights[job.flightNumber].status).toLowerCase() === 'cancelled' ? 'bg-red-50 text-red-600 border-red-200' : flights[job.flightNumber] && (new Date(flights[job.flightNumber].estimatedArrival).getTime() > new Date(flights[job.flightNumber].scheduledArrival).getTime() + (15 * 60000)) ? 'bg-orange-50 text-orange-500 border-orange-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                    ✈️ {job.flightNumber}
                                </span>
                            )}
                            
                            {/* Notes parsing */}
                            {job.notes && (
                                <span className="text-slate-400 flex items-center gap-1 truncate">
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    {job.notes.replace(/\[.*?\]\s*/g, '')}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* COL: PASSENGER */}
                <div className="w-32 flex flex-col justify-center gap-1 border-r border-slate-100 pr-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 truncate">
                        <User className="h-3 w-3 text-slate-400 shrink-0" /> {job.passengerName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 truncate">
                        <Phone className="h-3 w-3 shrink-0" /> {job.passengerPhone}
                    </div>
                </div>

                {/* COL: PAX / LUG / VEHICLE */}
                <div className="w-20 flex flex-col justify-center items-center gap-1 border-r border-slate-100 pr-2">
                    <div className={`font-bold text-[10px] uppercase tracking-wider ${getVehicleTextColor(job.vehicleType)}`}>{job.vehicleType}</div>
                    <div className="flex gap-2 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{job.passengers}</span>
                        <span className="font-bold border-l border-slate-300 pl-1.5">LUG {job.luggage}</span>
                    </div>
                </div>

                {/* COL: FARE & PAYMENT */}
                <div className="w-20 flex flex-col items-end justify-center pr-2">
                    <div className="font-black text-slate-900 text-base">£{job.fare?.toFixed(2) || '0.00'}</div>
                    <div className={`font-bold text-[9px] px-1 rounded ${(job.paymentStatus === 'PAID' || job.paymentStatus === 'AUTHORIZED') ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'}`}>
                        {job.paymentType === 'IN_CAR_TERMINAL' ? 'TERMINAL' : job.paymentType}
                        {(job.paymentStatus === 'PAID' || job.paymentStatus === 'AUTHORIZED') && ' ✓'}
                    </div>
                </div>
                
                {/* ACTIONS */}
                <div className="w-6 flex items-center justify-center relative">
                    <Popover>
                        <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 group-hover:text-slate-600 transition-colors">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 bg-white border-slate-200 p-1" align="end">
                            <div className="space-y-0.5">
                                <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); setEditJob(job); setEditOpen(true); }}>
                                    <Edit className="mr-2 h-3.5 w-3.5 text-blue-700" /> Edit Booking
                                </Button>
                                <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); setDesignateJob(job); setDesignateOpen(true); }}>
                                    <Car className="mr-2 h-3.5 w-3.5 text-purple-500" /> Designate Driver
                                </Button>
                                <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendNotification('CONFIRMATION', job.id);
                                }}>
                                    <div className="flex items-center">
                                        <div className="w-[14px] mr-2 flex justify-center"><Send className="h-3 w-3 text-blue-600" /></div>
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
                                        <Send className="mr-2 h-3.5 w-3.5 text-purple-400" /> Dispatch to {job.preAssignedDriver.callsign}
                                    </Button>
                                )}

                                {/* Manual Dispatch (No Pre-assign) */}
                                {(job.status === 'PENDING' || job.status === 'UNASSIGNED') && (
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start h-8 text-xs font-normal"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDispatchJob(job);
                                            setDispatchOpen(true);
                                        }}
                                    >
                                        <Car className="mr-2 h-3.5 w-3.5 text-emerald-500" /> Dispatch / Assign
                                    </Button>
                                )}

                                {/* Driver Simulation Actions */}
                                {job.status === 'DISPATCHED' && (
                                    <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(job.id, 'EN_ROUTE'); }}>
                                        <Play className="mr-2 h-3.5 w-3.5 text-blue-500" /> Mark En Route
                                    </Button>
                                )}
                                {job.status === 'EN_ROUTE' && (
                                    <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(job.id, 'ARRIVED'); }}>
                                        <MapPin className="mr-2 h-3.5 w-3.5 text-fuchsia-500" /> Mark Arrived
                                    </Button>
                                )}
                                {job.status === 'ARRIVED' && (
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
                                    <UserX className="mr-2 h-3.5 w-3.5 text-slate-500" /> Mark No Show
                                </Button>
                                <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); handleStatusUpdate(job.id, 'PENDING'); }}>
                                    <RefreshCw className="mr-2 h-3.5 w-3.5 text-blue-500" /> Re-Active (Pending)
                                </Button>
                            </div>
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
        )
    };

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b border-slate-200 space-y-3">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center gap-2 pb-2">
                        <div className="flex-1 overflow-x-auto scrollbar-none">
                            <TabsList className="inline-flex w-auto bg-slate-100 border border-slate-200 h-9 p-1 gap-1">
                                <TabsTrigger value="PENDING_NOW" className="px-3 text-[10px] data-[state=active]:bg-blue-700 data-[state=active]:text-black font-bold uppercase whitespace-nowrap">
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
                                <TabsTrigger value="NO_SHOW" className="px-3 text-[10px] data-[state=active]:bg-zinc-500 data-[state=active]:text-slate-900 font-bold uppercase whitespace-nowrap">
                                    No Show {filterJobs('NO_SHOW').length > 0 && `(${filterJobs('NO_SHOW').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="FUTURE" className="px-3 text-[10px] data-[state=active]:bg-zinc-700 data-[state=active]:text-slate-900 font-bold uppercase whitespace-nowrap">
                                    Future {filterJobs('FUTURE').length > 0 && `(${filterJobs('FUTURE').length})`}
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 shrink-0" onClick={() => fetchJobs(true)}>
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>
                </Tabs>

                {/* Future Tab Filter Toolbar */}
                {activeTab === 'FUTURE' && (
                    <div className="flex items-center gap-2 bg-slate-100 p-2 rounded border border-slate-200 animate-in slide-in-from-top-2">
                        <CalendarIcon className="h-4 w-4 text-slate-400" />
                        <Select value={futureFilter} onValueChange={setFutureFilter}>
                            <SelectTrigger className="h-7 w-[120px] text-xs bg-slate-200 border-slate-200">
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
                                    className="h-7 bg-slate-200 border border-slate-200 rounded px-2 text-xs text-slate-900"
                                />
                                <span className="text-slate-400">-</span>
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => setCustomEndDate(e.target.value)}
                                    className="h-7 bg-slate-200 border border-slate-200 rounded px-2 text-xs text-slate-900"
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {loading ? (
                    <div className="text-center py-20 text-slate-500 animate-pulse">Loading jobs...</div>
                ) : filterJobs(activeTab).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">No bookings in this category.</p>
                        {activeTab === 'FUTURE' && <p className="text-xs text-slate-400 mt-1">Try adjusting the period filter.</p>}
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

            <DispatchDriverDialog
                job={dispatchJob}
                open={dispatchOpen}
                onOpenChange={setDispatchOpen}
                onSuccess={() => {
                    fetchJobs();
                    setDispatchJob(null);
                }}
            />
        </div>
    );
}
