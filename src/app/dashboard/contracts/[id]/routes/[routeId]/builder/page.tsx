"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Save, ArrowLeft, MapPin, Users, Settings2, PlusCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function RouteBuilderPage() {
    const params = useParams();
    const router = useRouter();
    const [route, setRoute] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Stop Manager State
    const [newStopAddress, setNewStopAddress] = useState("");
    const [newStopType, setNewStopType] = useState("PICKUP");
    const [newStopTime, setNewStopTime] = useState("");

    // Student Manager State
    const [newStudentName, setNewStudentName] = useState("");
    const [newStudentNotes, setNewStudentNotes] = useState("");
    const [newStudentPhone, setNewStudentPhone] = useState("");

    const fetchRoute = async () => {
        try {
            // Re-using the contract fetch to get the route, or build a specific GET /api/routes/[id]
            const res = await fetch(`/api/contracts/${params?.id}`);
            if (res.ok) {
                const contract = await res.json();
                const foundRoute = contract.routes.find((r: any) => r.id === params?.routeId);
                setRoute(foundRoute);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoute();
    }, [params?.id, params?.routeId]);

    const handleAddStop = async () => {
        if (!newStopAddress) return;
        try {
            const res = await fetch(`/api/routes/${route.id}/stops/route`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    address: newStopAddress,
                    type: newStopType,
                    scheduledTime: newStopTime,
                    sequenceIndex: route.stops ? route.stops.length : 0
                })
            });

            if (res.ok) {
                toast.success("Stop added");
                setNewStopAddress("");
                setNewStopTime("");
                fetchRoute();
            } else {
                toast.error("Failed to add stop");
            }
        } catch (error) {
            console.error(error);
        }
    };

    const handleAddStudent = async () => {
        if (!newStudentName) return;
        try {
            const res = await fetch(`/api/routes/${route.id}/students/route`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: newStudentName,
                    riskAssessmentNotes: newStudentNotes,
                    parentContactPhone: newStudentPhone
                })
            });

            if (res.ok) {
                toast.success("Student added");
                setNewStudentName("");
                setNewStudentNotes("");
                setNewStudentPhone("");
                fetchRoute();
            } else {
                toast.error("Failed to add student");
            }
        } catch (error) {
            console.error(error);
        }
    };

    if (loading) return <div className="p-10 text-slate-500">Loading Route Builder...</div>;
    if (!route) return <div className="p-10 text-red-500">Route not found</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto h-full overflow-auto space-y-6">
            <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Route Builder</h1>
                        <p className="text-slate-500 mt-1">{route.name} {route.routeNumber && `(${route.routeNumber})`}</p>
                    </div>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                    <Save className="mr-2 h-4 w-4" /> Save Route
                </Button>
            </div>

            <Tabs defaultValue="stops" className="w-full">
                <TabsList className="w-full justify-start border-b border-slate-200 rounded-none bg-transparent h-12 mb-6">
                    <TabsTrigger value="stops" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6 text-sm">
                        <MapPin className="w-4 h-4 mr-2" /> Schedule & Stops
                    </TabsTrigger>
                    <TabsTrigger value="students" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6 text-sm">
                        <Users className="w-4 h-4 mr-2" /> SEN Students
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 rounded-none px-6 text-sm">
                        <Settings2 className="w-4 h-4 mr-2" /> Constraints & Config
                    </TabsTrigger>
                </TabsList>

                {/* STOPS TAB */}
                <TabsContent value="stops" className="space-y-6">
                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                            <CardTitle className="text-lg">Route Schedule</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            {route.stops && route.stops.length > 0 ? (
                                <div className="divide-y divide-slate-100">
                                    {route.stops.map((stop: any, idx: number) => (
                                        <div key={stop.id} className="p-4 flex items-center gap-4 hover:bg-slate-50">
                                            <div className="flex flex-col items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-xs shrink-0">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium text-slate-800">{stop.address}</p>
                                                <p className="text-xs text-slate-500 font-mono mt-1">Type: {stop.type}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-bold text-indigo-700 font-mono">{stop.scheduledTime || "--:--"}</p>
                                                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-6 px-2 mt-1">
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-slate-500">No stops added yet.</div>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="border-slate-200 shadow-sm">
                        <CardHeader className="pb-3 border-b border-slate-100">
                            <CardTitle className="text-md flex items-center"><PlusCircle className="w-4 h-4 mr-2" /> Add Stop</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-12 gap-4">
                            <div className="md:col-span-6 space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Address / Location</label>
                                <Input value={newStopAddress} onChange={e => setNewStopAddress(e.target.value)} placeholder="e.g. 10 High Street, London" />
                            </div>
                            <div className="md:col-span-3 space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Stop Type</label>
                                <select 
                                    className="w-full flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                                    value={newStopType}
                                    onChange={e => setNewStopType(e.target.value)}
                                >
                                    <option value="PICKUP">Pickup Point</option>
                                    <option value="DROPOFF">Dropoff Point</option>
                                    <option value="SCHOOL">School</option>
                                </select>
                            </div>
                            <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Time</label>
                                <Input value={newStopTime} onChange={e => setNewStopTime(e.target.value)} type="time" />
                            </div>
                            <div className="md:col-span-1 flex items-end">
                                <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={handleAddStop}>Add</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* STUDENTS TAB */}
                <TabsContent value="students" className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            {route.students && route.students.length > 0 ? (
                                route.students.map((student: any) => (
                                    <Card key={student.id} className="border-slate-200 shadow-sm">
                                        <CardContent className="p-4 flex justify-between items-start">
                                            <div>
                                                <h3 className="font-bold text-slate-800 text-lg">{student.name}</h3>
                                                <div className="mt-2 space-y-1">
                                                    {student.riskAssessmentNotes && (
                                                        <div className="text-sm bg-amber-50 text-amber-800 p-2 rounded border border-amber-200">
                                                            <span className="font-bold text-xs uppercase tracking-wider block mb-1">Risk / SEN Notes</span>
                                                            {student.riskAssessmentNotes}
                                                        </div>
                                                    )}
                                                    {student.parentContactPhone && (
                                                        <div className="text-sm text-slate-600 flex items-center mt-2">
                                                            <span className="font-medium mr-2">Parent/Guardian Contact:</span>
                                                            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded">{student.parentContactPhone}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))
                            ) : (
                                <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
                                    <Users className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                    <p className="text-slate-500">No SEN students assigned to this route.</p>
                                </div>
                            )}
                        </div>

                        <Card className="border-slate-200 shadow-sm h-fit">
                            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50">
                                <CardTitle className="text-md">Assign Student</CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Student Name</label>
                                    <Input value={newStudentName} onChange={e => setNewStudentName(e.target.value)} placeholder="e.g. John Smith" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Risk Assessment / Notes</label>
                                    <Textarea 
                                        value={newStudentNotes} 
                                        onChange={e => setNewStudentNotes(e.target.value)} 
                                        placeholder="Specific SEN needs, seating requirements, behavioral notes..." 
                                        className="h-24 resize-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase">Emergency Contact</label>
                                    <Input value={newStudentPhone} onChange={e => setNewStudentPhone(e.target.value)} placeholder="Phone number" />
                                </div>
                                <Button className="w-full bg-slate-900 hover:bg-slate-800" onClick={handleAddStudent}>Add Student</Button>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* SETTINGS TAB */}
                <TabsContent value="settings" className="space-y-6">
                    <Card className="border-slate-200 shadow-sm max-w-2xl">
                        <CardHeader className="bg-slate-50 border-b border-slate-100 pb-4">
                            <CardTitle className="text-lg">Route Constraints</CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-slate-900">Wheelchair Accessible (WAV) Required</h4>
                                    <p className="text-sm text-slate-500">Only WAV-compliant vehicles can be assigned to this route.</p>
                                </div>
                                <Switch checked={route.requiresWav} />
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="font-medium text-slate-900">Passenger Assistant Required</h4>
                                    <p className="text-sm text-slate-500">A vetted PA must be assigned alongside the driver.</p>
                                </div>
                                <Switch checked={route.requiresPa} />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}
