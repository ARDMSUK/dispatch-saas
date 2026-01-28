
"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TariffsTab() {
    const [loading, setLoading] = useState(false);
    const [vehicleType, setVehicleType] = useState("Saloon");

    // Default values if no rule exists
    const [data, setData] = useState({
        baseRate: 3.00,
        perMile: 2.00,
        minFare: 5.00
    });

    const [rules, setRules] = useState<any[]>([]);

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
        } finally {
            setLoading(false);
        }
    };

    const updateFormFromRules = (currentRules: any[], type: string) => {
        const rule = currentRules.find((r: any) => r.vehicleType === type);
        if (rule) {
            setData({
                baseRate: rule.baseRate,
                perMile: rule.perMile,
                minFare: rule.minFare
            });
        } else {
            // Defaults
            setData({ baseRate: 3.00, perMile: 2.00, minFare: 5.00 });
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
                alert("Tariff updated successfully!");
                fetchRules(); // Refresh list
            } else {
                alert("Failed to save tariff");
            }
        } catch (error) {
            console.error("Error saving rule", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card className="mt-4">
            <CardContent className="pt-6">
                <div className="grid gap-6 max-w-xl">
                    <div className="space-y-2">
                        <Label>Vehicle Type</Label>
                        <Select value={vehicleType} onValueChange={handleTypeChange}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Saloon">Saloon (Standard)</SelectItem>
                                <SelectItem value="Estate">Estate</SelectItem>
                                <SelectItem value="MPV">MPV (6 Seater)</SelectItem>
                                <SelectItem value="Exec">Executive</SelectItem>
                                <SelectItem value="Van">Van / Transporter</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-zinc-500">Configure rates for this specific vehicle type.</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Base Rate (Flag Fall) (£)</Label>
                            <Input
                                type="number"
                                step="0.10"
                                value={data.baseRate}
                                onChange={e => setData({ ...data, baseRate: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Rate Per Mile (£)</Label>
                            <Input
                                type="number"
                                step="0.10"
                                value={data.perMile}
                                onChange={e => setData({ ...data, perMile: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Minimum Fare (£)</Label>
                        <Input
                            type="number"
                            step="0.50"
                            value={data.minFare}
                            onChange={e => setData({ ...data, minFare: parseFloat(e.target.value) })}
                        />
                    </div>

                    <Button onClick={handleSave} disabled={loading} className="bg-zinc-800 hover:bg-zinc-700">
                        {loading ? 'Saving...' : 'Save Tariff Settings'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
