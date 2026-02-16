
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { PricingRule } from "@/lib/types";
import { toast } from "sonner";

export default function TariffsTab() {
    const [loading, setLoading] = useState(false);
    const [vehicleType, setVehicleType] = useState("Saloon");

    // Default values if no rule exists
    const [data, setData] = useState({
        baseRate: 3.00,
        perMile: 2.00,
        minFare: 5.00,
        waitingFreq: 0.25 // Default 25p/min
    });

    const [rules, setRules] = useState<PricingRule[]>([]);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/pricing/rules");
            if (res.ok) {
                const fetchedRules = await res.json();
                setRules(fetchedRules);
                updateFormFromRules(fetchedRules, vehicleType);
            }
        } catch (error) {
            console.error("Failed to fetch rules", error);
            toast.error("Failed to load tariffs");
        } finally {
            setLoading(false);
        }
    };

    const updateFormFromRules = (currentRules: PricingRule[], type: string) => {
        const rule = currentRules.find((r: any) => r.vehicleType === type);
        if (rule) {
            setData({
                baseRate: rule.baseRate,
                perMile: rule.perMile,
                minFare: rule.minFare,
                waitingFreq: rule.waitingFreq || 0.00
            });
        } else {
            // Defaults
            setData({ baseRate: 3.00, perMile: 2.00, minFare: 5.00, waitingFreq: 0.25 });
        }
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const handleTypeChange = (val: string) => {
        setVehicleType(val);
        updateFormFromRules(rules, val);
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            const payload = {
                vehicleType,
                ...data
            };
            const res = await fetch("/api/pricing/rules", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                toast.success(`${vehicleType} tariff updated`);
                fetchRules(); // Refresh list
            } else {
                toast.error("Failed to save tariff");
            }
        } catch (error) {
            console.error("Error saving rule", error);
            toast.error("Error saving tariff");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="mt-4 bg-zinc-900 border-white/10">
            <CardContent className="pt-6">
                <div className="grid gap-6 max-w-xl">
                    <div className="space-y-2">
                        <Label className="text-zinc-400">Vehicle Type</Label>
                        <Select value={vehicleType} onValueChange={handleTypeChange}>
                            <SelectTrigger className="bg-zinc-950 border-white/10 text-white">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                <SelectItem value="Saloon">Saloon</SelectItem>
                                <SelectItem value="Estate">Estate</SelectItem>
                                <SelectItem value="Executive">Executive</SelectItem>
                                <SelectItem value="MPV">MPV</SelectItem>
                                <SelectItem value="MPV+">MPV+</SelectItem>
                                <SelectItem value="Minibus">Minibus</SelectItem>
                                <SelectItem value="Coach">Coach</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-zinc-500">Configure rates for this specific vehicle type.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-zinc-400">Base Rate (Flag Fall) (£)</Label>
                            <Input
                                type="number"
                                step="0.10"
                                className="bg-zinc-950 border-white/10 text-white placeholder:text-zinc-600"
                                value={data.baseRate}
                                onChange={e => setData({ ...data, baseRate: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-400">Rate Per Mile (£)</Label>
                            <Input
                                type="number"
                                step="0.10"
                                className="bg-zinc-950 border-white/10 text-white placeholder:text-zinc-600"
                                value={data.perMile}
                                onChange={e => setData({ ...data, perMile: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-zinc-400">Minimum Fare (£)</Label>
                        <Input
                            type="number"
                            step="0.50"
                            className="bg-zinc-950 border-white/10 text-white placeholder:text-zinc-600"
                            value={data.minFare}
                            onChange={e => setData({ ...data, minFare: parseFloat(e.target.value) })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label className="text-zinc-400">Waiting Time Rate (£ per min)</Label>
                        <Input
                            type="number"
                            step="0.10"
                            className="bg-zinc-950 border-white/10 text-white placeholder:text-zinc-600"
                            value={data.waitingFreq || 0}
                            onChange={e => setData({ ...data, waitingFreq: parseFloat(e.target.value) })}
                        />
                    </div>

                    <Button onClick={handleSave} disabled={loading} className="bg-amber-500 text-black hover:bg-amber-600">
                        {loading ? 'Saving...' : 'Save Tariff Settings'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
