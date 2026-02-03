
"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Dynamic import for Map to avoid SSR issues
const ZoneMap = dynamic(() => import("./_components/ZoneMap"), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-zinc-100 animate-pulse flex items-center justify-center">Loading Map...</div>,
});

export default function ZonesPage() {
    const [zones, setZones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // New Zone State
    const [newZoneName, setNewZoneName] = useState("");
    const [newZoneColor, setNewZoneColor] = useState("#3b82f6");
    const [newZonePoints, setNewZonePoints] = useState<any[]>([]); // Array of {lat, lng}

    const fetchZones = async () => {
        try {
            const res = await fetch("/api/zones");
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data)) {
                    setZones(data);
                } else {
                    console.error("API returned non-array data:", data);
                    setZones([]);
                }
            } else {
                console.error("Failed to fetch zones:", res.statusText);
            }
        } catch (error) {
            console.error("Failed to fetch zones", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchZones();
    }, []);

    const handleCreate = async () => {
        if (!newZoneName || newZonePoints.length < 3) {
            alert("Please provide a name and draw a polygon with at least 3 points.");
            return;
        }

        try {
            const payload = {
                name: newZoneName,
                color: newZoneColor,
                coordinates: JSON.stringify(newZonePoints)
            };

            const res = await fetch("/api/zones", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                setIsDialogOpen(false);
                setNewZoneName("");
                setNewZonePoints([]);
                fetchZones();
            } else {
                alert("Failed to create zone");
            }
        } catch (error) {
            console.error("Error creating zone", error);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 bg-zinc-50 gap-4">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-zinc-800">Zone Management</h1>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-zinc-800 hover:bg-zinc-700">
                            <Plus className="mr-2 h-4 w-4" /> Add New Zone
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Create Pricing Zone</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-[1fr_2fr] gap-4 h-full overflow-hidden">
                            <div className="flex flex-col gap-4 py-4">
                                <Input
                                    placeholder="Zone Name (e.g. City Centre)"
                                    value={newZoneName}
                                    onChange={e => setNewZoneName(e.target.value)}
                                />
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Zone Color</label>
                                    <div className="flex gap-2 flex-wrap">
                                        {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899'].map(c => (
                                            <div
                                                key={c}
                                                className={`w-8 h-8 rounded-full cursor-pointer border-2 ${newZoneColor === c ? 'border-zinc-800' : 'border-transparent'}`}
                                                style={{ backgroundColor: c }}
                                                onClick={() => setNewZoneColor(c)}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div className="text-sm text-zinc-500">
                                    <p>Instructions:</p>
                                    <ol className="list-decimal pl-4 space-y-1 mt-1">
                                        <li>Use the map to find your location.</li>
                                        <li>Click the "Polygon" tool (Pentagon icon) on the map.</li>
                                        <li>Click points to draw the shape.</li>
                                        <li>Click the first point again to close the loop.</li>
                                    </ol>
                                </div>
                                <div className="mt-auto">
                                    <p className="mb-2 text-xs font-bold text-zinc-500">{newZonePoints.length} Points Captured</p>
                                    <Button onClick={handleCreate} className="w-full bg-zinc-800" disabled={newZonePoints.length < 3}>
                                        Save Zone
                                    </Button>
                                </div>
                            </div>
                            <div className="rounded-lg overflow-hidden border">

                                <ZoneMap
                                    color={newZoneColor}
                                    onPolygonComplete={(points: any[]) => setNewZonePoints(points)}
                                />
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid grid-cols-[300px_1fr] gap-4 flex-1 overflow-hidden">
                <Card className="flex flex-col overflow-hidden">
                    <div className="p-4 border-b bg-zinc-100 font-bold text-xs text-zinc-500 uppercase tracking-wider">
                        Active Zones
                    </div>
                    <div className="flex-1 overflow-auto p-2 space-y-2">
                        {loading ? <p className="text-center text-sm p-4 text-zinc-400">Loading...</p> :
                            zones.map(zone => (
                                <div key={zone.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-zinc-50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: zone.color }}></div>
                                        <span className="font-medium text-sm text-zinc-900">{zone.name}</span>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-zinc-400 hover:text-red-500">
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))
                        }
                        {zones.length === 0 && !loading && <p className="text-center text-sm p-4 text-zinc-400">No zones defined</p>}
                    </div>
                </Card>
                <div className="rounded-lg border overflow-hidden shadow-sm bg-white relative">
                    {/* Read-only Map View of all Zones */}

                    <ZoneMap zones={zones} readOnly />
                </div>
            </div>
        </div>
    );
}
