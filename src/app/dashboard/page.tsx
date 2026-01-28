"use client";


import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"; // Add Select
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar, Clock, MapPin, Car, User, Phone } from "lucide-react";
import { useEffect, useState } from "react";
import { Job, Customer, Driver, JOB_STATUSES, JobStatus } from "@/lib/types"; // Import Statuses

// Dynamically import the map with no SSR
const DispatchMap = dynamic(() => import("@/components/dispatch/DispatchMap"), {
    ssr: false,
    loading: () => <div className="h-full w-full bg-zinc-100 animate-pulse flex items-center justify-center">Loading Map...</div>,
});

export default function DispatchPage() {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [matchedCustomer, setMatchedCustomer] = useState<Customer | null>(null);
    const [estPrice, setEstPrice] = useState<{ price: number, rule: string } | null>(null);
    const [dropoff, setDropoff] = useState("");
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [pickup, setPickup] = useState("");
    const [dateFilter, setDateFilter] = useState("TODAY"); // TODAY, TOMORROW, ALL

    const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
    const [bookingTime, setBookingTime] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));

    // Autocomplete State
    const [pickupSuggestions, setPickupSuggestions] = useState<{ label: string, value: string }[]>([]);
    const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
    const [dropoffSuggestions, setDropoffSuggestions] = useState<{ label: string, value: string }[]>([]);
    const [showDropoffSuggestions, setShowDropoffSuggestions] = useState(false);

    const handleSaveJob = async () => {
        try {
            // Combine Date & Time
            const pickupDateTime = new Date(`${bookingDate}T${bookingTime}`);

            const res = await fetch("/api/jobs", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    passengerPhone: phone,
                    passengerName: name || matchedCustomer?.name,
                    pickupAddress: pickup || "Local",
                    dropoffAddress: dropoff,
                    fare: estPrice?.price.toString(),
                    paymentType: matchedCustomer?.isAccount ? "ACCOUNT" : "CASH",
                    customerId: matchedCustomer?.id,
                    pickupTime: pickupDateTime.toISOString()
                })
            });
            if (res.ok) {
                // Clear form
                setPhone("");
                setName("");
                setPickup("");
                setDropoff("");
                setMatchedCustomer(null);
                setEstPrice(null);
                const now = new Date(); // Reset time to now for next job
                setBookingTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));

                // Force immediate refresh
                // We can't easily call fetchData directly since it's inside useEffect, 
                // but we can rely on the optimistic update or trigger a re-mount. 
                // For now, let's just wait for the next poll (2s) OR manual reload. 
                // Actually, let's trigger a soft reload by toggling a state if we had one.
                // A clean way is to move fetchData out, but for this quick fix, 2s poll is acceptable 
                // IF we give good user feedback.
                alert("✅ JOB SAVED SUCCESSFULLY!");
            } else {
                const err = await res.json();
                alert(`Failed to save job: ${err.details || err.error || 'Unknown Error'}`);
            }
        } catch (e) {
            console.error("Failed to save job", e);
            alert("Error saving job. Please checking your connection.");
        }
    };

    // Autocomplete Logic
    useEffect(() => {
        if (pickup.length < 3) return;
        const timer = setTimeout(async () => {
            const res = await fetch(`/api/external/autocomplete?q=${encodeURIComponent(pickup)}`);
            const data = await res.json();
            if (data.results) setPickupSuggestions(data.results);
        }, 300);
        return () => clearTimeout(timer);
    }, [pickup]);

    useEffect(() => {
        if (dropoff.length < 3) return;
        const timer = setTimeout(async () => {
            const res = await fetch(`/api/external/autocomplete?q=${encodeURIComponent(dropoff)}`);
            const data = await res.json();
            if (data.results) setDropoffSuggestions(data.results);
        }, 300);
        return () => clearTimeout(timer);
    }, [dropoff]);

    useEffect(() => {
        if (!dropoff || !pickup) return;

        const fetchPrice = async () => {
            try {
                // Combine Date & Time for accurate surcharge calculation
                const pickupDateTime = new Date(`${bookingDate}T${bookingTime}`).toISOString();

                const res = await fetch("/api/pricing/calculate", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        pickup,
                        dropoff,
                        // Removed hardcoded distance to force backend geocoding
                        vehicleType: "Saloon",
                        date: pickupDateTime
                    })
                });

                if (res.ok) {
                    const data = await res.json();
                    setEstPrice({
                        price: data.price,
                        rule: data.isFixed ? `Fixed: ${(data.breakdown[0] as any).name}` : 'Metered Fare'
                    });
                }
            } catch (error) {
                console.error("Failed to fetch price", error);
            }
        };

        const timeout = setTimeout(fetchPrice, 800); // Debounce
        return () => clearTimeout(timeout);
    }, [pickup, dropoff, bookingDate, bookingTime]);

    const handlePhoneLookup = async (phone: string) => {
        if (phone.length > 5) {
            // Simulate CLI lookup delay
            const res = await fetch(`/api/internal/customers?phone=${phone}`);
            const data = await res.json();
            if (data.customer) {
                setMatchedCustomer(data.customer);
            } else {
                setMatchedCustomer(null);
            }
        } else {
            setMatchedCustomer(null);
        }
    };

    const handleStatusUpdate = async (jobId: string, newStatus: JobStatus) => {
        try {
            // Optimistic update
            setJobs(jobs.map(j => j.id === jobId ? { ...j, status: newStatus } : j));

            await fetch(`/api/jobs/${jobId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (error) {
            console.error("Failed to update status", error);
            // Revert would go here in a real app
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Parallel fetch
                const [jobsRes, driversRes] = await Promise.all([
                    fetch("/api/jobs"),
                    fetch("/api/drivers")
                ]);

                if (jobsRes.status === 401 || driversRes.status === 401) {
                    window.location.href = "/login";
                    return;
                }

                if (!jobsRes.ok || !driversRes.ok) {
                    console.error("Failed to fetch data", jobsRes.status, driversRes.status);
                    return;
                }

                const jobsData = await jobsRes.json();
                const driversData = await driversRes.json();

                if (Array.isArray(jobsData)) {
                    setJobs(jobsData);
                } else {
                    console.error("Invalid jobs data:", jobsData);
                    setJobs([]);
                }

                if (Array.isArray(driversData)) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const parsedDrivers = driversData.map((d: any) => ({
                        ...d,
                        location: d.location && typeof d.location === 'string' ? JSON.parse(d.location) : d.location
                    }));
                    setDrivers(parsedDrivers);
                } else {
                    console.error("Invalid drivers data:", driversData);
                    setDrivers([]);
                }
            } catch (e) {
                console.error("Dashboard fetch error:", e);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 2000); // Poll every 2s
        return () => clearInterval(interval);
    }, []);

    const filteredJobs = jobs.filter(job => {
        if (dateFilter === "ALL") return true;

        const jobDate = new Date(job.pickupTime || job.createdAt);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (dateFilter === "TODAY") {
            return jobDate.getDate() === today.getDate() && jobDate.getMonth() === today.getMonth();
        }
        if (dateFilter === "TOMORROW") {
            return jobDate.getDate() === tomorrow.getDate() && jobDate.getMonth() === tomorrow.getMonth();
        }
        return true;
    });

    return (
        <div className="flex h-full flex-col gap-2 p-2 md:p-0">
            {/* Top Section: Job Entry, Status, Map */}
            <div className="flex flex-col md:grid md:h-[60%] md:grid-cols-12 gap-2">

                {/* LEFT: JOB ENTRY FORM (Approx 30%) */}
                <div className="md:col-span-4 flex flex-col gap-2 order-2 md:order-1">
                    <Card className="flex-1 p-2 shadow-sm border-zinc-300 overflow-y-auto">
                        {/* Date & Time Row */}
                        <div className="mb-2 flex gap-1">
                            <Input
                                type="date"
                                className="h-8 bg-yellow-50 font-bold"
                                value={bookingDate}
                                onChange={(e) => setBookingDate(e.target.value)}
                            />
                            <Input
                                type="time"
                                className="h-8 w-24 bg-yellow-50 font-bold"
                                value={bookingTime}
                                onChange={(e) => setBookingTime(e.target.value)}
                            />
                            <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                onClick={() => {
                                    const now = new Date();
                                    setBookingDate(now.toISOString().split('T')[0]);
                                    setBookingTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
                                }}
                            >
                                NOW
                            </Button>
                        </div>

                        <div className="space-y-1 text-xs font-bold text-zinc-600">
                            {/* Phone Row */}
                            <div className="flex items-center gap-2">
                                <label className="w-10">PH:</label>
                                <Input
                                    className="h-9 flex-1 border-zinc-400 bg-white"
                                    placeholder="PHONE"
                                    onChange={(e) => {
                                        setPhone(e.target.value);
                                        handlePhoneLookup(e.target.value);
                                    }}
                                    value={phone}
                                />
                                <Input className="h-9 w-24 border-zinc-400 bg-white" placeholder="PRTY" />
                            </div>

                            <div className="py-1"></div>

                            {/* Pickup Row with Autocomplete */}
                            <div className="flex items-center gap-2 relative">
                                <label className="w-10">ADDR:</label>
                                <div className="flex-1 relative">
                                    <Input
                                        className="h-9 w-full border-zinc-400 bg-white"
                                        placeholder="PICKUP ADDRESS"
                                        value={pickup || matchedCustomer?.history?.[0]?.address || ""}
                                        onChange={(e) => {
                                            setPickup(e.target.value);
                                            setShowPickupSuggestions(true);
                                        }}
                                        onFocus={() => setShowPickupSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowPickupSuggestions(false), 200)}
                                    />
                                    {showPickupSuggestions && pickupSuggestions.length > 0 && (
                                        <div className="absolute top-full left-0 w-full bg-white border shadow-lg z-[1000] max-h-40 overflow-auto rounded-b text-xs">
                                            {pickupSuggestions.map((suggestion, i) => (
                                                <div
                                                    key={i}
                                                    className="p-2 hover:bg-zinc-100 cursor-pointer border-b"
                                                    onClick={() => {
                                                        setPickup(suggestion.value);
                                                        setShowPickupSuggestions(false);
                                                    }}
                                                >
                                                    {suggestion.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {matchedCustomer && !pickup && (
                                        <div className="absolute top-10 left-0 w-full bg-white border shadow-lg z-50 rounded p-1">
                                            <div className="text-[10px] bg-yellow-100 p-1 mb-1 font-bold flex justify-between">
                                                <span>CUSTOMER FOUND</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Dropoff Row with Autocomplete */}
                            <div className="flex items-center gap-2 relative">
                                <label className="w-10">DEST:</label>
                                <div className="flex-1 relative">
                                    <Input
                                        className="h-9 flex-1 border-zinc-400 bg-white"
                                        placeholder="DESTINATION"
                                        value={dropoff}
                                        onChange={(e) => {
                                            setDropoff(e.target.value);
                                            setShowDropoffSuggestions(true);
                                        }}
                                        onFocus={() => setShowDropoffSuggestions(true)}
                                        onBlur={() => setTimeout(() => setShowDropoffSuggestions(false), 200)}
                                    />
                                    {showDropoffSuggestions && dropoffSuggestions.length > 0 && (
                                        <div className="absolute top-full left-0 w-full bg-white border shadow-lg z-[1000] max-h-40 overflow-auto rounded-b text-xs">
                                            {dropoffSuggestions.map((suggestion, i) => (
                                                <div
                                                    key={i}
                                                    className="p-2 hover:bg-zinc-100 cursor-pointer border-b"
                                                    onClick={() => {
                                                        setDropoff(suggestion.value);
                                                        setShowDropoffSuggestions(false);
                                                    }}
                                                >
                                                    {suggestion.label}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <Button variant="outline" size="sm" className="h-9 px-2 text-xs">VIA</Button>
                            </div>

                            <div className="py-1"></div>

                            <div className="flex items-center gap-2">
                                <label className="w-10">NAME:</label>
                                <Input
                                    className="h-9 flex-1 border-zinc-400 bg-white"
                                    placeholder="PASSENGER NAME"
                                    value={name || matchedCustomer?.name || ""}
                                    onChange={(e) => setName(e.target.value)}
                                />
                                <Input className="h-9 w-32 border-zinc-400 bg-white" placeholder="EMAIL" />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="w-10">INST:</label>
                                <Input className="h-9 flex-1 border-zinc-400 bg-white" />
                                <Input className="h-9 w-32 border-zinc-400 bg-white" placeholder="DRIVER ID" />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="w-10">ACC:</label>
                                <Input className="h-9 flex-1 border-zinc-400 bg-white" placeholder="ACCOUNT CODE" />
                                <Input className="h-9 w-32 border-zinc-400 bg-white" placeholder="PIN" />
                            </div>

                            <div className="flex items-center gap-2 pt-2">
                                <label className="w-10">OPT:</label>
                                <Input className="h-9 w-16 border-zinc-400 bg-zinc-50" placeholder="PAX" />
                                <Input className="h-9 w-16 border-zinc-400 bg-zinc-50" placeholder="TAXI" />
                                <Input className="h-9 w-16 border-zinc-400 bg-zinc-50" placeholder="TYPE" />
                                <Input className="h-9 flex-1 border-zinc-400 bg-white" placeholder="LEAD TIME" />
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 flex justify-between">
                            <div className="flex gap-1">
                                <Button variant="secondary" className="h-10 w-10 p-0 text-zinc-600 border border-zinc-300">
                                    <Clock className="h-4 w-4" />
                                </Button>
                                <Button variant="secondary" className="h-10 w-10 p-0 text-zinc-600 border border-zinc-300">
                                    <MapPin className="h-4 w-4" />
                                </Button>
                            </div>
                            <Button
                                className="h-10 w-32 bg-zinc-700 hover:bg-zinc-600 text-white font-bold"
                                onClick={handleSaveJob}
                            >
                                Save Job [F1]
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* MIDDLE: INFO PANELS (Approx 20%) */}
                <div className="md:col-span-3 flex flex-row md:flex-col gap-2 order-3 md:order-2">
                    <Card className="flex-1 bg-yellow-50 p-2 border-yellow-200">
                        <div className="flex justify-between mb-2">
                            <span className="font-bold text-sm">ETA</span>
                            <div className="h-6 w-12 bg-yellow-200"></div>
                            <div className="h-6 w-12 bg-yellow-200"></div>
                        </div>
                        <div className="text-xs space-y-2">
                            <div className="border-b border-yellow-200 pb-1 flex justify-between">
                                <span>Parked</span>
                                <span>Dropping</span>
                            </div>
                            <div className="border-b border-yellow-200 pb-1">
                                <span>Bidding</span>
                            </div>
                        </div>
                    </Card>
                    <Card className="h-40 bg-zinc-100 p-2 border-zinc-300">
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-bold">FARE:</span>
                            <div className="px-2 py-1 bg-yellow-200 font-mono text-lg font-bold text-right min-w-[80px]">
                                {estPrice ? `£${estPrice.price.toFixed(2)}` : "0.00"}
                            </div>
                        </div>
                        {estPrice && (
                            <div className="text-[10px] text-center mb-2 bg-zinc-200 text-zinc-600 rounded">
                                {estPrice.rule}
                            </div>
                        )}
                        <div className="space-y-1">
                            <Button variant="ghost" className="w-full justify-start h-8 bg-red-100 text-red-700 hover:bg-red-200 text-xs font-bold rounded-sm">
                                x 0.00 N/A (ALT+D)
                            </Button>
                            <Button variant="ghost" className="w-full justify-start h-8 bg-purple-100 text-purple-700 hover:bg-purple-200 text-xs font-bold rounded-sm">
                                x 0.00 N/A (ALT+W)
                            </Button>
                            <Button variant="ghost" className="w-full justify-start h-8 bg-blue-100 text-blue-700 hover:bg-blue-200 text-xs font-bold rounded-sm">
                                x 0.00 N/A (ALT+E)
                            </Button>
                        </div>
                    </Card>
                </div>

                {/* RIGHT: MAP (Approx 50%) */}
                <div className="md:col-span-5 relative h-64 md:h-full order-1 md:order-3 rounded-lg overflow-hidden border border-zinc-300 shadow-sm">
                    {/* @ts-expect-error: Driver prop type compat */}
                    <DispatchMap className="h-full w-full shadow-inner" drivers={drivers} />

                    {/* Map Overlay Controls */}
                    <div className="absolute bottom-2 left-2 right-2 z-[400] bg-zinc-800/90 p-1 rounded flex gap-1">
                        <Input className="h-8 bg-white border-none text-xs flex-1" placeholder="Booking Search..." />
                        <Button size="sm" variant="destructive" className="h-8 px-2 text-xs">CLEAR</Button>
                        <Button size="sm" variant="secondary" className="h-8 px-2 text-xs bg-zinc-600 text-white">OPTIONS</Button>
                        <Button size="sm" variant="secondary" className="h-8 px-2 text-xs bg-zinc-600 text-white">ZONES</Button>
                    </div>

                    <div className="absolute top-2 right-2 z-[400] text-xs text-white bg-black/50 px-2 py-1 rounded">
                        Zones: 0 | Overview
                    </div>
                </div>
            </div>

            {/* Bottom Section: Active Jobs Grid */}
            <div className="flex-1 overflow-hidden flex flex-col bg-white border rounded-md shadow-sm">
                {/* Grid Filters */}
                <div className="flex flex-wrap items-center gap-1 bg-zinc-700 p-1 text-white text-xs">
                    <Button
                        size="sm"
                        className={`h-6 text-xs font-bold ${dateFilter === 'TODAY' ? 'bg-zinc-100 text-zinc-800' : 'bg-transparent text-zinc-300 hover:bg-zinc-600'}`}
                        onClick={() => setDateFilter('TODAY')}
                    >
                        TODAY
                    </Button>
                    <Button
                        size="sm"
                        className={`h-6 text-xs font-bold ${dateFilter === 'TOMORROW' ? 'bg-zinc-100 text-zinc-800' : 'bg-transparent text-zinc-300 hover:bg-zinc-600'}`}
                        onClick={() => setDateFilter('TOMORROW')}
                    >
                        TOMORROW
                    </Button>
                    <Button
                        size="sm"
                        className={`h-6 text-xs font-bold ${dateFilter === 'ALL' ? 'bg-zinc-100 text-zinc-800' : 'bg-transparent text-zinc-300 hover:bg-zinc-600'}`}
                        onClick={() => setDateFilter('ALL')}
                    >
                        ALL
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 hover:bg-zinc-600 text-zinc-300">PRE-BOOKED 1</Button>
                    <Button size="sm" variant="ghost" className="h-6 hover:bg-zinc-600 text-zinc-300">BOOKED 0</Button>
                    <Button size="sm" variant="ghost" className="h-6 hover:bg-zinc-600 text-zinc-300">COMPLETED</Button>
                    <Button size="sm" variant="ghost" className="h-6 hover:bg-zinc-600 text-zinc-300">CANCELLED</Button>
                    <div className="ml-auto flex gap-1">
                        <Button size="sm" variant="destructive" className="h-6 text-xs px-2">X REC JOBS</Button>
                        <Button size="sm" variant="secondary" className="h-6 text-xs px-2 bg-zinc-500 text-white">X GROUPS</Button>
                    </div>
                </div>

                {/* Data Table (Desktop) */}
                <div className="hidden md:block flex-1 overflow-auto">
                    <Table>
                        <TableHeader className="bg-zinc-100 sticky top-0">
                            <TableRow className="pointer-events-none text-xs font-bold text-zinc-700">
                                <TableHead className="w-[100px]">Time</TableHead>
                                <TableHead className="w-[50px]">Drv</TableHead>
                                <TableHead className="w-[100px]">Phone</TableHead>
                                <TableHead className="w-[120px]">Info</TableHead>
                                <TableHead className="min-w-[200px]">Pickup</TableHead>
                                <TableHead className="w-[80px]">Zone</TableHead>
                                <TableHead className="min-w-[200px]">Dest</TableHead>
                                <TableHead className="w-[100px]">Name</TableHead>
                                <TableHead className="w-[50px]">V</TableHead>
                                <TableHead className="w-[50px]">Acc</TableHead>
                                <TableHead className="w-[50px]">P</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="text-xs">
                            {filteredJobs.map((job) => (
                                <TableRow key={job.id} className="hover:bg-blue-50 cursor-pointer text-nowrap">
                                    <TableCell className="font-bold py-1">{new Date(job.pickupTime || job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</TableCell>
                                    <TableCell className="py-1">{job.driver?.callsign || '--'}</TableCell>
                                    <TableCell className="py-1">{job.passengerPhone}</TableCell>
                                    <TableCell className="py-1">
                                        <div className="flex gap-1">
                                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 px-1 py-0 h-5 rounded-none text-[10px]">{job.source}</Badge>
                                        </div>
                                    </TableCell>
                                    <TableCell className="truncate max-w-[200px] py-1 font-medium" title={job.pickupAddress}>{job.pickupAddress}</TableCell>
                                    <TableCell className="py-1">--</TableCell>
                                    <TableCell className="truncate max-w-[200px] py-1" title={job.dropoffAddress}>{job.dropoffAddress}</TableCell>
                                    <TableCell className="py-1">{job.passengerName}</TableCell>
                                    <TableCell className="py-1">Saloon</TableCell>
                                    <TableCell className="py-1 font-bold text-red-600">{job.paymentType === 'ACCOUNT' ? 'ACC' : null}</TableCell>
                                    <TableCell className="py-1">{job.passengers}</TableCell>
                                    <TableCell className="py-1" onClick={(e) => e.stopPropagation()}>
                                        <Select
                                            value={job.status}
                                            onValueChange={(val) => handleStatusUpdate(job.id, val as JobStatus)}
                                        >
                                            <SelectTrigger className={`h-6 w-[110px] text-[10px] font-bold border-none focus:ring-0 ${job.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                                job.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                    job.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                        'bg-blue-100 text-blue-700'
                                                }`}>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {JOB_STATUSES.map(s => (
                                                    <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {jobs.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={12} className="text-center py-4 text-zinc-400">No active jobs</TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile Job List (Cards) */}
                <div className="md:hidden flex-1 overflow-auto p-2 space-y-2 bg-zinc-50">
                    {filteredJobs.length === 0 && <div className="text-center p-4 text-zinc-400 text-sm">No active jobs for this period</div>}
                    {filteredJobs.map(job => (
                        <div key={job.id} className="bg-white p-3 rounded shadow-sm border border-zinc-200 flex flex-col gap-2">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-2">
                                    <Badge className="bg-zinc-800 text-white">{new Date(job.pickupTime || job.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Badge>
                                    <span className="font-bold text-sm">{job.passengerName}</span>
                                </div>
                                <div onClick={(e) => e.stopPropagation()}>
                                    <Select
                                        value={job.status}
                                        onValueChange={(val) => handleStatusUpdate(job.id, val as JobStatus)}
                                    >
                                        <SelectTrigger className={`h-6 w-[100px] text-[10px] font-bold border-none ${job.status === 'PENDING' ? 'bg-orange-100 text-orange-700' :
                                            job.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                job.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700'
                                            }`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {JOB_STATUSES.map(s => (
                                                <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                            <div className="text-xs text-zinc-600 grid grid-cols-[20px_1fr] gap-1 items-center">
                                <span className="font-bold text-green-600">P:</span> <span className="truncate">{job.pickupAddress}</span>
                                <span className="font-bold text-red-600">D:</span> <span className="truncate">{job.dropoffAddress}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 border-t border-zinc-100 mt-1">
                                <span className="text-[10px] font-mono text-zinc-400">{job.source}</span>
                                {job.fare && <span className="font-bold text-sm">£{job.fare.toFixed(2)}</span>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SMS Notification Overlay (Mock) */}
            <div className="absolute bottom-4 right-4 z-[500] flex flex-col gap-2">
                {jobs.length > 0 && (
                    <div className="bg-zinc-800 text-green-400 text-xs px-3 py-2 rounded shadow-lg border border-green-900 animate-in fade-in slide-in-from-bottom-2">
                        <div className="font-bold flex items-center gap-1">
                            <Phone className="h-3 w-3" /> SMS SENT
                        </div>
                        <div className="text-zinc-300">
                            Booking received. Confirmed with passenger {jobs[jobs.length - 1].passengerPhone}.
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
