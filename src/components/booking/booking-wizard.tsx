
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { StepLocation } from './step-location';
import { StepVehicle } from './step-vehicle';
import { StepDetails } from './step-details';
import { StepSummary } from './step-summary';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { PaymentModal } from './payment-modal';

export type BookingData = {
    // Step 1: Location & Time
    pickup: string;
    dropoff: string;
    pickupCoords: { lat: number, lng: number } | null;
    dropoffCoords: { lat: number, lng: number } | null;
    vias: { address: string, lat?: number, lng?: number }[];
    date: Date;
    isReturn: boolean;
    returnDate?: Date;

    // Step 2: Vehicle
    vehicleType: string;
    price: number | null;
    distance?: number;

    // Step 3: Details
    passengerName: string;
    passengerEmail: string;
    passengerPhone: string;
    passengers: number;
    luggage: number;
    flightNumber?: string;
    notes?: string;

    // Step 4: Payment
    paymentType: 'CASH' | 'CARD' | 'ACCOUNT';
};

const INITIAL_DATA: BookingData = {
    pickup: '',
    dropoff: '',
    pickupCoords: null,
    dropoffCoords: null,
    vias: [],
    date: new Date(new Date().getTime() + 60 * 60 * 1000), // +1 hour default
    isReturn: false,
    vehicleType: 'Saloon',
    price: null,
    passengerName: '',
    passengerEmail: '',
    passengerPhone: '',
    passengers: 1,
    luggage: 0,
    paymentType: 'CASH'
};

export function BookingWizard() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [data, setData] = useState<BookingData>(INITIAL_DATA);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingBookingId, setPendingBookingId] = useState<number | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    const updateData = (updates: Partial<BookingData>) => {
        setData(prev => ({ ...prev, ...updates }));
    };

    const nextStep = () => setStep(prev => prev + 1);
    const prevStep = () => setStep(prev => prev - 1);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/booking', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    pickupAddress: data.pickup,
                    dropoffAddress: data.dropoff,
                    pickupLat: data.pickupCoords?.lat,
                    pickupLng: data.pickupCoords?.lng,
                    dropoffLat: data.dropoffCoords?.lat,
                    dropoffLng: data.dropoffCoords?.lng,
                    pickupTime: data.date.toISOString(),
                    vehicleType: data.vehicleType,
                    passengerName: data.passengerName,
                    passengerEmail: data.passengerEmail,
                    passengerPhone: data.passengerPhone,
                    passengers: data.passengers,
                    luggage: data.luggage,
                    flightNumber: data.flightNumber,
                    notes: data.notes,
                    paymentType: data.paymentType,
                    // Return
                    returnBooking: data.isReturn,
                    returnDate: data.returnDate?.toISOString()
                })
            });

            if (!res.ok) throw new Error("Booking failed");

            const result = await res.json();

            if (data.paymentType === 'CARD') {
                setPendingBookingId(result.jobId);
                setShowPaymentModal(true);
                // Don't redirect yet
            } else {
                toast.success("Booking Confirmed!", {
                    description: `Reference: ${result.ref}. Check your email.`
                });
                router.push(`/track/${result.jobId}`);
            }
            // Optional: Reset data if needed, but we are navigating away.
            // setData(INITIAL_DATA);

        } catch (error) {
            toast.error("Booking Error", { description: "Please try again or call us." });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col min-h-[600px]">
            {/* Header / Progress */}
            <div className="p-6 border-b border-white/5 bg-black/20">
                <div className="flex justify-between items-center mb-4">
                    {step > 1 ? (
                        <button onClick={prevStep} className="text-zinc-400 hover:text-white flex items-center gap-1 text-sm transition-colors">
                            <ChevronLeft className="h-4 w-4" /> Back
                        </button>
                    ) : (
                        <span className="text-zinc-500 text-sm font-medium">New Booking</span>
                    )}
                    <span className="text-zinc-500 text-xs font-mono">STEP {step} OF 4</span>
                </div>

                {/* Progress Bar */}
                <div className="h-1 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full bg-amber-500"
                        initial={{ width: '25%' }}
                        animate={{ width: `${step * 25}%` }}
                        transition={{ duration: 0.3 }}
                    />
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 p-6 relative">
                <AnimatePresence mode='wait'>
                    <motion.div
                        key={step}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.2 }}
                        className="h-full"
                    >
                        {step === 1 && (
                            <StepLocation
                                data={data}
                                onUpdate={updateData}
                                onNext={nextStep}
                            />
                        )}
                        {step === 2 && (
                            <StepVehicle
                                data={data}
                                onUpdate={updateData}
                                onNext={nextStep}
                            />
                        )}
                        {step === 3 && (
                            <StepDetails
                                data={data}
                                onUpdate={updateData}
                                onNext={nextStep}
                            />
                        )}
                        {step === 4 && (
                            <StepSummary
                                data={data}
                                onSubmit={handleSubmit}
                                isSubmitting={isSubmitting}
                            />
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>

            {
                showPaymentModal && pendingBookingId && (
                    <PaymentModal
                        amount={data.price || 0}
                        bookingId={pendingBookingId}
                        onSuccess={(pid) => {
                            setShowPaymentModal(false);
                            toast.success("Payment Received!", { description: "Thank you." });
                            router.push(`/track/${pendingBookingId}`);
                        }}
                        onCancel={() => {
                            setShowPaymentModal(false);
                            toast.info("Payment Skipped", { description: "You can pay the driver later." });
                            router.push(`/track/${pendingBookingId}`);
                        }}
                    />
                )
            }
        </div >
    );
}
