"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { FileText, Phone, Search, Play, Volume2, ShieldAlert, CheckCircle, RefreshCw } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

export default function LogsPage() {
    const [activeTab, setActiveTab] = useState("audit");
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [callLogs, setCallLogs] = useState<any[]>([]);
    const [loadingAudit, setLoadingAudit] = useState(true);
    const [loadingCalls, setLoadingCalls] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal state for audio/transcript
    const [selectedCall, setSelectedCall] = useState<any>(null);

    const fetchAuditLogs = async () => {
        setLoadingAudit(true);
        try {
            const res = await fetch("/api/logs");
            if (res.ok) setAuditLogs(await res.json());
        } catch (error) {
            console.error("Failed to load audit logs", error);
        } finally {
            setLoadingAudit(false);
        }
    };

    const fetchCallLogs = async () => {
        setLoadingCalls(true);
        try {
            const res = await fetch("/api/calls");
            if (res.ok) setCallLogs(await res.json());
        } catch (error) {
            console.error("Failed to load call logs", error);
        } finally {
            setLoadingCalls(false);
        }
    };

    useEffect(() => {
        fetchAuditLogs();
        fetchCallLogs();
    }, []);

    const filteredAudit = auditLogs.filter(log =>
        log.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredCalls = callLogs.filter(call =>
        call.phone.includes(searchTerm) ||
        (call.status && call.status.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (call.answeredBy?.name && call.answeredBy.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (call.transcript && call.transcript.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (call.booking?.id && call.booking.id.toString().includes(searchTerm)) ||
        (call.booking?.id && `TRIP-${call.booking.id}`.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const getCallStatusBadge = (status: string) => {
        switch (status) {
            case "ANSWERED":
                return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">Answered</Badge>;
            case "RINGING":
                return <Badge className="bg-blue-50 text-indigo-600 border border-blue-200 animate-pulse">Ringing</Badge>;
            default:
                return <Badge className="bg-slate-50 text-slate-700 border border-slate-200">Dismissed</Badge>;
        }
    };

    const getAuditTypeColor = (type: string) => {
        switch (type) {
            case "Booking":
                return "bg-indigo-50 text-indigo-700 border border-indigo-200";
            case "Driver Profile":
                return "bg-indigo-50 text-indigo-700 border border-indigo-200";
            case "Vehicle Record":
                return "bg-blue-50 text-indigo-600 border border-blue-200";
            case "Pricing Zone":
                return "bg-emerald-50 text-emerald-700 border border-emerald-200";
            case "Contract Run":
                return "bg-purple-50 text-purple-700 border border-purple-200";
            default:
                return "bg-slate-50 text-slate-700 border border-slate-200";
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto h-full overflow-auto space-y-6 flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">System Logs & Voice Records</h1>
                    <p className="text-slate-500 mt-1">Audit administrative database mutations, track system updates, and review VoIP call logs.</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Filter records..."
                            className="pl-9 bg-white border-slate-200 focus:border-indigo-500/50"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="icon" onClick={activeTab === "audit" ? fetchAuditLogs : fetchCallLogs} className="bg-white border-slate-200">
                        <RefreshCw className="h-4 w-4 text-slate-500" />
                    </Button>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                <TabsList className="bg-slate-100 border border-slate-200 self-start p-1 h-auto mb-4">
                    <TabsTrigger value="audit" className="py-2 px-6 data-[state=active]:bg-white shadow-sm border border-slate-200 data-[state=active]:text-white transition-all font-semibold">
                        <FileText className="w-4 h-4 mr-2" /> System Audit Trail
                    </TabsTrigger>
                    <TabsTrigger value="voip" className="py-2 px-6 data-[state=active]:bg-white shadow-sm border border-slate-200 data-[state=active]:text-white transition-all font-semibold">
                        <Phone className="w-4 h-4 mr-2" /> VoIP Call History
                    </TabsTrigger>
                </TabsList>

                {/* AUDIT TAB */}
                <TabsContent value="audit" className="flex-1 mt-0">
                    <Card className="h-full overflow-hidden border-slate-200 shadow-sm bg-white">
                        <div className="overflow-auto max-h-[500px]">
                            <Table>
                                <TableHeader className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                                    <TableRow className="border-slate-200">
                                        <TableHead className="text-slate-500 w-[120px]">Module</TableHead>
                                        <TableHead className="text-slate-500 w-[150px]">Action</TableHead>
                                        <TableHead className="text-slate-500">Activity Summary</TableHead>
                                        <TableHead className="text-slate-500 w-[180px] text-right">Timestamp</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingAudit ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-48 text-center text-slate-400">
                                                <div className="flex justify-center items-center space-x-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                                                    <span>Loading audit trail...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredAudit.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-48 text-center text-slate-400">
                                                No activity records found matching query.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredAudit.map((log) => (
                                            <TableRow key={log.id} className="border-slate-200 hover:bg-slate-50/50">
                                                <TableCell>
                                                    <Badge className={`${getAuditTypeColor(log.type)} text-[10px] font-bold uppercase tracking-wider`}>
                                                        {log.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-semibold text-slate-800 text-sm">
                                                    {log.action}
                                                </TableCell>
                                                <TableCell className="text-slate-600 text-sm">
                                                    {log.description}
                                                </TableCell>
                                                <TableCell className="text-right text-slate-400 text-xs font-mono">
                                                    {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm:ss')}
                                                    <span className="block text-[10px] text-slate-400/80 mt-0.5">
                                                        ({formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })})
                                                    </span>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                {/* VOIP TAB */}
                <TabsContent value="voip" className="flex-1 mt-0">
                    <Card className="h-full overflow-hidden border-slate-200 shadow-sm bg-white">
                        <div className="overflow-auto max-h-[500px]">
                            <Table>
                                <TableHeader className="bg-slate-50 sticky top-0 border-b border-slate-200 z-10">
                                    <TableRow className="border-slate-200">
                                        <TableHead className="text-slate-500 w-[140px]">Phone</TableHead>
                                        <TableHead className="text-slate-500 w-[120px]">Status</TableHead>
                                        <TableHead className="text-slate-500">Answered By</TableHead>
                                        <TableHead className="text-slate-500 w-[80px]">Duration</TableHead>
                                        <TableHead className="text-slate-500">Related Job</TableHead>
                                        <TableHead className="text-slate-500 w-[180px] text-right">Call Date</TableHead>
                                        <TableHead className="w-[100px] text-center"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {loadingCalls ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-48 text-center text-slate-400">
                                                <div className="flex justify-center items-center space-x-2">
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-500"></div>
                                                    <span>Loading voice logs...</span>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : filteredCalls.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-48 text-center text-slate-400">
                                                No voice call records found matching query.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCalls.map((call) => (
                                            <TableRow key={call.id} className="border-slate-200 hover:bg-slate-50/50">
                                                <TableCell className="font-mono text-slate-800 font-bold">{call.phone}</TableCell>
                                                <TableCell>{getCallStatusBadge(call.status)}</TableCell>
                                                <TableCell className="text-sm font-semibold text-slate-700">
                                                    {call.answeredBy?.name || (call.answeredByExt ? `Extension ${call.answeredByExt}` : "-")}
                                                </TableCell>
                                                <TableCell className="text-sm text-slate-600 font-mono">
                                                    {call.duration ? `${call.duration}s` : "-"}
                                                </TableCell>
                                                <TableCell className="text-sm font-medium text-indigo-600">
                                                    {call.booking ? `TRIP-${call.booking.id}` : "-"}
                                                </TableCell>
                                                <TableCell className="text-right text-slate-400 text-xs font-mono">
                                                    {format(new Date(call.createdAt), 'MMM d, yyyy HH:mm')}
                                                    <span className="block text-[10px] text-slate-400/80 mt-0.5">
                                                        ({formatDistanceToNow(new Date(call.createdAt), { addSuffix: true })})
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-center">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 border-slate-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex items-center gap-1 mx-auto"
                                                        onClick={() => setSelectedCall(call)}
                                                    >
                                                        <Volume2 className="h-3.5 w-3.5" /> Details
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* CALL TRANSCRIPT / METADATA DIALOG */}
            <Dialog open={selectedCall !== null} onOpenChange={(open) => { if (!open) setSelectedCall(null); }}>
                <DialogContent className="sm:max-w-[500px] bg-white border-slate-200 text-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold">Call Records: {selectedCall?.phone}</DialogTitle>
                    </DialogHeader>
                    {selectedCall && (
                        <div className="space-y-4 pt-4">
                            <div className="flex justify-between items-center text-xs text-slate-400 font-mono border-b pb-2">
                                <span>Date: {format(new Date(selectedCall.createdAt), 'MMM d, yyyy HH:mm:ss')}</span>
                                <span>Duration: {selectedCall.duration ? `${selectedCall.duration}s` : "N/A"}</span>
                            </div>

                            {selectedCall.recordingUrl ? (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Audio Recording</h4>
                                    <audio controls className="w-full h-10 border rounded bg-slate-50" src={selectedCall.recordingUrl} />
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Audio Recording</h4>
                                    <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center">
                                        <p className="text-xs text-slate-500 italic">No audio recording available for this call</p>
                                    </div>
                                </div>
                            )}

                            {selectedCall.summary ? (
                                <div className="space-y-1 bg-indigo-50/50 p-3 rounded border border-indigo-100/50">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-700">AI Call Summary</h4>
                                    <p className="text-sm text-slate-700 leading-relaxed font-sans">{selectedCall.summary}</p>
                                </div>
                            ) : (
                                <div className="space-y-1 bg-slate-50/50 p-3 rounded border border-slate-200/50">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">AI Call Summary</h4>
                                    <p className="text-xs text-slate-500 italic">No summary available</p>
                                </div>
                            )}

                            {selectedCall.transcript ? (
                                <div className="space-y-1">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">Call Transcript</h4>
                                    <div className="border border-slate-200 rounded p-3 text-xs bg-slate-50/50 leading-relaxed max-h-[180px] overflow-y-auto font-mono whitespace-pre-line text-slate-600">
                                        {selectedCall.transcript}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Call Transcript</h4>
                                    <div className="border border-slate-200 border-dashed rounded p-3 text-center bg-slate-50/20">
                                        <p className="text-xs text-slate-500 italic">No transcript available</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
