
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Power, MapPin, Navigation, Phone, User, LogOut, Clock, Truck } from 'lucide-react';
import { toast } from 'sonner';

import { JobCard } from '@/components/driver/job-card';
import { JobHistory } from '@/components/driver/job-history';

export default function DriverDashboard() {
    const router = useRouter();
    const [driver, setDriver] = useState<any>(null);
    const [online, setOnline] = useState(false);
    const [activeJob, setActiveJob] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load Driver Info
        const token = localStorage.getItem('driver_token');
        const driverStr = localStorage.getItem('driver_info');

        if (!token || !driverStr) {
            router.push('/driver/login');
            return;
        }

        const driverData = JSON.parse(driverStr);
        setDriver(driverData);
        setOnline(driverData.status !== 'OFF_DUTY'); // Initial state guess

        // Initial Fetch
        fetchActiveJob(driverData.id);

        // Polling (Every 10s)
        const interval = setInterval(() => {
            fetchActiveJob(driverData.id);
        }, 10000);

        // Location Tracking
        let watchId: number;
        if (navigator.geolocation && driverData.status !== 'OFF_DUTY') {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    updateLocation(latitude, longitude);
                },
                (error) => console.error("Location Error:", error),
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 1000 }
            );
        }

        return () => {
            clearInterval(interval);
            if (watchId) navigator.geolocation.clearWatch(watchId);
        };
    }, [online]); // Re-run when online status changes

    const updateLocation = async (lat: number, lng: number) => {
        try {
            const token = localStorage.getItem('driver_token');
            if (!token) return;

            await fetch('/api/driver/location', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ lat, lng })
            });
        } catch (error) {
            console.error("Failed to update location", error);
        }
    };

    const fetchActiveJob = async (driverId: string) => {
        try {
            const token = localStorage.getItem('driver_token');
            if (!token) return;

            const res = await fetch('/api/driver/jobs', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const jobs = await res.json();
                // The API now returns only my active jobs. 
                // We pick the first one as "Active" for the dashboard card.
                // In reality we might have multiple, but for MVP one active job is standard.
                // If we have text 'DISPATCHED' (Offer), it shows as offer.
                if (jobs.length > 0) {
                    setActiveJob(jobs[0]);
                } else {
                    setActiveJob(null);
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusUpdate = async (jobId: number, newStatus: string) => {
        // Optimistic Update
        const previousJob = activeJob;
        setActiveJob({ ...activeJob, status: newStatus });

        try {
            const token = localStorage.getItem('driver_token');
            const res = await fetch(`/api/driver/jobs/${jobId}/status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (res.ok) {
                toast.success("Status Updated");
                if (newStatus === 'COMPLETED') {
                    setActiveJob(null); // Clear job logic
                }
                fetchActiveJob(driver.id); // Refresh real data
            } else {
                toast.error("Update Failed");
                setActiveJob(previousJob); // Revert
            }
        } catch (e) {
            toast.error("Connection Error");
            setActiveJob(previousJob);
        }
    };

    const toggleStatus = async () => {
        const newStatus = online ? 'OFF_DUTY' : 'FREE';
        const oldStatus = online ? 'FREE' : 'OFF_DUTY'; // approximate

        setOnline(!online); // Optimistic Update

        try {
            const token = localStorage.getItem('driver_token');
            const res = await fetch('/api/driver/status', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            if (!res.ok) throw new Error("Failed to update status");

            // Update local storage to persist state on refresh
            const updatedDriver = { ...driver, status: newStatus };
            setDriver(updatedDriver);
            localStorage.setItem('driver_info', JSON.stringify(updatedDriver));

            toast.success(newStatus === 'FREE' ? "You are ONLINE" : "You are OFFLINE");
        } catch (e) {
            console.error(e);
            setOnline(!online); // Revert
            toast.error("Failed to update status");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('driver_token');
        localStorage.removeItem('driver_info');
        router.push('/driver/login');
    };

    if (!driver) return null;

    return (
        <div className="flex flex-col h-screen bg-zinc-950 pb-20"> {/* pb-20 for bottom nav */}

            {/* Header */}
            <div className="bg-zinc-900 border-b border-zinc-800 p-4 pt-12 flex justify-between items-center sticky top-0 z-50 shadow-lg shadow-black/50">
                <div>
                    <h1 className="text-lg font-bold text-white leading-none">{driver.callsign}</h1>
                    <p className="text-xs text-zinc-500">{driver.name}</p>
                </div>

                <Button
                    size="sm"
                    variant={online ? "default" : "secondary"}
                    className={online ? "bg-emerald-500 hover:bg-emerald-600 text-black font-bold" : "bg-zinc-800 text-zinc-400"}
                    onClick={toggleStatus}
                >
                    <Power className="h-4 w-4 mr-2" />
                    {online ? 'ONLINE' : 'OFFLINE'}
                </Button>
            </div>

            {/* Main Content */}
            <Tabs defaultValue="JOB" className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                    <TabsContent value="JOB" className="mt-0 h-full">
                        {online ? (
                            <JobCard
                                job={activeJob}
                                onStatusUpdate={handleStatusUpdate}
                                onReject={(id) => handleStatusUpdate(id, 'UNASSIGNED')}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-zinc-600 space-y-4">
                                <div className="h-20 w-20 rounded-full bg-zinc-900 flex items-center justify-center border border-zinc-800">
                                    <Power className="h-8 w-8 text-zinc-700" />
                                </div>
                                <p>Go Online to receive jobs</p>
                            </div>
                        )}
                    </TabsContent>

                    <TabsContent value="HISTORY" className="mt-0">
                        <JobHistory />
                    </TabsContent>

                    <TabsContent value="PROFILE" className="mt-0">
                        <div className="space-y-4">
                            <div className="bg-zinc-900 rounded-xl p-4 border border-zinc-800">
                                <h3 className="text-sm font-medium text-zinc-400 mb-2 uppercase tracking-wider">Vehicle</h3>
                                <div className="flex items-center justify-between">
                                    <span className="text-white">Silver Prius</span>
                                    <Badge variant="outline">Saloon</Badge>
                                </div>
                                <p className="text-zinc-500 text-sm mt-1">LV23 XYZ</p>
                            </div>

                            <Button variant="destructive" className="w-full" onClick={handleLogout}>
                                <LogOut className="h-4 w-4 mr-2" /> Logout
                            </Button>
                        </div>
                    </TabsContent>
                </div>

                {/* Bottom Nav */}
                <div className="border-t border-zinc-800 bg-zinc-900/90 backdrop-blur pb-safe">
                    <TabsList className="w-full h-16 bg-transparent p-0 gap-0">
                        <TabsTrigger value="JOB" className="flex-1 h-full flex flex-col items-center justify-center gap-1 rounded-none data-[state=active]:bg-transparent data-[state=active]:text-amber-500 text-zinc-500 border-t-2 border-transparent data-[state=active]:border-amber-500 transition-colors">
                            <Truck className="h-5 w-5" />
                            <span className="text-[10px] font-medium">Job</span>
                        </TabsTrigger>
                        <TabsTrigger value="HISTORY" className="flex-1 h-full flex flex-col items-center justify-center gap-1 rounded-none data-[state=active]:bg-transparent data-[state=active]:text-amber-500 text-zinc-500 border-t-2 border-transparent data-[state=active]:border-amber-500 transition-colors">
                            <Clock className="h-5 w-5" />
                            <span className="text-[10px] font-medium">History</span>
                        </TabsTrigger>
                        <TabsTrigger value="PROFILE" className="flex-1 h-full flex flex-col items-center justify-center gap-1 rounded-none data-[state=active]:bg-transparent data-[state=active]:text-amber-500 text-zinc-500 border-t-2 border-transparent data-[state=active]:border-amber-500 transition-colors">
                            <User className="h-5 w-5" />
                            <span className="text-[10px] font-medium">Profile</span>
                        </TabsTrigger>
                    </TabsList>
                </div>
            </Tabs>
        </div>
    );
}
