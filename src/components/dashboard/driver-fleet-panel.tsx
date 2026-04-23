'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Car, Phone } from 'lucide-react';
import { AddDriverDialog, AddVehicleDialog } from '@/components/dashboard/fleet-dialogs';

import { useSession } from 'next-auth/react';

interface DriverFleetPanelProps {
    drivers: any[];
    vehicles: any[];
    onRefresh: () => void;
    onAssign?: (driverId: string) => void;
    selectedJobId?: string; // Changed to string to match usage
}

export function DriverFleetPanel({ drivers, vehicles, onRefresh, onAssign, selectedJobId }: DriverFleetPanelProps) {
    const [activeTab, setActiveTab] = useState('DRIVERS');
    const { data: session } = useSession();
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role as string);

    // Fetching is now handled by parent

    return (
        <div className="h-full flex flex-col bg-slate-50 border-t border-slate-200">
            <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-white">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Fleet Management</span>
                <div className="flex gap-1">
                    {isAdmin && (
                        activeTab === 'DRIVERS' ? (
                            <AddDriverDialog onDriverAdded={onRefresh} />
                        ) : (
                            <AddVehicleDialog onVehicleAdded={onRefresh} />
                        )
                    )}
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="px-4 pt-3">
                    <TabsList className="w-full grid grid-cols-2 bg-slate-200/50 border border-slate-200 h-9 p-1 rounded-md">
                        <TabsTrigger value="DRIVERS" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm rounded">DRIVERS ({drivers.length})</TabsTrigger>
                        <TabsTrigger value="VEHICLES" className="text-xs font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm rounded">VEHICLES ({vehicles.length})</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <TabsContent value="DRIVERS" className="mt-0 space-y-3">
                        {drivers.map(driver => (
                            <div key={driver.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-blue-600/30 hover:shadow transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200">
                                            <User className="h-5 w-5 text-slate-400" />
                                        </div>
                                        <div className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${(driver.status === 'ONLINE' || driver.status === 'FREE') ? 'bg-emerald-500' :
                                            driver.status === 'BUSY' ? 'bg-blue-600' : 'bg-red-500'
                                            }`} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 leading-none">{driver.name} <span className="text-slate-400 font-medium text-xs">({driver.callsign})</span></div>
                                        <div className="text-xs text-slate-500 mt-1.5 flex items-center gap-2">
                                            {driver.vehicles?.[0] ? (
                                                <span className="truncate max-w-[80px] font-mono text-blue-700 bg-blue-50 px-1 rounded">{driver.vehicles[0].reg}</span>
                                            ) : (
                                                <span className="text-slate-400 bg-slate-100 px-1 rounded">No Vehicle</span>
                                            )}
                                            <span className="text-slate-300">•</span>
                                            <span className="font-medium text-slate-600">{driver.phone}</span>
                                        </div>
                                        {driver.zoneQueues && driver.zoneQueues.length > 0 && (
                                            <div className="text-[10px] mt-1.5 flex items-center gap-1.5 text-emerald-600 font-bold">
                                                <span className="px-1.5 py-0.5 rounded flex items-center gap-1 bg-emerald-50 border border-emerald-200">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    {driver.zoneQueues[0].zone?.name || 'Queued'}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {selectedJobId && onAssign ? (
                                    <Button
                                        size="sm"
                                        className="h-8 px-4 text-xs bg-blue-600 text-white hover:bg-blue-700 font-bold shadow-sm animate-in fade-in"
                                        onClick={() => onAssign(driver.id)}
                                    >
                                        ASSIGN
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 h-7 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                        Details
                                    </Button>
                                )}
                            </div>
                        ))}
                        {drivers.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm font-medium">No drivers found. Add one +</div>
                        )}
                    </TabsContent>

                    <TabsContent value="VEHICLES" className="mt-0 space-y-3">
                        {vehicles.map(vehicle => (
                            <div key={vehicle.id} className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200 shadow-sm hover:border-blue-600/30 hover:shadow transition-all group">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center border border-slate-200">
                                        <Car className="h-5 w-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-bold text-slate-900 leading-none font-mono">{vehicle.reg}</div>
                                        <div className="text-xs text-slate-500 mt-1.5">{vehicle.model} • {vehicle.type}</div>
                                    </div>
                                </div>
                                <Badge variant="outline" className={`text-[10px] font-bold ${vehicle.driver ? 'text-blue-700 bg-blue-50 border-blue-200' : 'text-slate-500 bg-slate-100 border-slate-200'}`}>
                                    {vehicle.driver ? 'ASSIGNED' : 'POOL'}
                                </Badge>
                            </div>
                        ))}
                        {vehicles.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-sm font-medium">No vehicles found. Add one +</div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
