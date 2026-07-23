
'use client';

import { useState } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Navigation, Phone, User, Clock, MapPin, QrCode, Send, CheckCircle, RefreshCw, Copy, Mail } from 'lucide-react';

export function JobCard({ job, onStatusUpdate, onReject }: { job: any, onStatusUpdate: (id: number, status: string, paymentType?: string, options?: any) => void, onReject?: (id: number) => void }) {
    const [showPayment, setShowPayment] = useState(false);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [qrLink, setQrLink] = useState<string | null>(null);
    const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
    const [qrLoading, setQrLoading] = useState(false);
    const [isSendingEmail, setIsSendingEmail] = useState(false);
    const [isManualConfirming, setIsManualConfirming] = useState<'CASH' | 'TERMINAL' | null>(null);
    const [selectedTerminal, setSelectedTerminal] = useState<'SUMUP' | 'ZETTLE' | 'OTHER_TERMINAL'>('SUMUP');
    const [isProcessingManual, setIsProcessingManual] = useState(false);

    const handleManualPayment = async (method: 'CASH' | 'SUMUP' | 'ZETTLE' | 'OTHER_TERMINAL') => {
        setIsProcessingManual(true);
        try {
            const token = localStorage.getItem('driver_token');
            const res = await fetch(`/api/mobile/driver/jobs/${job.id}/manual-payment`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ method })
            });
            const data = await res.json();
            if (res.ok && data.success) {
                toast.success('Payment confirmed successfully');
                setIsManualConfirming(null);
                setShowPayment(false);
                onStatusUpdate(job.id, 'COMPLETED', method === 'CASH' ? 'CASH' : 'IN_CAR_TERMINAL');
            } else {
                toast.error(data.error || 'Failed to confirm payment');
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error during manual confirmation');
        } finally {
            setIsProcessingManual(false);
        }
    };

    const handleGenerateQr = async () => {
        setQrModalOpen(true);
        setQrLink(null);
        setQrCodeDataUrl(null);
        
        if (job.paymentStatus === 'PAID') {
            return;
        }

        setQrLoading(true);
        try {
            const res = await fetch(`/api/mobile/driver/jobs/${job.id}/payment-link`, { method: 'POST' });
            const data = await res.json();
            
            if (data.success && data.url) {
                setQrLink(data.url);
                try {
                    const qrDataUrl = await QRCode.toDataURL(data.url, { width: 300, margin: 2 });
                    setQrCodeDataUrl(qrDataUrl);
                } catch (qrErr) {
                    console.error('QR Generate Error', qrErr);
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

    const handleSendSms = async () => {
        try {
            const res = await fetch(`/api/mobile/driver/jobs/${job.id}/payment/sms`, { method: 'POST' });
            if (res.ok) {
                toast.success("Track & Pay SMS sent successfully");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to send Track & Pay SMS");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error sending Track & Pay SMS");
        }
    };

    const handleSendEmail = async () => {
        if (!job.passengerEmail && !job.customer?.email) {
            toast.error("No customer email available");
            return;
        }
        setIsSendingEmail(true);
        try {
            const res = await fetch(`/api/mobile/driver/jobs/${job.id}/payment/email`, { method: 'POST' });
            if (res.ok) {
                toast.success("Payment Link email sent successfully");
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to send Payment Link email");
            }
        } catch (err) {
            console.error(err);
            toast.error("Error sending Payment Link email");
        } finally {
            setIsSendingEmail(false);
        }
    };

    if (!job) return (
        <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-zinc-900/20">
            <Clock className="h-12 w-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-slate-600">No Active Jobs</h3>
            <p className="text-sm">You're online and waiting for dispatch.</p>
        </div>
    );

    const isOffer = job.status === 'DISPATCHED' || job.status === 'PENDING'; // "Offer" state for driver
    const isInProgress = ['EN_ROUTE', 'ARRIVED', 'POB'].includes(job.status);
    const isHistory = ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(job.status);

    return (
        <div className="relative bg-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-lg animate-in fade-in slide-in-from-bottom-2">
            {/* Header / Status */}
            <div className={`p-4 flex justify-between items-center ${isOffer ? 'bg-indigo-600/10 border-b border-indigo-600/20' : 'bg-blue-500/10 border-b border-blue-500/20'}`}>
                <Badge className={isOffer ? 'bg-indigo-600 text-black hover:bg-blue-500' : 'bg-blue-500 text-slate-900 hover:bg-blue-400'}>
                    {isOffer ? 'NEW JOB OFFER' : job.status.replace('_', ' ')}
                </Badge>
                <div className="text-right">
                    <span className="block text-2xl font-bold text-slate-900">£{job.fare?.toFixed(2)}</span>
                    <span className="text-[10px] text-slate-500 uppercase">{job.paymentType}</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-6">
                {/* Time */}
                <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-slate-400" />
                    <div>
                        <div className="text-lg font-bold text-slate-900">
                            {new Date(job.pickupTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-xs text-slate-400 uppercase">
                            {new Date(job.pickupTime).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                {/* Flight Number Badge */}
                {job.flightNumber && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded text-blue-500 text-xs font-medium w-fit">
                        ✈️ Fight: {job.flightNumber}
                    </div>
                )}

                {/* Route */}
                <div className="space-y-4 relative">
                    {/* Connector Line */}
                    <div className="absolute left-[9px] top-8 bottom-8 w-[2px] bg-slate-200"></div>

                    {/* Pickup */}
                    <div className="flex gap-3 relative z-10">
                        <div className="mt-1 h-5 w-5 rounded-full bg-slate-100 border-2 border-emerald-500 flex items-center justify-center shrink-0">
                            <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase mb-0.5">Pickup</p>
                            <p className="text-sm text-slate-800 font-medium leading-snug">{job.pickupAddress}</p>
                            {!isHistory && (
                                <Button variant="link" className="h-auto p-0 text-emerald-500 text-xs mt-1" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.pickupAddress)}`, '_blank')}>
                                    <Navigation className="h-3 w-3 mr-1" /> Navigate
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Dropoff */}
                    <div className="flex gap-3 relative z-10">
                        <div className="mt-1 h-5 w-5 rounded-full bg-slate-100 border-2 border-indigo-600 flex items-center justify-center shrink-0">
                            <div className="h-2 w-2 rounded-full bg-indigo-600"></div>
                        </div>
                        <div>
                            <p className="text-xs text-slate-400 font-bold uppercase mb-0.5">Dropoff</p>
                            <p className="text-sm text-slate-800 font-medium leading-snug">{job.dropoffAddress}</p>
                            {!isHistory && isInProgress && (
                                <Button variant="link" className="h-auto p-0 text-indigo-600 text-xs mt-1" onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.dropoffAddress)}`, '_blank')}>
                                    <Navigation className="h-3 w-3 mr-1" /> Navigate
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Passenger */}
                <div className="bg-white rounded-lg p-3 flex justify-between items-center border border-slate-200">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                            <User className="h-5 w-5 text-slate-500" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-900">{job.passengerName}</p>
                            <p className="text-xs text-slate-400">{job.passengers} Pax &bull; {job.luggage} Lug</p>
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
                    <div className="bg-indigo-600/5 border border-indigo-600/10 rounded-lg p-3">
                        <p className="text-xs text-indigo-600 font-medium whitespace-pre-wrap">{job.notes}</p>
                    </div>
                )}
            </div>

            {/* Actions for Active Jobs */}
            {!isHistory && (
                <div className="p-4 bg-white border-t border-slate-200">
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
                                className="h-14 text-lg font-bold bg-indigo-600 hover:bg-blue-500 text-black shadow-lg shadow-indigo-900/20"
                                onClick={() => onStatusUpdate(job.id, 'EN_ROUTE')}
                            >
                                ACCEPT
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3">
                            {job.status === 'EN_ROUTE' && (
                                <>
                                    <Button className="w-full h-14 text-lg font-bold bg-pink-600 hover:bg-pink-500 text-slate-900" onClick={() => onStatusUpdate(job.id, 'ARRIVED')}>
                                        ARRIVED
                                    </Button>
                                    <Button variant="outline" className="w-full h-12 text-sm font-bold border-red-500/50 text-red-500 hover:bg-red-500/10" onClick={() => onStatusUpdate(job.id, 'CANCELLED')}>
                                        CANCEL JOB
                                    </Button>
                                </>
                            )}
                            {job.status === 'ARRIVED' && (
                                <>
                                    <Button className="w-full h-14 text-lg font-bold bg-purple-600 hover:bg-purple-500 text-slate-900" onClick={() => onStatusUpdate(job.id, 'POB')}>
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
                                <Button className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-slate-900" onClick={() => {
                                    setShowPayment(true);
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
                    <h3 className="text-xl font-bold text-slate-100 mb-2">Payment Collection</h3>
                    <p className="text-4xl font-black text-emerald-500 mb-2">£{job.fare?.toFixed(2)}</p>
                    
                    {job.paymentStatus === 'PAID' ? (
                        <div className="w-full space-y-6">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-6 rounded-xl text-center mb-6">
                                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                                <p className="font-bold text-lg text-emerald-400">Payment Completed</p>
                                <p className="text-emerald-500/70 text-sm">Stripe Card Payment</p>
                            </div>
                            <Button
                                className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-slate-900"
                                onClick={() => onStatusUpdate(job.id, 'COMPLETED', 'STRIPE')}
                            >
                                FINISH JOB
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full h-12 text-slate-400 mt-4"
                                onClick={() => setShowPayment(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    ) : job.paymentStatus === 'REFUNDED' ? (
                        <div className="w-full space-y-6">
                            <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-xl text-center mb-6">
                                <p className="font-bold text-lg text-amber-400">Payment Refunded</p>
                            </div>
                            <Button
                                className="w-full h-14 text-lg font-bold bg-slate-200 hover:bg-zinc-700 text-slate-900 border border-slate-300"
                                onClick={() => onStatusUpdate(job.id, 'COMPLETED', 'CASH')}
                            >
                                💵 Collect Cash Instead
                            </Button>
                            <Button
                                variant="ghost"
                                className="w-full h-12 text-slate-400 mt-4"
                                onClick={() => setShowPayment(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    ) : job.status === 'CANCELLED' ? (
                        <div className="w-full space-y-6">
                            <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-xl text-center mb-6">
                                <p className="font-bold text-lg text-red-400">Job Cancelled</p>
                            </div>
                            <Button
                                variant="ghost"
                                className="w-full h-12 text-slate-400 mt-4"
                                onClick={() => setShowPayment(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    ) : (
                        <>
                            <p className="text-slate-400 text-sm mb-8">Please process payment or confirm cash received.</p>
                            <div className="w-full space-y-3">
                                <Button
                                    className="w-full h-14 text-lg font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20"
                                    onClick={handleGenerateQr}
                                >
                                    <QrCode className="mr-2 h-5 w-5" /> Show QR Code
                                </Button>
                                <Button
                                    className="w-full h-14 text-lg font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-900/20"
                                    onClick={handleSendSms}
                                >
                                    <Send className="mr-2 h-5 w-5" /> Send SMS Payment Link
                                </Button>
                                <Button
                                    className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
                                    disabled={isSendingEmail}
                                    onClick={handleSendEmail}
                                >
                                    <Mail className="mr-2 h-5 w-5" /> {isSendingEmail ? "Sending..." : "Send Email Payment Link"}
                                </Button>
                                
                                <div className="py-2 flex items-center justify-center">
                                    <div className="h-px w-full bg-slate-800"></div>
                                    <span className="px-4 text-xs font-bold text-slate-500 uppercase tracking-widest">OR</span>
                                    <div className="h-px w-full bg-slate-800"></div>
                                </div>
                                
                                {!isManualConfirming ? (
                                    <>
                                        {job.paymentType === 'CASH' && (
                                            <>
                                                <Button
                                                    className="w-full h-14 text-lg font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                                                    onClick={() => setIsManualConfirming('CASH')}
                                                >
                                                    💵 Collect Cash
                                                </Button>
                                                <Button
                                                    className="w-full h-14 text-lg font-bold bg-slate-800 hover:bg-slate-700 text-white border border-slate-700"
                                                    onClick={() => setIsManualConfirming('TERMINAL')}
                                                >
                                                    💳 Card Terminal
                                                </Button>
                                            </>
                                        )}
                                        {job.paymentType !== 'CASH' && (
                                            <Button
                                                className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-500 text-slate-900"
                                                onClick={() => onStatusUpdate(job.id, 'COMPLETED', job.paymentType, { completeUnpaid: true })}
                                            >
                                                {job.paymentType === 'ACCOUNT' ? 'Complete Account Job' : 'Complete Unpaid / Office Authorised'}
                                            </Button>
                                        )}
                                        <Button
                                            variant="ghost"
                                            className="w-full h-12 text-slate-400 mt-4"
                                            onClick={() => setShowPayment(false)}
                                        >
                                            Cancel
                                        </Button>
                                    </>
                                ) : (
                                    <div className="w-full p-4 bg-slate-900 border border-slate-700 rounded-xl mt-4 space-y-4">
                                        {isManualConfirming === 'CASH' ? (
                                            <>
                                                <p className="font-bold text-center text-slate-200">Confirm customer has paid cash?</p>
                                                <Button
                                                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold"
                                                    onClick={() => handleManualPayment('CASH')}
                                                    disabled={isProcessingManual}
                                                >
                                                    {isProcessingManual ? "Confirming..." : "Yes, Confirm Cash Payment"}
                                                </Button>
                                            </>
                                        ) : (
                                            <>
                                                <p className="font-bold text-center text-slate-200 mb-1">Confirm payment was taken on this terminal?</p>
                                                <div className="text-center mb-4">
                                                    <span className="text-xs text-orange-400 bg-orange-400/10 px-2 py-1 rounded">Manual confirmation — CabAI has not verified this terminal payment automatically.</span>
                                                </div>
                                                <div className="grid grid-cols-3 gap-2 py-2">
                                                    <Button
                                                        variant={selectedTerminal === 'SUMUP' ? 'default' : 'outline'}
                                                        className={`h-10 text-xs ${selectedTerminal === 'SUMUP' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 text-slate-400'}`}
                                                        onClick={() => setSelectedTerminal('SUMUP')}
                                                    >
                                                        SumUp
                                                    </Button>
                                                    <Button
                                                        variant={selectedTerminal === 'ZETTLE' ? 'default' : 'outline'}
                                                        className={`h-10 text-xs ${selectedTerminal === 'ZETTLE' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 text-slate-400'}`}
                                                        onClick={() => setSelectedTerminal('ZETTLE')}
                                                    >
                                                        Zettle
                                                    </Button>
                                                    <Button
                                                        variant={selectedTerminal === 'OTHER_TERMINAL' ? 'default' : 'outline'}
                                                        className={`h-10 text-xs px-1 ${selectedTerminal === 'OTHER_TERMINAL' ? 'bg-indigo-600 border-indigo-500 text-white' : 'border-slate-700 text-slate-400'}`}
                                                        onClick={() => setSelectedTerminal('OTHER_TERMINAL')}
                                                    >
                                                        Other
                                                    </Button>
                                                </div>
                                                <Button
                                                    className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-bold mt-2"
                                                    onClick={() => handleManualPayment(selectedTerminal)}
                                                    disabled={isProcessingManual}
                                                >
                                                    {isProcessingManual ? "Confirming..." : `Confirm ${selectedTerminal === 'OTHER_TERMINAL' ? 'Terminal' : selectedTerminal} Payment`}
                                                </Button>
                                            </>
                                        )}
                                        <Button
                                            variant="ghost"
                                            className="w-full h-10 text-slate-400 mt-2 hover:bg-slate-800"
                                            onClick={() => setIsManualConfirming(null)}
                                            disabled={isProcessingManual}
                                        >
                                            Go Back
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Payment QR Modal */}
            {qrModalOpen && (
                <div className="absolute inset-0 z-[60] bg-zinc-950 flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95">
                    <h3 className="text-xl font-bold text-slate-100 mb-2 flex items-center justify-center gap-2">
                        <QrCode className="w-5 h-5 text-indigo-400" /> Payment Link
                    </h3>
                    <div className="text-center space-y-1 mb-6">
                        <p className="text-sm text-slate-400">{job.passengerName || 'Passenger'}</p>
                        <p className="text-3xl font-black text-emerald-400">£{(job.fare || job.price || 0).toFixed(2)}</p>
                    </div>

                    {qrLoading ? (
                        <div className="flex justify-center items-center h-64 w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-800">
                            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin" />
                        </div>
                    ) : (
                        <div className="w-full max-w-sm space-y-4">
                            {qrCodeDataUrl ? (
                                <div className="flex justify-center p-6 bg-white rounded-2xl shadow-xl">
                                    <img src={qrCodeDataUrl} alt="Payment QR Code" className="w-64 h-64" />
                                </div>
                            ) : (
                                <div className="flex justify-center items-center h-64 bg-slate-900 rounded-2xl border border-slate-800">
                                    <p className="text-slate-500 text-sm">QR Code unavailable</p>
                                </div>
                            )}
                            
                            <p className="text-slate-400 text-sm mt-4">Ask passenger to scan code</p>

                            <Button
                                variant="ghost"
                                className="w-full h-14 text-lg mt-4 text-slate-400 hover:text-white"
                                onClick={() => setQrModalOpen(false)}
                            >
                                Close
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
