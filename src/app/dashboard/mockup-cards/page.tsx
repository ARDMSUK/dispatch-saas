'use client';

import { Button } from '@/components/ui/button';
import { BookingForm } from '@/components/dashboard/booking-form';
import { DriverFleetPanel } from '@/components/dashboard/driver-fleet-panel';
import { User, Phone, MapPin, MoreVertical, AlertCircle } from 'lucide-react';

const MOCK_JOBS = [
    { id: 1, time: '09:00', date: '23 Apr', driver: '38', passenger: 'John Smith', phone: '07745223338', pax: 2, lug: 1, fare: '£45.00', vehicle: 'Saloon', payment: 'CASH', status: 'PENDING', pickup: '67 Wooburn Manor Park, Wooburn Green', dest: 'Heathrow Airport Terminal 5', badges: ['M&G'], flight: 'BA101 (EST: 08:45)', notes: 'Please ring doorbell' },
    { id: 2, time: '09:45', date: '23 Apr', driver: '', passenger: 'Alice Brown', phone: '01628523594', pax: 1, lug: 0, fare: '£10.00', vehicle: 'Estate', payment: 'ACCOUNT', status: 'UNASSIGNED', pickup: 'The Malt Cottage, School Lane, Cookham', dest: 'Cookham Dean Village Hall', badges: [], flight: '', notes: '' },
    { id: 3, time: '09:45', date: '23 Apr', driver: '12', passenger: 'Mark Davis', phone: '07711273057', pax: 4, lug: 2, fare: '£45.00', vehicle: 'MPV', payment: 'PAID', status: 'DISPATCHED', pickup: '1 Victoria Gardens, Marlow', dest: 'Heathrow Airport Terminal 5', badges: ['RETURN'], flight: '', notes: 'Wait at reception' },
    { id: 4, time: '10:00', date: '23 Apr', driver: '', passenger: 'Sarah Wilson', phone: '07846371978', pax: 1, lug: 0, fare: '£20.00', vehicle: 'Saloon', payment: 'CASH', status: 'PENDING', pickup: 'Royal Oak, Frieth Road, Marlow', dest: '3 Riverside, Cores End Road, Bourne End', badges: [], flight: '', notes: '' },
    { id: 5, time: '10:30', date: '23 Apr', driver: '19', passenger: 'Tom Harris', phone: '07123456789', pax: 2, lug: 1, fare: '£15.00', vehicle: 'Saloon', payment: 'TERMINAL', status: 'EN_ROUTE', pickup: 'Waitrose, High Wycombe', dest: 'Loudwater Station', badges: [], flight: '', notes: '' },
    { id: 6, time: '11:00', date: '23 Apr', driver: '', passenger: 'Emma Clark', phone: '07987654321', pax: 3, lug: 3, fare: '£30.00', vehicle: 'Estate', payment: 'CASH', status: 'PENDING', pickup: 'Handy Cross Hub', dest: 'Maidenhead Town Centre', badges: [], flight: '', notes: 'Large boxes' },
    { id: 7, time: '11:15', date: '23 Apr', driver: '05', passenger: 'James Lee', phone: '07777777777', pax: 1, lug: 0, fare: '£12.50', vehicle: 'Executive', payment: 'ACCOUNT', status: 'POB', pickup: 'Beaconsfield Services', dest: 'Gerrards Cross', badges: [], flight: '', notes: '' },
    { id: 8, time: '12:00', date: '23 Apr', driver: '', passenger: 'Lucy Hall', phone: '07888888888', pax: 8, lug: 5, fare: '£55.00', vehicle: 'Minibus', payment: 'PAID', status: 'PENDING', pickup: 'Marlow Bridge', dest: 'London Gatwick Airport', badges: ['M&G', 'RETURN'], flight: 'EZY889', notes: '' },
];

