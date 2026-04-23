'use client';

import { Button } from '@/components/ui/button';
import { BookingForm } from '@/components/dashboard/booking-form';
import { DriverFleetPanel } from '@/components/dashboard/driver-fleet-panel';

const MOCK_JOBS = [
    { id: 1, time: '09:00', driver: '38', phone: '07745223338', fare: '£45.00', type: 'PRE', pickup: '67 Wooburn Manor Park, Wooburn Green', dest: 'Heathrow Airport Terminal 5' },
    { id: 2, time: '09:45', driver: '', phone: '01628523594', fare: '£10.00', type: 'PRE', pickup: 'The Malt Cottage, School Lane, Cookham', dest: 'Cookham Dean Village Hall' },
    { id: 3, time: '09:45', driver: '', phone: '07711273057', fare: '£45.00', type: 'PRE', pickup: '1 Victoria Gardens, Marlow', dest: 'Heathrow Airport Terminal 5' },
    { id: 4, time: '10:00', driver: '', phone: '07846371978', fare: '£20.00', type: 'PRE', pickup: 'Royal Oak, Frieth Road, Marlow', dest: '3 Riverside, Cores End Road, Bourne End' },
    { id: 5, time: '10:30', driver: '19', phone: '07123456789', fare: '£15.00', type: 'ASAP', pickup: 'Waitrose, High Wycombe', dest: 'Loudwater Station' },
    { id: 6, time: '11:00', driver: '', phone: '07987654321', fare: '£30.00', type: 'PRE', pickup: 'Handy Cross Hub', dest: 'Maidenhead Town Centre' },
    { id: 7, time: '11:15', driver: '05', phone: '07777777777', fare: '£12.50', type: 'ASAP', pickup: 'Beaconsfield Services', dest: 'Gerrards Cross' },
    { id: 8, time: '12:00', driver: '', phone: '07888888888', fare: '£55.00', type: 'PRE', pickup: 'Marlow Bridge', dest: 'London Gatwick Airport' },
    { id: 9, time: '12:30', driver: '12', phone: '07999999999', fare: '£8.00', type: 'ASAP', pickup: 'Flackwell Heath', dest: 'Bourne End Parade' },
    { id: 10, time: '13:00', driver: '', phone: '07111111111', fare: '£25.00', type: 'PRE', pickup: 'Wooburn Green', dest: 'Slough Station' },
];

export default function MockupCardsPage() {
    return (
        <div className="h-[100dvh] w-full max-w-[100vw] bg-slate-50 text-slate-900 flex flex-col font-sans overflow-hidden">
            
            {/* TOP HALF: BOOKING, FLEET, MAP */}
            <div className="flex w-full h-[55vh] border-b border-slate-200 shrink-0">
                {/* 1. BOOKING */}
                <div className="w-[380px] border-r border-slate-200 bg-slate-50 h-full flex flex-col z-20 shrink-0">
                    <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        <BookingForm onJobCreated={() => {}} />
                    </div>
                </div>

                {/* 2. FLEET MANAGEMENT */}
                <div className="w-[350px] border-r border-slate-200 bg-slate-50 h-full flex flex-col shrink-0">
                    <DriverFleetPanel drivers={[]} vehicles={[]} onRefresh={() => {}} />
                </div>

                {/* 3. MAP */}
                <div className="flex-1 bg-slate-100 flex items-center justify-center text-slate-400 font-medium relative">
                    <div className="text-center">
                        <p className="mb-2 text-slate-500">Live Map Area</p>
                        <p className="text-xs text-slate-400 max-w-[200px]">(Map spans the remainder of the top screen width)</p>
                    </div>
                </div>
            </div>

            {/* BOTTOM HALF: COMPACT CARDS */}
            <div className="flex-1 bg-white relative z-10 flex flex-col overflow-hidden">
                <div className="flex items-center justify-between p-2 border-b border-slate-200 bg-slate-50 shrink-0">
                    <div className="flex gap-2">
                        <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-xs font-bold shadow-sm h-7">DISPATCH (3)</Button>
                        <Button variant="secondary" className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold h-7">PRE-BOOKED (7)</Button>
                        <Button variant="secondary" className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold h-7">COMPLETED (15)</Button>
                    </div>
                    <div className="text-xs font-bold text-slate-400">Total Jobs: {MOCK_JOBS.length}</div>
                </div>

                <div className="flex-1 overflow-auto p-4 bg-slate-100/50 custom-scrollbar">
                    <h2 className="text-sm font-bold text-slate-600 mb-2">iCabbi-Style Full Width Layout</h2>
                    <p className="text-xs text-slate-500 mb-4">Notice how the booking form now has a scrollbar because it is constrained to the top 55% of the screen. The jobs span full width across the bottom 45%.</p>
                    
                    <div className="space-y-1">
                        {MOCK_JOBS.map((job, idx) => (
                            <div key={idx} className="flex items-center gap-3 bg-white border border-slate-200 py-1.5 px-3 rounded shadow-sm hover:border-blue-300 cursor-pointer transition-colors group">
                                <div className="w-12 text-center">
                                    <div className="text-xs font-black text-blue-600">{job.time}</div>
                                </div>
                                <div className="flex-1 min-w-0 flex items-center gap-2 text-xs">
                                    <div className="font-bold text-emerald-600 truncate max-w-[250px]">{job.pickup}</div>
                                    <span className="text-slate-300">→</span>
                                    <div className="font-medium text-slate-600 truncate max-w-[250px]">{job.dest}</div>
                                </div>
                                <div className="w-24 text-xs text-slate-500 font-mono">{job.phone}</div>
                                <div className="w-16 text-right font-bold text-slate-800">{job.fare}</div>
                                <div className="w-12 text-right">
                                    {job.driver ? (
                                        <span className="bg-blue-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded shadow-sm">{job.driver}</span>
                                    ) : (
                                        <span className="bg-slate-200 text-slate-500 font-bold text-[10px] px-1.5 py-0.5 rounded border border-slate-300">UNASS</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
