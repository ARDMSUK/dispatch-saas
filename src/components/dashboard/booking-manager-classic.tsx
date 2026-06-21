'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Search, MapPin, Calendar as CalendarIcon, Clock, Filter, ChevronDown, User, Phone, Briefcase, Car, MoreVertical, Edit, Trash2, CheckCircle, XCircle, AlertCircle, Play, Ban, RefreshCw, UserX, Send, Copy, Volume2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import QRCode from 'qrcode';
import { Link as LinkIcon, QrCode } from "lucide-react";
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
    bookedBy?: { name: string | null; email: string } | null;
    calls?: Array<{
        id: string;
        phone: string;
        status: string;
        recordingUrl: string | null;
        duration: number | null;
        createdAt: string;
        answeredByExt: string | null;
        summary: string | null;
        transcript: string | null;
    }>;
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

    // Search Box State
    const [searchQuery, setSearchQuery] = useState('');
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');

    // Future Filter State
    const [futureFilter, setFutureFilter] = useState('ALL');
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

    // Job Details State
    const [selectedDetailsJob, setSelectedDetailsJob] = useState<Job | null>(null);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrJob, setQrJob] = useState<any>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [qrLink, setQrLink] = useState<string | null>(null);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    // Fetch Logs for the details dialog
    useEffect(() => {
        if (selectedDetailsJob) {
            setLogsLoading(true);
            fetch('/api/logs')
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        const filtered = data.filter((log: any) => 
                            log.id?.includes(`job-${selectedDetailsJob.id}-`) || 
                            log.description?.includes(`TRIP-${selectedDetailsJob.id}`)
                        );
                        setAuditLogs(filtered);
                    }
                })
                .catch(err => console.error("Error fetching job logs:", err))
                .finally(() => setLogsLoading(false));
        } else {
            setAuditLogs([]);
        }
    }, [selectedDetailsJob]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery);
        }, 500); // 500ms debounce
        return () => clearTimeout(timer);
    }, [searchQuery]);

    useEffect(() => {
        fetchJobs(true, debouncedSearchQuery); // Initial load and on query change

        const interval = setInterval(() => {
            fetchJobs(false, debouncedSearchQuery); // Silent background refresh
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [refreshTrigger, debouncedSearchQuery]);

    // Fetch Flight Data for active jobs with flight numbers
    useEffect(() => {
        const fetchFlights = async () => {
            const flightsToFetch = new Set<string>();

            jobs.forEach(job => {
                // Only fetch flights for jobs that haven't been completed/cancelled
                if (job.flightNumber && !['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(job.status)) {
                    const dateStr = new Date(job.pickupTime).toISOString().split('T')[0];
                    flightsToFetch.add(`${job.flightNumber}|${dateStr}`);
                }
            });

            for (const item of Array.from(flightsToFetch)) {
                const [fn, dateStr] = item.split('|');

                // Skip if we already fetched it recently to save API calls
                if (flights[fn]) continue;

                try {
                    const res = await fetch(`/api/flights?flightNumber=${encodeURIComponent(fn)}&dateString=${encodeURIComponent(dateStr)}`);
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

    const fetchJobs = async (showLoading = true, searchVal = '') => {
        if (showLoading) setLoading(true);
        try {
            const queryParam = searchVal ? `?search=${encodeURIComponent(searchVal)}` : '';
            const res = await fetch(`/api/jobs${queryParam}`);
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

    const handleOpenQr = async (job: any) => {
        setQrJob(job);
        setQrModalOpen(true);
        setQrLink(null);
        setQrCodeDataUrl(null);
        
        if (job.paymentStatus === 'PAID') {
            return;
        }

        setQrLoading(true);
        try {
            const res = await fetch(`/api/jobs/${job.id}/payment-link`, { method: 'POST' });
            const data = await res.json();
            
            if (data.success && data.url) {
                setQrLink(data.url);
                try {
                    const qrDataUrl = await QRCode.toDataURL(data.url, { width: 300, margin: 2 });
                    setQrCodeDataUrl(qrDataUrl);
                } catch (qrErr) {
                    console.error('QR Generate Error', qrErr);
                }
                
                // Update local job state if it was a new link
                if (!data.reused) {
                    setJobs(jobs.map(j => j.id === job.id ? { ...j, paymentLink: data.url, paymentProvider: 'STRIPE' } : j));
                }
            } else {
                toast.error(data.error || 'Failed to generate payment link');
                setQrModalOpen(false);
            }
        } catch (err) {
            console.error(err);
            toast.error('Error generating payment link');
            setQrModalOpen(false);
        } finally {
            setQrLoading(false);
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
                } else if (newStatus === 'CANCELLED') {
                    handleSendNotification('JOB_CANCELLED', jobId);
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


    const handleSendNotification = async (type: 'CONFIRMATION' | 'DRIVER_ASSIGNED' | 'JOB_COMPLETED' | 'JOB_CANCELLED', bookingId: number, driverId?: string) => {
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

    const handleAcceptBooking = async (job: Job) => {
        try {
            const res = await fetch(`/api/jobs/${job.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'UNASSIGNED' })
            });
            if (res.ok) {
                toast.success("Booking accepted. Confirmation SMS/Email sent.");
                handleSendNotification('CONFIRMATION', job.id);
                fetchJobs();
            } else {
                toast.error("Failed to accept booking");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error accepting booking");
        }
    };

    const getPostcode = (addr: string) => {
        if (!addr) return '';
        const match = addr.match(/\b([A-Z]{1,2}[0-9][A-Z0-9]?\s*[0-9][A-Z]{2})\b/i);
        return match ? match[1].toUpperCase() : '';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'UNASSIGNED': return 'bg-indigo-600/10 text-indigo-600 border-indigo-600/20';
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
                return jobs.filter(j => ['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'ACTIVE'].includes(j.status));
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
                    if (futureFilter === 'ALL') return true;
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
        if (vType.includes('WAV') || vType.includes('wav')) return 'border-l-4 border-l-orange-500 bg-orange-50/50 border-orange-200';
        if (vType === 'Estate') return 'border-l-4 border-l-blue-500 bg-blue-50/50 border-blue-200';
        if (vType === 'Executive') return 'border-l-4 border-l-emerald-500 bg-emerald-50/50 border-emerald-200';
        if (vType.includes('MPV')) return 'border-l-4 border-l-purple-500 bg-purple-50/50 border-purple-200';
        if (vType === 'Minibus' || vType === 'Coach' || vType.includes('Minibus')) return 'border-l-4 border-l-indigo-600 bg-indigo-50/50 border-indigo-200';
        return '';
    };

    const getVehicleTextColor = (vType: string) => {
        if (vType.includes('WAV') || vType.includes('wav')) return 'text-orange-600 font-bold';
        if (vType === 'Estate') return 'text-blue-500 font-bold';
        if (vType === 'Executive') return 'text-emerald-600 font-bold';
        if (vType.includes('MPV')) return 'text-purple-600 font-bold';
        if (vType === 'Minibus' || vType === 'Coach') return 'text-indigo-600 font-bold';
        return 'text-slate-500';
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
                    flex items-center gap-3 border p-2 rounded-lg shadow-sm hover:border-blue-400 cursor-pointer transition-all group 
                    ${selectedJobId === job.id 
                        ? 'bg-blue-50 border-blue-400' 
                        : job.vehicleType !== 'Saloon' 
                            ? getVehicleStyle(job.vehicleType) 
                            : 'bg-white border-slate-200'
                    }
                `}
            >
                {/* COL: TIME & STATUS */}
                <div className="w-16 flex flex-col justify-center border-r border-slate-100 pr-2 h-full">
                    <div className="font-black text-blue-500 text-base leading-none">
                        {new Date(job.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">
                        {new Date(job.pickupTime).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                    </div>
                </div>

                {/* COL: DRIVER & STATUS BADGE */}
                <div className="w-20 flex flex-col items-center justify-center gap-1.5 border-r border-slate-100 pr-2 h-full">
                    <span className={`font-bold text-[9px] px-1.5 py-0.5 rounded w-full text-center ${getStatusColor(job.status)}`}>
                        {job.status === 'UNASSIGNED' ? 'CONFIRMED' : job.status}
                    </span>
                    <span className="font-mono text-[9px] font-bold text-slate-400">#{job.id}</span>
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
                    <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                            <span className="font-bold text-slate-700 truncate">{job.pickupAddress}</span>
                        </div>
                        {getPostcode(job.pickupAddress) && (
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[9px] px-1.5 py-0.5 font-bold rounded shrink-0 font-mono">
                                {getPostcode(job.pickupAddress)}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                            <MapPin className="h-3 w-3 text-blue-500 shrink-0" />
                            <span className="font-medium text-slate-600 truncate">{job.dropoffAddress}</span>
                        </div>
                        {getPostcode(job.dropoffAddress) && (
                            <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[9px] px-1.5 py-0.5 font-bold rounded shrink-0 font-mono">
                                {getPostcode(job.dropoffAddress)}
                            </span>
                        )}
                    </div>
                    {(job.notes || job.flightNumber || hasMeetGreet || job.returnBooking || (job.waitingTime && job.waitingTime > 0)) ? (
                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] mt-0.5 overflow-hidden">
                            {hasMeetGreet && <span className="bg-indigo-50 text-indigo-600 px-1 py-0.5 border border-indigo-100 rounded font-bold whitespace-nowrap">M&G</span>}
                            {job.returnBooking && <span className="bg-indigo-50 text-indigo-600 px-1 py-0.5 border border-indigo-100 rounded font-bold whitespace-nowrap">RETURN</span>}
                            {(job.waitingTime || 0) > 0 && <span className="bg-yellow-50 text-yellow-600 px-1 py-0.5 border border-yellow-100 rounded font-bold whitespace-nowrap">WAIT: {job.waitingTime}m</span>}
                            
                            {/* Metadata Badges from Notes */}
                            {job.notes && (() => {
                                const match = job.notes.match(/^\[(.*?)\]\s*([\s\S]*)/);
                                if (match) {
                                    const [_, header] = match;
                                    const tags = header.split('|').map(t => t.trim()).filter(Boolean);
                                    return tags.map((tag, idx) => {
                                        if (tag.startsWith('REMINDER:')) {
                                            const text = tag.replace('REMINDER:', '').trim();
                                            return (
                                                <span key={idx} className="bg-red-50 text-red-700 border border-red-200 px-1 py-0.5 rounded font-bold whitespace-nowrap">
                                                    🚨 {text}
                                                </span>
                                            );
                                        }
                                        if (tag === 'MEET & GREET p/u') {
                                            return null;
                                        }
                                        if (tag === 'HAND LUGGAGE ONLY') {
                                            return (
                                                <span key={idx} className="bg-teal-50 text-teal-700 border border-teal-200 px-1 py-0.5 rounded font-bold whitespace-nowrap">
                                                    💼 HAND LUGGAGE
                                                </span>
                                            );
                                        }
                                        if (tag === 'NO_NOTIFICATIONS') {
                                            return (
                                                <span key={idx} className="bg-slate-100 text-slate-700 border border-slate-300 px-1 py-0.5 rounded font-bold whitespace-nowrap">
                                                    🔕 MUTED NOTIFS
                                                </span>
                                            );
                                        }
                                        return (
                                            <span key={idx} className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-1 py-0.5 rounded font-bold whitespace-nowrap">
                                                ⚠️ {tag}
                                            </span>
                                        );
                                    });
                                }
                                return null;
                            })()}

                            {/* Live Flight Info */}
                            {job.flightNumber && (
                                <div className="flex flex-wrap items-center gap-1">
                                    <span className="px-1.5 py-0.5 border rounded font-mono flex items-center gap-1 whitespace-nowrap bg-blue-50 text-blue-500 border-blue-200">
                                        ✈️ {job.flightNumber}
                                    </span>
                                    {flights[job.flightNumber] && (
                                        (() => {
                                            const f = flights[job.flightNumber];
                                            const isDelayed = new Date(f.estimatedArrival).getTime() > new Date(f.scheduledArrival).getTime() + (15 * 60000);
                                            const landed = f.status === 'landed' || f.actualArrival;
                                            const cancelled = String(f.status).toLowerCase() === 'cancelled';

                                            const estTime = new Date(f.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            const termGate = [f.terminal ? `T${f.terminal}` : '', f.gate ? `G:${f.gate}` : ''].filter(Boolean).join(' ');

                                            if (cancelled) {
                                                return <span className="px-1.5 py-0.5 border rounded font-mono bg-red-50 text-red-600 border-red-200 whitespace-nowrap">CANCELLED</span>;
                                            } else if (landed) {
                                                return <span className="px-1.5 py-0.5 border rounded font-mono bg-emerald-50 text-emerald-600 border-emerald-200 whitespace-nowrap">LANDED {new Date(f.actualArrival || f.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} {termGate ? `(${termGate})` : ''}</span>;
                                            } else if (isDelayed) {
                                                const delayMins = Math.round((new Date(f.estimatedArrival).getTime() - new Date(f.scheduledArrival).getTime()) / 60000);
                                                return <span className="px-1.5 py-0.5 border rounded font-mono bg-orange-50 text-orange-500 border-orange-200 animate-pulse whitespace-nowrap">DELAYED +{delayMins}m (EST: {estTime}) {termGate ? `(${termGate})` : ''}</span>;
                                            } else {
                                                return <span className="px-1.5 py-0.5 border rounded font-mono bg-slate-100 text-slate-500 border-slate-200 whitespace-nowrap">EST: {estTime} {termGate ? `(${termGate})` : ''}</span>;
                                            }
                                        })()
                                    )}
                                </div>
                            )}
                            
                            {/* Notes parsing */}
                            {job.notes && (
                                <span className="text-slate-500 flex items-center gap-1 truncate max-w-[200px]" title={job.notes?.replace(/\[.*?\]\s*/g, '')}>
                                    <AlertCircle className="h-3 w-3 shrink-0" />
                                    {job.notes?.replace(/\[.*?\]\s*/g, '')}
                                </span>
                            )}
                        </div>
                    ) : null}
                </div>

                {/* COL: PASSENGER */}
                <div className="w-32 flex flex-col justify-center gap-1 border-r border-slate-100 pr-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 truncate">
                        <User className="h-3 w-3 text-slate-400 shrink-0" /> {job.passengerName}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 truncate">
                        <Phone className="h-3 w-3 shrink-0" /> 
                        <a href={`tel:${job.passengerPhone}`} className="hover:underline text-blue-600" onClick={(e) => e.stopPropagation()}>
                            {job.passengerPhone}
                        </a>
                    </div>
                    {job.driver && job.driver.phone && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 truncate">
                            <Car className="h-3 w-3 text-slate-400 shrink-0" />
                            <a href={`tel:${job.driver.phone}`} className="hover:underline text-blue-600" onClick={(e) => e.stopPropagation()}>
                                {job.driver.phone}
                            </a>
                        </div>
                    )}
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
                    <div className="mt-0.5">
                        {(() => {
                            if (job.paymentStatus === 'PAID' || job.paymentStatus === 'AUTHORIZED') {
                                return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none px-1 text-[9px] rounded-sm">{(job.paymentType === 'IN_CAR_TERMINAL' ? 'TERMINAL' : (job.paymentType || '')).toUpperCase()} ✓</Badge>;
                            }
                            if (job.paymentType === 'CARD') {
                                return <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-200 border border-rose-200/50 px-1 text-[9px] font-extrabold rounded-sm">CARD UNPAID</Badge>;
                            }
                            if (job.paymentType === 'IN_CAR_TERMINAL') {
                                return <Badge className="bg-blue-100 text-indigo-600 hover:bg-blue-200 border-none px-1 text-[9px] rounded-sm">TERMINAL</Badge>;
                            }
                            if (job.paymentType === 'ACCOUNT') {
                                return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-none px-1 text-[9px] rounded-sm">ACCOUNT</Badge>;
                            }
                            return <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border-none px-1 text-[9px] rounded-sm">CASH</Badge>;
                        })()}
                    </div>
                </div>
                
                {/* ACTIONS */}
                <div className="flex items-center gap-1 pr-1">
                    {/* Add Dispatch button for Pending jobs with preassigned driver */}
                    {job.status === 'PENDING' && job.preAssignedDriver && (
                        <Button 
                            size="sm" 
                            className="h-6 text-[10px] px-2 bg-purple-100 text-purple-700 hover:bg-purple-200 border-none shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleManualDispatch(job);
                            }}
                        >
                            <Send className="h-3 w-3 mr-1" />
                            Dispatch
                        </Button>
                    )}
                    {(job.status === 'PENDING' || job.status === 'UNASSIGNED') && !job.preAssignedDriver && (
                        <Button 
                            size="sm" 
                            variant="outline"
                            className="h-6 text-[10px] px-2 border-slate-200 text-slate-600 shrink-0"
                            onClick={(e) => {
                                e.stopPropagation();
                                setDispatchJob(job);
                                setDispatchOpen(true);
                            }}
                        >
                            Assign
                        </Button>
                    )}
                    
                    <Popover>
                        <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 group-hover:text-slate-600 transition-colors">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 bg-white border-slate-200 p-1" align="end">
                            <div className="space-y-0.5">
                                <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); setEditJob(job); setEditOpen(true); }}>
                                    <Edit className="mr-2 h-3.5 w-3.5 text-indigo-600" /> Edit Booking
                                </Button>
                                <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => {
                                    e.stopPropagation();
                                    const ev = new CustomEvent('copy-booking', { detail: job });
                                    window.dispatchEvent(ev);
                                }}>
                                    <Copy className="mr-2 h-3.5 w-3.5 text-blue-500" /> Copy Booking
                                </Button>
                                <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); setSelectedDetailsJob(job); setDetailsOpen(true); }}>
                                    <AlertCircle className="mr-2 h-3.5 w-3.5 text-slate-500" /> Load Details
                                </Button>
                                <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => { e.stopPropagation(); setDesignateJob(job); setDesignateOpen(true); }}>
                                    <Car className="mr-2 h-3.5 w-3.5 text-purple-500" /> Designate Driver
                                </Button>
                                <Button variant="ghost" className="w-full justify-start h-8 text-xs font-normal" onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendNotification('CONFIRMATION', job.id);
                                }}>
                                    <div className="flex items-center">
                                        <div className="w-[14px] mr-2 flex justify-center"><Send className="h-3 w-3 text-blue-500" /></div>
                                        Resend Confirmation
                                    </div>
                                </Button>

                                {/* Accept Booking */}
                                {job.status === 'PENDING' && (
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start h-8 text-xs font-normal"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleAcceptBooking(job);
                                        }}
                                    >
                                        <CheckCircle className="mr-2 h-3.5 w-3.5 text-emerald-500" /> Accept & Confirm
                                    </Button>
                                )}

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

                                {/* Manual Dispatch / Assign */}
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

                                {/* Switch Driver (For Dispatched / Active Jobs) */}
                                {['DISPATCHED', 'EN_ROUTE', 'ARRIVED', 'POB'].includes(job.status) && (
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start h-8 text-xs font-normal"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setDispatchJob(job);
                                            setDispatchOpen(true);
                                        }}
                                    >
                                        <RefreshCw className="mr-2 h-3.5 w-3.5 text-amber-500" /> Switch Driver
                                    </Button>
                                )}

                                
                                    {/* Payment Link / QR */}
                                    {job.fare && job.status !== 'CANCELLED' && job.status !== 'COMPLETED' && (
                                        <Button
                                            variant="ghost"
                                            className="w-full justify-start h-8 text-xs font-normal"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleOpenQr(job);
                                            }}
                                        >
                                            <QrCode className="mr-2 h-3.5 w-3.5 text-indigo-500" /> Payment Link / QR
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
                                
                                {/* Cancel Action / Stripe Refund */}
                                {job.status !== 'CANCELLED' && (
                                    <>
                                        {(job.paymentStatus === 'PAID' && job.paymentProvider === 'STRIPE') ? (
                                            <Button
                                                variant="ghost"
                                                className="w-full justify-start h-8 text-xs font-normal text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    if (confirm("This will issue a real Stripe refund and cancel the booking. Continue?")) {
                                                        try {
                                                            const res = await fetch(`/api/jobs/${job.id}/refund`, {
                                                                method: 'POST',
                                                            });
                                                            const data = await res.json();
                                                            if (res.ok) {
                                                                toast.success("Stripe refund created and booking cancelled");
                                                                fetchJobs();
                                                            } else {
                                                                toast.error(data.error || "Failed to process refund");
                                                            }
                                                        } catch (err) {
                                                            console.error(err);
                                                            toast.error("Error processing refund");
                                                        }
                                                    }
                                                }}
                                            >
                                                <RefreshCcw className="mr-2 h-3.5 w-3.5 text-purple-500" /> 
                                                Stripe Refund & Cancel
                                            </Button>
                                        ) : (
                                            <Button
                                                variant="ghost"
                                                className="w-full justify-start h-8 text-xs font-normal text-red-600 hover:text-red-700 hover:bg-red-50"
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    const isPaid = job.paymentStatus === 'PAID' || job.paymentStatus === 'AUTHORIZED';
                                                    const confirmMessage = isPaid 
                                                        ? "Are you sure you want to cancel this booking? NOTE: Refund must be processed separately." 
                                                        : "Are you sure you want to cancel this booking?";
                                                        
                                                    if (confirm(confirmMessage)) {
                                                        try {
                                                            const res = await fetch(`/api/jobs/${job.id}`, {
                                                                method: 'PATCH',
                                                                headers: { 'Content-Type': 'application/json' },
                                                                body: JSON.stringify({ status: 'CANCELLED' })
                                                            });
                                                            if (res.ok) {
                                                                toast.success("Booking cancelled successfully");
                                                                fetchJobs();
                                                            } else {
                                                                toast.error("Failed to cancel booking");
                                                            }
                                                        } catch (err) {
                                                            console.error(err);
                                                            toast.error("Error cancelling booking");
                                                        }
                                                    }
                                                }}
                                            >
                                                <Ban className="mr-2 h-3.5 w-3.5 text-red-500" /> 
                                                {(job.paymentStatus === 'PAID' || job.paymentStatus === 'AUTHORIZED') ? 'Cancel (Refund separately)' : 'Cancel Booking'}
                                            </Button>
                                        )}
                                    </>
                                )}

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

    const displayedJobs = searchQuery ? jobs : filterJobs(activeTab);

    return (
        <div className="h-full flex flex-col bg-slate-50">
            <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <div className="flex items-center gap-2 pb-2">
                        <div className="flex-1 overflow-x-auto scrollbar-none">
                            <TabsList className="inline-flex w-auto bg-slate-100 border border-slate-200 h-9 p-1 gap-1">
                                <TabsTrigger value="PENDING_NOW" className="px-3 text-[10px] data-[state=active]:bg-indigo-600 data-[state=active]:text-white font-bold uppercase whitespace-nowrap">
                                    Pending {filterJobs('PENDING_NOW').length > 0 && `(${filterJobs('PENDING_NOW').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="TODAY" className="px-3 text-[10px] data-[state=active]:bg-teal-500 data-[state=active]:text-white font-bold uppercase whitespace-nowrap">
                                    Today {filterJobs('TODAY').length > 0 && `(${filterJobs('TODAY').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="FUTURE" className="px-3 text-[10px] data-[state=active]:bg-zinc-700 data-[state=active]:text-white font-bold uppercase whitespace-nowrap">
                                    Future {filterJobs('FUTURE').length > 0 && `(${filterJobs('FUTURE').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="DISPATCHED" className="px-3 text-[10px] data-[state=active]:bg-blue-500 data-[state=active]:text-white font-bold uppercase whitespace-nowrap">
                                    Dispatched {filterJobs('DISPATCHED').length > 0 && `(${filterJobs('DISPATCHED').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="POB" className="px-3 text-[10px] data-[state=active]:bg-pink-500 data-[state=active]:text-white font-bold uppercase whitespace-nowrap">
                                    POB {filterJobs('POB').length > 0 && `(${filterJobs('POB').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="COMPLETED" className="px-3 text-[10px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white font-bold uppercase whitespace-nowrap">
                                    Completed {filterJobs('COMPLETED').length > 0 && `(${filterJobs('COMPLETED').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="CANCELLED" className="px-3 text-[10px] data-[state=active]:bg-red-500 data-[state=active]:text-white font-bold uppercase whitespace-nowrap">
                                    Cancelled {filterJobs('CANCELLED').length > 0 && `(${filterJobs('CANCELLED').length})`}
                                </TabsTrigger>
                                <TabsTrigger value="NO_SHOW" className="px-3 text-[10px] data-[state=active]:bg-zinc-500 data-[state=active]:text-white font-bold uppercase whitespace-nowrap">
                                    No Show {filterJobs('NO_SHOW').length > 0 && `(${filterJobs('NO_SHOW').length})`}
                                </TabsTrigger>
                            </TabsList>
                        </div>
                        {/* Search Input Box */}
                        <div className="relative w-48 md:w-64 shrink-0">
                            <input
                                type="text"
                                placeholder="Search name, phone, address, ID..."
                                className="w-full bg-slate-100 border border-slate-200 rounded-md py-1.5 pl-8 pr-8 text-xs text-slate-900 focus:outline-none focus:border-blue-500/50"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2 top-1.5 h-5 w-5 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full text-xs font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        <Button variant="outline" size="icon" className="h-9 w-9 border-slate-200 bg-slate-100 text-slate-500 hover:text-slate-900 hover:bg-slate-200 shrink-0" onClick={() => fetchJobs(true, searchQuery)}>
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
                                <SelectItem value="ALL">All Future</SelectItem>
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

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-200/60">
                {loading ? (
                    <div className="text-center py-20 text-slate-500 animate-pulse">Loading jobs...</div>
                ) : displayedJobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-slate-200 rounded-lg bg-slate-50">
                        <AlertCircle className="h-8 w-8 mb-2 opacity-20" />
                        <p className="text-sm">{searchQuery ? "No search matches found." : "No bookings in this category."}</p>
                        {activeTab === 'FUTURE' && !searchQuery && <p className="text-xs text-slate-400 mt-1">Try adjusting the period filter.</p>}
                    </div>
                ) : (
                    displayedJobs.map(job => (
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

            {/* Payment QR Modal */}
            <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
                <DialogContent className="max-w-sm bg-white text-slate-900 border border-slate-200 shadow-xl">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black text-slate-950 flex items-center gap-2">
                            <QrCode className="w-5 h-5 text-indigo-600" />
                            Payment Link
                        </DialogTitle>
                    </DialogHeader>
                    {qrJob && (
                        <div className="space-y-4 pt-2">
                            <div className="text-center space-y-1">
                                <h3 className="font-bold text-slate-800">Booking #{qrJob.id}</h3>
                                <p className="text-sm text-slate-500">{qrJob.passengerName || 'Passenger'}</p>
                                <p className="text-xl font-black text-slate-900">£{(qrJob.fare || qrJob.price || 0).toFixed(2)}</p>
                            </div>

                            {qrJob.paymentStatus === 'PAID' ? (
                                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-center">
                                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                                    <p className="font-bold text-emerald-700">Already Paid</p>
                                </div>
                            ) : (
                                <>
                                    {qrLoading ? (
                                        <div className="flex justify-center items-center h-48">
                                            <RefreshCw className="w-8 h-8 text-indigo-300 animate-spin" />
                                        </div>
                                    ) : (
                                        <>
                                            {qrCodeDataUrl ? (
                                                <div className="flex justify-center p-4 bg-white border border-slate-100 rounded-xl shadow-inner">
                                                    <img src={qrCodeDataUrl} alt="Payment QR Code" className="w-48 h-48" />
                                                </div>
                                            ) : (
                                                <div className="flex justify-center items-center h-48 bg-slate-50 rounded-xl border border-slate-100">
                                                    <p className="text-slate-400 text-sm">QR Code unavailable</p>
                                                </div>
                                            )}
                                            
                                            {qrLink && (
                                                <div className="space-y-2 pt-2">
                                                    <Button 
                                                        variant="outline" 
                                                        className="w-full flex items-center gap-2"
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(qrLink);
                                                            toast.success('Link copied to clipboard');
                                                        }}
                                                    >
                                                        <Copy className="w-4 h-4 text-slate-500" /> Copy Payment Link
                                                    </Button>
                                                    <Button 
                                                        className="w-full flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                                                        onClick={() => window.open(qrLink, '_blank')}
                                                    >
                                                        <LinkIcon className="w-4 h-4" /> Open Payment Link
                                                    </Button>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
                <DialogContent className="max-w-2xl bg-white text-slate-900 border border-slate-200 shadow-xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-black text-slate-950 flex items-center gap-2">
                            <span>Booking Details: Job #{selectedDetailsJob?.id}</span>
                            {selectedDetailsJob && (
                                <Badge variant="outline" className={`${getStatusColor(selectedDetailsJob.status)} font-mono text-[10px] tracking-wider`}>
                                    {selectedDetailsJob.status}
                                </Badge>
                            )}
                        </DialogTitle>
                    </DialogHeader>

                    {selectedDetailsJob && (
                        <div className="space-y-6 text-sm">
                            {/* Route & Core Details */}
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                                <div>
                                    <h4 className="text-[10px] uppercase font-bold text-slate-400">Pickup</h4>
                                    <p className="font-semibold text-slate-800">{selectedDetailsJob.pickupAddress}</p>
                                    {selectedDetailsJob.pickupLat && selectedDetailsJob.pickupLng && (
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                            Coords: {selectedDetailsJob.pickupLat.toFixed(5)}, {selectedDetailsJob.pickupLng.toFixed(5)}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-[10px] uppercase font-bold text-slate-400">Destination</h4>
                                    <p className="font-semibold text-slate-800">{selectedDetailsJob.dropoffAddress}</p>
                                    {selectedDetailsJob.dropoffLat && selectedDetailsJob.dropoffLng && (
                                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                                            Coords: {selectedDetailsJob.dropoffLat.toFixed(5)}, {selectedDetailsJob.dropoffLng.toFixed(5)}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Passenger & Driver */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <h4 className="text-[10px] uppercase font-bold text-slate-400 border-b pb-1">Passenger</h4>
                                    <div className="space-y-1">
                                        <p className="font-semibold">{selectedDetailsJob.passengerName}</p>
                                        <p className="text-slate-600">
                                            <a href={`tel:${selectedDetailsJob.passengerPhone}`} className="hover:underline text-blue-600 font-mono">
                                                {selectedDetailsJob.passengerPhone}
                                            </a>
                                        </p>
                                        {selectedDetailsJob.passengerEmail && (
                                            <p className="text-xs text-slate-500">{selectedDetailsJob.passengerEmail}</p>
                                        )}
                                        <p className="text-xs text-slate-500">
                                            Pax: {selectedDetailsJob.passengers} | Luggage: {selectedDetailsJob.luggage}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <h4 className="text-[10px] uppercase font-bold text-slate-400 border-b pb-1">Driver & Dispatch</h4>
                                    <div className="space-y-1">
                                        {selectedDetailsJob.driver ? (
                                            <>
                                                <p className="font-semibold text-purple-700">
                                                    Assigned: {selectedDetailsJob.driver.name} ({selectedDetailsJob.driver.callsign})
                                                </p>
                                                {selectedDetailsJob.driver.phone && (
                                                    <p className="text-slate-600">
                                                        <a href={`tel:${selectedDetailsJob.driver.phone}`} className="hover:underline text-blue-600 font-mono">
                                                            {selectedDetailsJob.driver.phone}
                                                        </a>
                                                    </p>
                                                )}
                                            </>
                                        ) : selectedDetailsJob.preAssignedDriver ? (
                                            <p className="font-semibold text-amber-600">
                                                Designated: {selectedDetailsJob.preAssignedDriver.name} ({selectedDetailsJob.preAssignedDriver.callsign})
                                            </p>
                                        ) : (
                                            <p className="text-slate-400 italic text-xs">No driver assigned</p>
                                        )}
                                        <p className="text-xs text-slate-500">
                                            Vehicle Type: {selectedDetailsJob.vehicleType}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            Auto Dispatch: {selectedDetailsJob.autoDispatch ? "ENABLED" : "DISABLED"}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Financials */}
                            <div className="grid grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <div>
                                    <h4 className="text-[10px] uppercase font-bold text-slate-400">Quoted Fare</h4>
                                    <p className="text-lg font-bold text-slate-900">£{selectedDetailsJob.fare?.toFixed(2) || '0.00'}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] uppercase font-bold text-slate-400">Payment Type</h4>
                                    <p className="font-bold text-slate-700">{selectedDetailsJob.paymentType}</p>
                                </div>
                                <div>
                                    <h4 className="text-[10px] uppercase font-bold text-slate-400">Payment Status</h4>
                                    <Badge variant="secondary" className="bg-slate-200 text-slate-800 border-none font-bold">
                                        {selectedDetailsJob.paymentStatus || 'UNPAID'}
                                    </Badge>
                                </div>
                            </div>

                            {/* Notes & Extra Info */}
                            {(selectedDetailsJob.notes || selectedDetailsJob.flightNumber) && (
                                <div className="space-y-2">
                                    <h4 className="text-[10px] uppercase font-bold text-slate-400 border-b pb-1">Extra Details</h4>
                                    {selectedDetailsJob.flightNumber && (
                                        <p className="text-xs font-mono text-slate-700">
                                            ✈️ Flight Number: {selectedDetailsJob.flightNumber}
                                        </p>
                                    )}
                                    {selectedDetailsJob.notes && (
                                        <div className="bg-amber-50/50 p-3 rounded border border-amber-100 text-slate-700 text-xs whitespace-pre-wrap font-mono">
                                            {selectedDetailsJob.notes}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Audit Log / Timestamps */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] uppercase font-bold text-slate-400 border-b pb-1">System Audit & Status History</h4>
                                <div className="grid grid-cols-2 gap-4 text-xs text-slate-500">
                                    <div>
                                        <span className="font-semibold text-slate-700">Created:</span>{' '}
                                        {new Date(selectedDetailsJob.createdAt).toLocaleString()}
                                        {selectedDetailsJob.bookedBy ? (
                                            <span className="block text-slate-400 mt-0.5">
                                                by {selectedDetailsJob.bookedBy.name || selectedDetailsJob.bookedBy.email}
                                            </span>
                                        ) : (
                                            <span className="block text-slate-400 mt-0.5">by System / Web Booker</span>
                                        )}
                                    </div>
                                    <div>
                                        <span className="font-semibold text-slate-700">Last Activity:</span>{' '}
                                        {new Date(selectedDetailsJob.updatedAt).toLocaleString()}
                                    </div>
                                </div>

                                <div className="space-y-2 mt-2">
                                    <h5 className="text-[10px] font-bold text-slate-500">Recent Transitions</h5>
                                    {logsLoading ? (
                                        <div className="text-xs text-slate-400 animate-pulse">Loading system log timeline...</div>
                                    ) : auditLogs.length === 0 ? (
                                        <div className="text-xs text-slate-400 italic">No specific mutations recorded in global logs.</div>
                                    ) : (
                                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                                            {auditLogs.map((log, idx) => (
                                                <div key={idx} className="bg-slate-50 p-2 rounded border border-slate-200 text-[11px]">
                                                    <div className="flex justify-between font-bold text-slate-700">
                                                        <span>{log.action}</span>
                                                        <span className="font-mono text-slate-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                                    </div>
                                                    <p className="text-slate-600 mt-0.5">{log.description}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Related Call Recordings */}
                            <div className="space-y-3">
                                <h4 className="text-[10px] uppercase font-bold text-slate-400 border-b pb-1">Related Call Recordings & Transcripts</h4>
                                {selectedDetailsJob.calls && selectedDetailsJob.calls.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedDetailsJob.calls.map((call: any, idx: number) => (
                                            <div key={idx} className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                                                <div className="flex justify-between items-center text-xs text-slate-500 font-mono">
                                                    <span className="flex items-center gap-1">
                                                        <Phone className="h-3 w-3 text-slate-400" /> {call.phone}
                                                    </span>
                                                    <span>{new Date(call.createdAt).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center text-xs">
                                                    <div>
                                                        <span className="font-semibold text-slate-700">Status:</span>{' '}
                                                        <span className={call.status === 'ANSWERED' ? 'text-emerald-600 font-bold' : 'text-slate-500'}>
                                                            {call.status}
                                                        </span>
                                                        {call.answeredByExt && (
                                                            <span className="text-slate-400 ml-2">Ext: {call.answeredByExt}</span>
                                                        )}
                                                    </div>
                                                    {call.duration && (
                                                        <span className="font-mono text-slate-400">{call.duration}s</span>
                                                    )}
                                                </div>
                                                {call.recordingUrl && (
                                                    <div className="space-y-1 pt-1">
                                                        <h5 className="text-[10px] font-bold text-slate-400 flex items-center gap-1 uppercase">
                                                            <Volume2 className="h-3 w-3" /> Audio Recording
                                                        </h5>
                                                        <audio controls className="w-full h-8 border rounded bg-white" src={call.recordingUrl} />
                                                    </div>
                                                )}
                                                {call.summary && (
                                                    <div className="space-y-0.5 bg-indigo-50/50 p-2.5 rounded border border-indigo-100/50">
                                                        <h5 className="text-[10px] font-bold text-indigo-700 uppercase">AI Summary</h5>
                                                        <p className="text-xs text-slate-700 leading-relaxed font-sans">{call.summary}</p>
                                                    </div>
                                                )}
                                                {call.transcript && (
                                                    <div className="space-y-1">
                                                        <h5 className="text-[10px] font-bold text-slate-400 uppercase">Call Transcript</h5>
                                                        <div className="border border-slate-200 rounded p-2 text-[10px] bg-white leading-relaxed max-h-[100px] overflow-y-auto font-mono whitespace-pre-line text-slate-600">
                                                            {call.transcript}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-400 italic">No call records associated with this booking.</p>
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
