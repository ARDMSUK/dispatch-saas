'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Car, Phone } from 'lucide-react';
import { AddDriverDialog, AddVehicleDialog } from '@/components/dashboard/fleet-dialogs';

interface DriverFleetPanelProps {
    drivers: any[];
    vehicles: any[];
    onRefresh: () => void;
    onAssign?: (driverId: string) => void;
    selectedJobId?: string; // Changed to string to match usage
}

export function DriverFleetPanel({ drivers, vehicles, onRefresh, onAssign, selectedJobId }: DriverFleetPanelProps) {
    const [activeTab, setActiveTab] = useState('DRIVERS');

    // Fetching is now handled by parent

    return (
        <div className="h-full flex flex-col bg-zinc-900/30 border-t border-white/5">
            <div className="px-4 py-3 border-b border-white/5 flex justify-between items-center bg-zinc-950/50">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Fleet Management</span>
                <div className="flex gap-1">
                    {activeTab === 'DRIVERS' ? (
                        <AddDriverDialog onDriverAdded={onRefresh} />
                    ) : (
                        <AddVehicleDialog onVehicleAdded={onRefresh} />
                    )}
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <div className="px-4 pt-2">
                    <TabsList className="w-full grid grid-cols-2 bg-black/40 border border-white/10 h-8">
                        <TabsTrigger value="DRIVERS" className="text-[10px] font-bold">DRIVERS ({drivers.length})</TabsTrigger>
                        <TabsTrigger value="VEHICLES" className="text-[10px] font-bold">VEHICLES ({vehicles.length})</TabsTrigger>
                    </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <TabsContent value="DRIVERS" className="mt-0 space-y-2">
                        {drivers.map(driver => (
                            <div key={driver.id} className="flex items-center justify-between p-3 rounded bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors group">
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center border border-white/10">
                                            <User className="h-4 w-4 text-zinc-400" />
                                        </div>
                                        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-black ${driver.status === 'ONLINE' ? 'bg-emerald-500' :
                                            driver.status === 'BUSY' ? 'bg-amber-500' : 'bg-red-500'
                                            }`} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white leading-none">{driver.name} <span className="text-zinc-500 text-[10px]">({driver.callsign})</span></div>
                                        <div className="text-[10px] text-zinc-500 mt-1 flex items-center gap-2">
                                            {driver.vehicles?.[0] ? (
                                                <span className="truncate max-w-[80px] text-indigo-400">{driver.vehicles[0].reg}</span>
                                            ) : (
                                                <span className="text-zinc-600">No Vehicle</span>
                                            )}
                                            <span>•</span>
                                            <span>{driver.phone}</span>
                                        </div>
                                    </div>
                                </div>

                                {selectedJobId && onAssign ? (
                                    <Button
                                        size="sm"
                                        className="h-7 text-xs bg-amber-500 text-black hover:bg-amber-400 font-bold animate-in fade-in"
                                        onClick={() => onAssign(driver.id)}
                                    >
                                        ASSIGN
                                    </Button>
                                ) : (
                                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 h-6 text-[10px] bg-white/5 hover:bg-white/10">
                                        Details
                                    </Button>
                                )}
                            </div>
                        ))}
                        {drivers.length === 0 && (
                            <div className="text-center py-8 text-zinc-500 text-xs">No drivers found. Add one +</div>
                        )}
                    </TabsContent>

                    <TabsContent value="VEHICLES" className="mt-0 space-y-2">
                        {vehicles.map(vehicle => (
                            <div key={vehicle.id} className="flex items-center justify-between p-3 rounded bg-zinc-900/50 border border-white/5 hover:border-white/10 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded bg-zinc-800 flex items-center justify-center border border-white/10">
                                        <Car className="h-4 w-4 text-zinc-500" />
                                    </div>
                                    <div>
                                        <div className="text-sm font-medium text-white leading-none font-mono">{vehicle.reg}</div>
                                        <div className="text-[10px] text-zinc-500 mt-1">{vehicle.model} • {vehicle.type}</div>
                                    </div>
                                </div>
                                <Badge variant="outline" className="text-[9px] text-zinc-500 border-zinc-500/20">
                                    {vehicle.driver ? 'ASSIGNED' : 'POOL'}
                                </Badge>
                            </div>
                        ))}
                        {vehicles.length === 0 && (
                            <div className="text-center py-8 text-zinc-500 text-xs">No vehicles found. Add one +</div>
                        )}
                    </TabsContent>
                </div>
            </Tabs>
        </div>
    );
}
