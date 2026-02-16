
'use client';

import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { BookingData } from './booking-wizard';

type Props = {
    data: BookingData;
    onSubmit: () => void;
    isSubmitting: boolean;
};

export function StepSummary({ data, onSubmit, isSubmitting }: Props) {
    return (
        <div className="space-y-6 h-full flex flex-col">
            <h2 className="text-xl font-bold text-white mb-2">Review & Book</h2>

            <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
                {/* Journey Card */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-3">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase">Journey</h3>
                    <div className="flex gap-3">
                        <div className="flex flex-col items-center pt-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                            <div className="w-0.5 h-full bg-white/10 min-h-[30px]" />
                            <div className="w-2 h-2 rounded-full bg-amber-500" />
                        </div>
                        <div className="space-y-4 flex-1">
                            <div>
                                <p className="text-sm font-medium text-white">{data.pickup}</p>
                                <p className="text-xs text-zinc-500">{data.date.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-white">{data.dropoff}</p>
                            </div>
                        </div>
                    </div>
                    {data.isReturn && (
                        <div className="pt-3 border-t border-white/5">
                            <p className="text-xs text-amber-500 font-bold mb-1">RETURN JOURNEY ADDED</p>
                            <p className="text-xs text-zinc-400">
                                {data.returnDate?.toLocaleString()}
                            </p>
                        </div>
                    )}
                </div>

                {/* Vehicle & Price */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                    <div>
                        <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Vehicle</h3>
                        <p className="text-lg font-bold text-white">{data.vehicleType}</p>
                    </div>
                    <div className="text-right">
                        <h3 className="text-xs font-bold text-zinc-500 uppercase mb-1">Total Fare</h3>
                        <p className="text-2xl font-bold text-emerald-400">
                            £{data.price ? data.price.toFixed(2) : '0.00'}
                            <span className="text-xs font-normal text-zinc-500 block">estimated</span>
                        </p>
                    </div>
                </div>

                {/* Details */}
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
                    <h3 className="text-xs font-bold text-zinc-500 uppercase">Passenger</h3>
                    <p className="text-sm text-white">{data.passengerName}</p>
                    <p className="text-sm text-zinc-400">{data.passengerPhone}</p>
                    <p className="text-sm text-zinc-400">{data.passengerEmail}</p>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <h3 className="text-xs font-bold text-amber-500 uppercase mb-2">Payment Payment</h3>
                    <p className="text-sm text-white">Payment will be handled by the driver via {data.paymentType}.</p>
                </div>
            </div>

            <Button
                onClick={onSubmit}
                disabled={isSubmitting}
                className="w-full h-14 text-lg font-bold bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl"
            >
                {isSubmitting ? (
                    <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Booking...</>
                ) : (
                    <>Confirm Booking</>
                )}
            </Button>
        </div>
    );
}
