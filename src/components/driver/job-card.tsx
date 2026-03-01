
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Phone, User, Clock, MapPin } from 'lucide-react';

export function JobCard({ job, onStatusUpdate, onReject }: { job: any, onStatusUpdate: (id: number, status: string, paymentType?: string) => void, onReject?: (id: number) => void }) {
    const [showPayment, setShowPayment] = useState(false);

    if (!job) return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/20">
            <Clock className="h-12 w-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-zinc-300">No Active Jobs</h3>
            <p className="text-sm">You're online and waiting for dispatch.</p>
        </div>
    );

    const isOffer = job.status === 'DISPATCHED' || job.status === 'PENDING'; // "Offer" state for driver
    const isInProgress = ['EN_ROUTE', 'ARRIVED', 'POB'].includes(job.status);
    const isHistory = ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(job.status);

    return (
        <div className="relative bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-2">
            {/* Header / Status */}
            <div className={`p-4 flex justify-between items-center ${isOffer ? 'bg-amber-500/10 border-b border-amber-500/20' : 'bg-blue-500/10 border-b border-blue-500/20'}`}>
                <Badge className={isOffer ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-blue-500 text-white hover:bg-blue-400'}>
                    {isOffer ? 'NEW JOB OFFER' : job.status.replace('_', ' ')}
                </Badge>
                <div className="text-right">
                    <span className="block text-2xl font-bold text-white">£{job.fare?.toFixed(2)}</span>
                    <span className="text-[10px] text-zinc-400 uppercase">{job.paymentType}</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
                {/* Time */}
                <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-zinc-500" />
                    <div>
                        <div className="text-lg font-bold text-white">
                            {new Date(job.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-xs text-zinc-500 uppercase">
                            {new Date(job.pickupTime).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                {/* Flight Number Badge */}
                {job.flightNumber && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-400 text-xs font-medium w-fit">
                        ✈️ Fight: {job.flightNumber}
                    </div>
                )}

                {/* Route */}
                <div className="space-y-4 relative">
                    {/* Connector Line */}
                    <div className="absolute left-[9px] top-8 bottom-8 w-[2px] bg-zinc-800"></div>

                    {/* Pickup */}
                    <div className="flex gap-3 relative z-10">
                        <div className="mt-1 h-5 w-5 rounded-full bg-zinc-900 border-2 border-emerald-500 flex items-center justify-center shrink-0">
                            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 font-bold uppercase mb-0.5">Pickup</p>
                            <p className="text-sm text-zinc-200 font-medium leading-snug">{job.pickupAddress}</p>
                            {!isHistory && (
                                <Button variant="link" className="h-auto p-0 text-emerald-500 text-xs mt-1" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.pickupAddress)}`, '_blank')}>
                                    <Navigation className="h-3 w-3 mr-1" /> Navigate
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Dropoff */}
                    <div className="flex gap-3 relative z-10">
                        <div className="mt-1 h-5 w-5 rounded-full bg-zinc-900 border-2 border-amber-500 flex items-center justify-center shrink-0">
                            <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                        </div>
                        <div>
                            <p className="text-xs text-zinc-500 font-bold uppercase mb-0.5">Dropoff</p>
                            <p className="text-sm text-zinc-200 font-medium leading-snug">{job.dropoffAddress}</p>
                            {!isHistory && isInProgress && (
                                <Button variant="link" className="h-auto p-0 text-amber-500 text-xs mt-1" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.dropoffAddress)}`, '_blank')}>
                                    <Navigation className="h-3 w-3 mr-1" /> Navigate
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Passenger */}
                <div className="bg-zinc-950/50 rounded-lg p-3 flex justify-between items-center border border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-zinc-800 flex items-center justify-center">
                            <User className="h-5 w-5 text-zinc-400" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-white">{job.passengerName}</p>
                            <p className="text-xs text-zinc-500">{job.passengers} Pax &bull; {job.luggage} Lug</p>
                        </div>
                    </div>
                    {!isHistory && (
                        <Button size="icon" variant="ghost" className="h-10 w-10 text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20" onClick={() => window.location.href = `tel:${job.passengerPhone}`}>
                            <Phone className="h-5 w-5" />
                        </Button>
                    )}
                </div>

                {/* Notes */}
                {job.notes && (
                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-3">
                        <p className="text-xs text-amber-500 font-medium whitespace-pre-wrap">{job.notes}</p>
                    </div>
                )}
            </div>

            {/* Actions for Active Jobs */}
            {!isHistory && (
                <div className="p-4 bg-zinc-950 border-t border-zinc-800">
                    {isOffer ? (
                        <div className="grid grid-cols-2 gap-3">
                            <Button
                                variant="outline"
                                className="h-14 text-lg font-bold border-red-500/50 text-red-500 hover:bg-red-500/10"
                                onClick={() => onReject && onReject(job.id)}
                            >
                                REJECT
                            </Button>
                            <Button
                                className="h-14 text-lg font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-900/20"
                                onClick={() => onStatusUpdate(job.id, 'EN_ROUTE')}
                            >
                                ACCEPT
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {job.status === 'EN_ROUTE' && (
                                <>
                                    <Button className="w-full h-14 text-lg font-bold bg-pink-600 hover:bg-pink-500 text-white" onClick={() => onStatusUpdate(job.id, 'ARRIVED')}>
                                        ARRIVED
                                    </Button>
                                    <Button variant="outline" className="w-full h-12 text-sm font-bold border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={() => onStatusUpdate(job.id, 'CANCELLED')}>
                                        CANCEL JOB
                                    </Button>
                                </>
                            )}
                            {job.status === 'ARRIVED' && (
                                <>
                                    <Button className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-500 text-white" onClick={() => onStatusUpdate(job.id, 'POB')}>
                                        PASSENGER ON BOARD
                                    </Button>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button variant="outline" className="h-12 text-sm font-bold border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={() => onStatusUpdate(job.id, 'CANCELLED')}>
                                            CANCEL JOB
                                        </Button>
                                        <Button variant="outline" className="h-12 text-sm font-bold border-orange-500/50 text-orange-500 hover:bg-orange-500/10" onClick={() => onStatusUpdate(job.id, 'NO_SHOW')}>
                                            NO SHOW
                                        </Button>
                                    </div>
                                </>
                            )}
                            {job.status === 'POB' && (
                                <Button className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-white" onClick={() => {
                                    if (job.paymentType === 'ACCOUNT') {
                                        onStatusUpdate(job.id, 'COMPLETED', 'ACCOUNT');
                                    } else {
                                        setShowPayment(true);
                                    }
                                }}>
                                    COMPLETE JOB
                                </Button>
                            )}
                        </div>
                    )}
                </div>
            )}

            {showPayment && (
                <div className="absolute inset-0 z-50 bg-zinc-950/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                    <h3 className="text-xl font-bold text-white mb-2">Payment Collection</h3>
                    <p className="text-4xl font-black text-emerald-400 mb-2">£{job.fare?.toFixed(2)}</p>
                    <p className="text-zinc-400 text-sm mb-8">Please process payment or confirm cash received.</p>

                    <div className="w-full space-y-3">
                        <Button
                            className="w-full h-14 text-lg font-bold bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700"
                            onClick={() => onStatusUpdate(job.id, 'COMPLETED', 'CASH')}
                        >
                            💵 Collect Cash
                        </Button>
                        <Button
                            className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                            onClick={() => onStatusUpdate(job.id, 'COMPLETED', 'IN_CAR_TERMINAL')}
                        >
                            💳 Card Terminal
                        </Button>
                        <Button
                            variant="ghost"
                            className="w-full h-12 text-zinc-500 mt-4"
                            onClick={() => setShowPayment(false)}
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
