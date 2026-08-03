"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { CalendarDays, AlertTriangle } from "lucide-react";

interface BulkGenerateModalProps {
    routeId: string;
    routeName: string;
}

export function BulkGenerateModal({ routeId, routeName }: BulkGenerateModalProps) {
    const [open, setOpen] = useState(false);

    // Form state
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [operatingWeekdays, setOperatingWeekdays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
    const [excludedDates, setExcludedDates] = useState<string>("");

    // Status state
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState<"input" | "preview" | "result">("input");

    // Result state
    const [previewData, setPreviewData] = useState<any>(null);
    const [confirmData, setConfirmData] = useState<any>(null);

    const handlePreview = async () => {
        if (!startDate || !endDate) {
            toast.error("Start and end dates are required");
            return;
        }

        const excludedArray = excludedDates
            .split(',')
            .map(d => d.trim())
            .filter(d => d.length > 0);

        setLoading(true);
        try {
            const res = await fetch('/api/internal/contracts/generate-bulk/preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contractRouteId: routeId,
                    startDate,
                    endDate,
                    operatingWeekdays,
                    excludedDates: excludedArray
                })
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to generate preview");
                return;
            }

            setPreviewData(data);
            setStep("preview");
        } catch (error) {
            console.error(error);
            toast.error("An error occurred");
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async () => {
        const excludedArray = excludedDates
            .split(',')
            .map(d => d.trim())
            .filter(d => d.length > 0);

        setLoading(true);
        try {
            const res = await fetch('/api/internal/contracts/generate-bulk/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contractRouteId: routeId,
                    startDate,
                    endDate,
                    operatingWeekdays,
                    excludedDates: excludedArray
                })
            });

            const data = await res.json();
            if (!res.ok) {
                toast.error(data.error || "Failed to generate jobs");
                return;
            }

            setConfirmData(data);
            setStep("result");
            toast.success(`Successfully generated ${data.totalCreated} jobs`);
        } catch (error) {
            console.error(error);
            toast.error("An error occurred during generation");
        } finally {
            setLoading(false);
        }
    };

    const toggleWeekday = (day: number) => {
        setOperatingWeekdays(prev =>
            prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort()
        );
    };

    const reset = () => {
        setStep("input");
        setPreviewData(null);
        setConfirmData(null);
        setStartDate("");
        setEndDate("");
        setExcludedDates("");
        setOperatingWeekdays([1, 2, 3, 4, 5]);
    };

    return (
        <Dialog open={open} onOpenChange={(val) => {
            if (!val) reset();
            setOpen(val);
        }}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <CalendarDays className="w-4 h-4 mr-2" /> Bulk Generate Jobs
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Bulk Generate: {routeName}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto pr-2 py-4 space-y-4">
                    {step === "input" && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Term Start Date</label>
                                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-semibold text-slate-700">Term End Date</label>
                                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Operating Days</label>
                                <div className="flex flex-wrap gap-4">
                                    {[
                                        { id: 1, label: 'Mon' },
                                        { id: 2, label: 'Tue' },
                                        { id: 3, label: 'Wed' },
                                        { id: 4, label: 'Thu' },
                                        { id: 5, label: 'Fri' },
                                        { id: 6, label: 'Sat' },
                                        { id: 0, label: 'Sun' },
                                    ].map(day => (
                                        <div key={day.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`day-${day.id}`}
                                                checked={operatingWeekdays.includes(day.id)}
                                                onCheckedChange={() => toggleWeekday(day.id)}
                                            />
                                            <label htmlFor={`day-${day.id}`} className="text-sm text-slate-600">{day.label}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-semibold text-slate-700">Excluded Dates (Comma separated YYYY-MM-DD)</label>
                                <Input
                                    placeholder="e.g. 2024-10-25, 2024-10-26"
                                    value={excludedDates}
                                    onChange={e => setExcludedDates(e.target.value)}
                                />
                                <p className="text-xs text-slate-500">Add inset days, bank holidays, and half-terms here.</p>
                            </div>
                        </div>
                    )}

                    {step === "preview" && previewData && (
                        <div className="space-y-4">
                            <div className="bg-blue-50 text-blue-800 p-4 rounded-md border border-blue-200">
                                <h3 className="font-bold mb-2">Preview Generation</h3>
                                <p><strong>Total Proposed Jobs:</strong> {previewData.totalProposed}</p>
                                <p><strong>Excluded / Non-operating:</strong> {previewData.skippedDates?.length || 0}</p>
                                <p><strong>Duplicates Avoided:</strong> {previewData.duplicateDates?.length || 0}</p>
                            </div>

                            {previewData.duplicateDates?.length > 0 && (
                                <div className="bg-yellow-50 text-yellow-800 p-4 rounded-md border border-yellow-200">
                                    <div className="flex items-start">
                                        <AlertTriangle className="w-5 h-5 mr-2 mt-0.5" />
                                        <div>
                                            <h4 className="font-bold">Duplicates Found</h4>
                                            <p className="text-sm mt-1">Jobs for these dates already exist and will be skipped.</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <p className="text-sm text-slate-600">Review the dates carefully before proceeding. Jobs will be created automatically.</p>
                        </div>
                    )}

                    {step === "result" && confirmData && (
                        <div className="space-y-4">
                            <div className="bg-emerald-50 text-emerald-800 p-4 rounded-md border border-emerald-200">
                                <h3 className="font-bold mb-2">Generation Complete</h3>
                                <p><strong>Total Created:</strong> {confirmData.totalCreated}</p>
                                <p><strong>Duplicates Skipped:</strong> {confirmData.duplicateDates?.length || 0}</p>
                                <p><strong>Failed:</strong> {confirmData.failedDates?.length || 0}</p>
                            </div>
                            <p className="text-sm text-slate-600">Jobs have been scheduled. Dispatchers can see them when they enable "Show School Jobs" on the relevant dates.</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="mt-4">
                    {step === "input" && (
                        <Button onClick={handlePreview} disabled={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">
                            {loading ? "Loading..." : "Preview Generation"}
                        </Button>
                    )}
                    {step === "preview" && (
                        <div className="flex gap-2 w-full">
                            <Button variant="outline" onClick={() => setStep("input")} className="w-1/3" disabled={loading}>
                                Back
                            </Button>
                            <Button onClick={handleConfirm} disabled={loading} className="w-2/3 bg-emerald-600 hover:bg-emerald-700">
                                {loading ? "Generating..." : `Confirm & Generate ${previewData?.totalProposed} Jobs`}
                            </Button>
                        </div>
                    )}
                    {step === "result" && (
                        <Button onClick={() => setOpen(false)} className="w-full">
                            Close
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
