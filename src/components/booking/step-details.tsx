
'use client';

import { Button } from '@/components/ui/button';
import { User, Mail, Phone, Plane, Clipboard } from 'lucide-react';
import { BookingData } from './booking-wizard';

type Props = {
    data: BookingData;
    onUpdate: (data: Partial<BookingData>) => void;
    onNext: () => void;
};

export function StepDetails({ data, onUpdate, onNext }: Props) {
    const isValid = data.passengerName.length > 2 && data.passengerPhone.length > 5 && data.passengerEmail.includes('@');

    return (
        <div className="space-y-6 h-full flex flex-col">
            <h2 className="text-xl font-bold text-white mb-2">Your Details</h2>

            <div className="space-y-4 flex-1">
                <div className="grid grid-cols-1 gap-4">
                    {/* Name */}
                    <div className="relative group">
                        <div className="absolute left-3 top-3.5 text-zinc-500"><User className="h-5 w-5" /></div>
                        <input
                            type="text"
                            placeholder="Full Name"
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500/50"
                            value={data.passengerName}
                            onChange={(e) => onUpdate({ passengerName: e.target.value })}
                        />
                    </div>

                    {/* Email */}
                    <div className="relative group">
                        <div className="absolute left-3 top-3.5 text-zinc-500"><Mail className="h-5 w-5" /></div>
                        <input
                            type="email"
                            placeholder="Email Address"
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500/50"
                            value={data.passengerEmail}
                            onChange={(e) => onUpdate({ passengerEmail: e.target.value })}
                        />
                    </div>

                    {/* Phone */}
                    <div className="relative group">
                        <div className="absolute left-3 top-3.5 text-zinc-500"><Phone className="h-5 w-5" /></div>
                        <input
                            type="tel"
                            placeholder="Mobile Number"
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500/50"
                            value={data.passengerPhone}
                            onChange={(e) => onUpdate({ passengerPhone: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-zinc-500 font-bold mb-1 block">Passengers</label>
                            <input
                                type="number"
                                min="1" max="16"
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50"
                                value={data.passengers}
                                onChange={(e) => onUpdate({ passengers: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-xs text-zinc-500 font-bold mb-1 block">Luggage</label>
                            <input
                                type="number"
                                min="0" max="10"
                                className="w-full bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-amber-500/50"
                                value={data.luggage}
                                onChange={(e) => onUpdate({ luggage: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    {/* Flight No */}
                    <div className="relative group">
                        <div className="absolute left-3 top-3.5 text-blue-400"><Plane className="h-5 w-5" /></div>
                        <input
                            type="text"
                            placeholder="Flight Number (Optional)"
                            className="w-full bg-blue-500/10 border border-blue-500/30 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-blue-400/50"
                            value={data.flightNumber || ''}
                            onChange={(e) => onUpdate({ flightNumber: e.target.value.toUpperCase() })}
                        />
                    </div>

                    {/* Notes */}
                    <div className="relative group h-full">
                        <div className="absolute left-3 top-3.5 text-zinc-500"><Clipboard className="h-5 w-5" /></div>
                        <textarea
                            placeholder="Driver Notes / Instructions..."
                            rows={3}
                            className="w-full bg-black/40 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500/50 resize-none"
                            value={data.notes || ''}
                            onChange={(e) => onUpdate({ notes: e.target.value })}
                        />
                    </div>

                    {/* Payment Method */}
                    <div className="pt-2">
                        <label className="text-xs text-zinc-500 font-bold mb-2 block uppercase">Payment Method</label>
                        <div className="grid grid-cols-2 gap-4">
                            <div
                                onClick={() => onUpdate({ paymentType: 'CASH' })}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-center gap-2 ${data.paymentType === 'CASH' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-black/40 border-white/10 text-zinc-400 hover:bg-white/5'}`}
                            >
                                <span className="font-bold">CASH</span>
                                <span className="text-xs opacity-70">(Pay Driver)</span>
                            </div>
                            <div
                                onClick={() => onUpdate({ paymentType: 'CARD' })}
                                className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-center gap-2 ${data.paymentType === 'CARD' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-black/40 border-white/10 text-zinc-400 hover:bg-white/5'}`}
                            >
                                <span className="font-bold">CARD</span>
                                <span className="text-xs opacity-70">(Pre-pay)</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <Button
                onClick={onNext}
                disabled={!isValid}
                className="w-full h-14 text-lg font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-xl"
            >
                Review Booking
            </Button>
        </div>
    );
}