export default function MockupCardsPage() {
    return (
        <div className="h-[100dvh] w-full max-w-[100vw] bg-slate-50 text-slate-900 flex flex-row font-sans overflow-hidden">
            
            {/* COL 1: NEW BOOKING (Full Height) */}
            <div className="w-[380px] border-r border-slate-200 bg-slate-50 h-full flex flex-col z-20 shrink-0">
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <BookingForm onJobCreated={() => {}} />
                </div>
            </div>

            {/* COL 2: RIGHT SIDE (Fleet, Map, Jobs) */}
            <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-100/50">
                
                {/* TOP HALF: FLEET & MAP */}
                <div className="flex w-full h-[40vh] border-b border-slate-200 shrink-0 bg-white">
                    {/* FLEET MANAGEMENT */}
                    <div className="w-[350px] border-r border-slate-200 bg-slate-50 h-full flex flex-col shrink-0">
                        <DriverFleetPanel drivers={[]} vehicles={[]} onRefresh={() => {}} />
                    </div>

                    {/* MAP */}
                    <div className="flex-1 bg-slate-100 flex items-center justify-center text-slate-400 font-medium relative">
                        <div className="text-center">
                            <p className="mb-2 text-slate-500">Live Map Area</p>
                        </div>
                    </div>
                </div>

                {/* BOTTOM HALF: COMPACT CARDS LIST */}
                <div className="flex-1 relative z-10 flex flex-col overflow-hidden">
                    {/* TABS HEADER */}
                    <div className="flex items-center justify-between p-2 border-b border-slate-200 bg-white shrink-0">
                        <div className="flex gap-2">
                            <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-xs font-bold shadow-sm h-8 px-4 rounded-full">PENDING (5)</Button>
                            <Button variant="secondary" className="bg-teal-100 hover:bg-teal-200 text-teal-800 text-xs font-bold h-8 px-4 rounded-full">TODAY (8)</Button>
                            <Button variant="secondary" className="bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs font-bold h-8 px-4 rounded-full">DISPATCHED (2)</Button>
                        </div>
                        <div className="text-xs font-bold text-slate-400 mr-4">Total Jobs: {MOCK_JOBS.length}</div>
                    </div>

                    {/* CARDS CONTAINER */}
                    <div className="flex-1 overflow-auto p-4 custom-scrollbar">
                        <h2 className="text-sm font-bold text-slate-600 mb-2">Mockup Iteration: Full Height Booking Form & Columnar Cards</h2>
                        <p className="text-xs text-slate-500 mb-4">The booking form is back to full height. The job cards span the remaining width underneath the fleet/map section. The cards contain all info organized in columns.</p>
                        
                        <div className="space-y-2">
                            {MOCK_JOBS.map((job, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded-lg shadow-sm hover:border-blue-400 cursor-pointer transition-all group">
                                    
                                    {/* COL: TIME & STATUS */}
                                    <div className="w-16 flex flex-col justify-center border-r border-slate-100 pr-2 h-full">
                                        <div className="font-black text-blue-600 text-base leading-none">{job.time}</div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase mt-1">{job.date}</div>
                                    </div>

                                    {/* COL: DRIVER & STATUS BADGE */}
                                    <div className="w-20 flex flex-col items-center justify-center gap-1.5 border-r border-slate-100 pr-2 h-full">
                                        <span className={`font-bold text-[9px] px-1.5 py-0.5 rounded w-full text-center ${job.status === 'PENDING' || job.status === 'UNASSIGNED' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>{job.status}</span>
                                        {job.driver ? (
                                            <span className="bg-purple-100 text-purple-700 font-bold text-[10px] px-1.5 py-0.5 rounded w-full text-center">DRV: {job.driver}</span>
                                        ) : (
                                            <span className="bg-slate-100 text-slate-400 font-bold text-[10px] px-1.5 py-0.5 rounded border border-slate-200 w-full text-center">UNASS</span>
                                        )}
                                    </div>

                                    {/* COL: JOURNEY & NOTES (Flex-1 to take most space) */}
                                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-1.5 border-r border-slate-100 pr-2">
                                        <div className="flex items-center gap-2 text-xs">
                                            <MapPin className="h-3 w-3 text-emerald-500 shrink-0" />
                                            <span className="font-bold text-slate-700 truncate">{job.pickup}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs">
                                            <MapPin className="h-3 w-3 text-blue-600 shrink-0" />
                                            <span className="font-medium text-slate-600 truncate">{job.dest}</span>
                                        </div>
                                        {(job.notes || job.flight || job.badges.length > 0) && (
                                            <div className="flex items-center gap-2 text-[10px] mt-0.5">
                                                {job.badges.map(b => <span key={b} className="bg-indigo-50 text-indigo-600 px-1 py-0.5 border border-indigo-100 rounded font-bold">{b}</span>)}
                                                {job.flight && <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 border border-blue-200 rounded font-mono flex items-center gap-1">✈️ {job.flight}</span>}
                                                {job.notes && <span className="text-slate-400 flex items-center gap-1 truncate"><AlertCircle className="h-3 w-3" />{job.notes}</span>}
                                            </div>
                                        )}
                                    </div>

                                    {/* COL: PASSENGER */}
                                    <div className="w-32 flex flex-col justify-center gap-1 border-r border-slate-100 pr-2">
                                        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 truncate">
                                            <User className="h-3 w-3 text-slate-400 shrink-0" /> {job.passenger}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
                                            <Phone className="h-3 w-3 shrink-0" /> {job.phone}
                                        </div>
                                    </div>

                                    {/* COL: PAX / LUG / VEHICLE */}
                                    <div className="w-20 flex flex-col justify-center items-center gap-1 border-r border-slate-100 pr-2">
                                        <div className="font-bold text-[10px] text-slate-500 uppercase tracking-wider">{job.vehicle}</div>
                                        <div className="flex gap-2 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                            <span className="flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{job.pax}</span>
                                            <span className="font-bold border-l border-slate-300 pl-1.5">LUG {job.lug}</span>
                                        </div>
                                    </div>

                                    {/* COL: FARE & PAYMENT */}
                                    <div className="w-20 flex flex-col items-end justify-center pr-2">
                                        <div className="font-black text-slate-900 text-base">{job.fare}</div>
                                        <div className={`font-bold text-[9px] px-1 rounded ${job.payment === 'PAID' ? 'bg-emerald-100 text-emerald-700' : 'text-slate-400'}`}>{job.payment}</div>
                                    </div>
                                    
                                    {/* ACTIONS */}
                                    <div className="w-6 flex items-center justify-center">
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 group-hover:text-slate-600 transition-colors">
                                            <MoreVertical className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
