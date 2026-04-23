'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookingForm } from '@/components/dashboard/booking-form';
import { DriverFleetPanel } from '@/components/dashboard/driver-fleet-panel';
import { GoogleMap, MarkerF } from '@react-google-maps/api';

const MOCK_JOBS = [
    { id: 1, time: '09:00', driver: '38', phone: '07745223338', fare: '£45.00', type: 'PRE', pickup: '67 Wooburn Manor Park, Wooburn Green', dest: 'Heathrow Airport Terminal 5' },
    { id: 2, time: '09:45', driver: '', phone: '01628523594', fare: '£10.00', type: 'PRE', pickup: 'The Malt Cottage, School Lane, Cookham', dest: 'Cookham Dean Village Hall' },
    { id: 3, time: '09:45', driver: '', phone: '07711273057', fare: '£45.00', type: 'PRE', pickup: '1 Victoria Gardens, Marlow', dest: 'Heathrow Airport Terminal 5' },
    { id: 4, time: '10:00', driver: '', phone: '07846371978', fare: '£20.00', type: 'PRE', pickup: 'Royal Oak, Frieth Road, Marlow', dest: '3 Riverside, Cores End Road, Bourne End' },
];

export default function MockupTablePage() {
    return (
        <div className="h-full w-full max-w-[100vw] bg-slate-50 text-slate-900 flex flex-col lg:flex-row font-sans overflow-hidden">
            
            {/* COL 1: NEW BOOKING */}
            <div className="w-[380px] border-r border-slate-200 bg-slate-50 h-full flex flex-col z-20 shadow-xl shrink-0">
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <BookingForm onJobCreated={() => {}} />
                </div>
            </div>

            {/* COL 2: BOOKING MANAGER (DENSE TABLE MOCKUP) */}
            <div className="flex-1 border-r border-slate-200 bg-white h-full relative z-10 flex flex-col">
                <div className="flex items-center gap-6 p-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex gap-2">
                        <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-xs font-bold shadow-sm h-8">DISPATCH (1)</Button>
                        <Button variant="secondary" className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold h-8">PRE-BOOKED (4)</Button>
                        <Button variant="secondary" className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold h-8">COMPLETED (3)</Button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-4 bg-slate-100/50">
                    <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-2 px-3 whitespace-nowrap">Time</th>
                                    <th className="py-2 px-3 whitespace-nowrap">Drv</th>
                                    <th className="py-2 px-3 whitespace-nowrap">Phone</th>
                                    <th className="py-2 px-3 whitespace-nowrap">Fare</th>
                                    <th className="py-2 px-3">Pickup</th>
                                    <th className="py-2 px-3">Destination</th>
                                </tr>
                            </thead>
                            <tbody className="text-xs">
                                {MOCK_JOBS.map((job, idx) => (
                                    <tr key={idx} className="border-b border-slate-100 hover:bg-blue-50/50 transition-colors cursor-pointer group">
                                        <td className="py-2.5 px-3 font-bold text-slate-900">{job.time}</td>
                                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{job.driver || '-'}</td>
                                        <td className="py-2.5 px-3 text-slate-600 font-medium">{job.phone}</td>
                                        <td className="py-2.5 px-3">
                                            <span className="bg-blue-100 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-200">{job.fare}</span>
                                        </td>
                                        <td className="py-2.5 px-3 text-slate-800 font-medium truncate max-w-[200px]">{job.pickup}</td>
                                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[200px]">{job.dest}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-8">
                        <h3 className="text-sm font-bold text-slate-400 mb-2">Alternative: Compact Horizontal Cards</h3>
                        <div className="space-y-1">
                            {MOCK_JOBS.map((job, idx) => (
                                <div key={idx} className="flex items-center gap-3 bg-white border border-slate-200 p-2 rounded shadow-sm hover:border-blue-300 cursor-pointer">
                                    <div className="w-12 text-center">
                                        <div className="text-sm font-black text-blue-600">{job.time}</div>
                                    </div>
                                    <div className="flex-1 min-w-0 flex items-center gap-2 text-xs">
                                        <div className="font-bold text-emerald-600 truncate max-w-[150px]">{job.pickup}</div>
                                        <span className="text-slate-300">→</span>
                                        <div className="font-medium text-slate-600 truncate max-w-[150px]">{job.dest}</div>
                                    </div>
                                    <div className="w-24 text-xs text-slate-500 font-mono">{job.phone}</div>
                                    <div className="w-16 text-right font-bold text-slate-800">{job.fare}</div>
                                    <div className="w-10">
                                        {job.driver ? (
                                            <span className="bg-blue-600 text-white font-bold text-[10px] px-1.5 py-0.5 rounded">{job.driver}</span>
                                        ) : (
                                            <span className="bg-slate-200 text-slate-400 font-bold text-[10px] px-1.5 py-0.5 rounded">UNASS</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* COL 3: MAP & FLEET */}
            <div className="w-[450px] flex flex-col h-full bg-white z-20 shrink-0">
                <div className="h-1/2 relative bg-slate-100 border-b border-slate-200 flex items-center justify-center text-slate-400 font-medium">
                    Map Area
                </div>
                <div className="h-1/2 flex flex-col overflow-hidden bg-slate-50">
                    <DriverFleetPanel drivers={[]} vehicles={[]} onRefresh={() => {}} />
                </div>
            </div>
        </div>
    );
}
