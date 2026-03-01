'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import usePlacesAutocomplete, { getGeocode, getLatLng } from 'use-places-autocomplete';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function SettingsPage() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Form State
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    // Location State
    const [address, setAddress] = useState('');
    const [lat, setLat] = useState<number | null>(null);
    const [lng, setLng] = useState<number | null>(null);

    // Configuration State
    const [useZonePricing, setUseZonePricing] = useState(false);
    const [autoDispatch, setAutoDispatch] = useState(false);
    const [dispatchAlgorithm, setDispatchAlgorithm] = useState("CLOSEST");
    const [enableLiveTracking, setEnableLiveTracking] = useState(true);
    const [enableDynamicPricing, setEnableDynamicPricing] = useState(false);
    const [enableWaitCalculations, setEnableWaitCalculations] = useState(false);
    const [enableWebBooker, setEnableWebBooker] = useState(false);
    const [tenantSlug, setTenantSlug] = useState("");

    // SMS Templates State
    const [smsTemplateConfirmation, setSmsTemplateConfirmation] = useState('');
    const [smsTemplateDriverAssigned, setSmsTemplateDriverAssigned] = useState('');
    const [smsTemplateDriverArrived, setSmsTemplateDriverArrived] = useState('');

    // Initial Data
    const [slug, setSlug] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [user, setUser] = useState<any>(null);

    // Address Autocomplete Hook
    const {
        ready,
        value,
        suggestions: { status, data },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            componentRestrictions: { country: 'uk' },
        },
        debounce: 300,
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const res = await fetch('/api/settings/organization');
            const data = await res.json();

            if (res.ok) {
                setCompanyName(data.name || '');
                setEmail(data.email || '');
                setPhone(data.phone || '');
                setAddress(data.address || '');
                setLat(data.lat);
                setLng(data.lng);

                // Initialize autocomplete value
                setValue(data.address || '', false);

                setSlug(data.slug);
                setApiKey(data.apiKey);

                setUseZonePricing(data.useZonePricing ?? false);
                setAutoDispatch(data.autoDispatch ?? false);
                setDispatchAlgorithm(data.dispatchAlgorithm || "CLOSEST");
                setEnableLiveTracking(data.enableLiveTracking ?? true);
                setEnableDynamicPricing(data.enableDynamicPricing ?? false);
                setEnableWaitCalculations(data.enableWaitCalculations ?? false);
                setEnableWebBooker(data.enableWebBooker ?? false);
                setTenantSlug(data.slug || "");

                // Load templates
                setSmsTemplateConfirmation(data.smsTemplateConfirmation || '');
                setSmsTemplateDriverAssigned(data.smsTemplateDriverAssigned || '');
                setSmsTemplateDriverArrived(data.smsTemplateDriverArrived || '');
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
        }
    };

    const handleAddressSelect = async (description: string) => {
        setValue(description, false);
        setAddress(description);
        clearSuggestions();

        try {
            const results = await getGeocode({ address: description });
            const { lat, lng } = await getLatLng(results[0]);
            setLat(lat);
            setLng(lng);
            toast.success("Location coordinates updated");
        } catch (error) {
            console.error("Error: ", error);
            toast.error("Failed to get coordinates");
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/settings/organization', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: companyName,
                    email,
                    phone,
                    address, // Use state address, but ensure it matches selected if changed? 
                    // Actually use 'value' from autocomplete? 
                    // Let's use the explicit 'address' state which we set on select.
                    // If user types but doesn't select, we might have mismatch.
                    // Ideally we force selection or geocode on save. 
                    lat,
                    lng,
                    useZonePricing,
                    autoDispatch,
                    dispatchAlgorithm,
                    enableLiveTracking,
                    enableDynamicPricing,
                    enableWaitCalculations,
                    enableWebBooker,
                    smsTemplateConfirmation,
                    smsTemplateDriverAssigned,
                    smsTemplateDriverArrived
                })
            });

            if (res.ok) {
                toast.success("Organization settings updated");
            } else {
                toast.error("Failed to update settings");
            }
        } catch (error) {
            toast.error("Error saving settings");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-zinc-500">Loading settings...</div>;

    return (
        <div className="p-6 text-white max-w-4xl mx-auto overflow-y-auto h-full pb-20">
            <h1 className="text-3xl font-bold mb-8">Settings</h1>

            {/* Organization Section */}
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/10 mb-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        🏢 Organization Details
                    </h2>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <Label className="text-zinc-400">Company Name</Label>
                        <Input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="bg-black/50 border-white/10 mt-1"
                        />
                    </div>

                    <div>
                        <Label className="text-zinc-400">Email Address</Label>
                        <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-black/50 border-white/10 mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-zinc-400">Telephone Number</Label>
                        <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="bg-black/50 border-white/10 mt-1"
                        />
                    </div>

                    <div className="md:col-span-2 relative">
                        <Label className="text-zinc-400">Operating Address</Label>
                        <Input
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                setAddress(e.target.value); // Sync basic text
                            }}
                            disabled={!ready}
                            placeholder="Search for your office address..."
                            className="bg-black/50 border-white/10 mt-1"
                        />
                        {/* Autocomplete Suggestions */}
                        {status === "OK" && (
                            <ul className="absolute z-50 w-full bg-zinc-900 border border-white/10 rounded-md mt-1 shadow-xl max-h-60 overflow-auto">
                                {data.map(({ place_id, description }) => (
                                    <li
                                        key={place_id}
                                        onClick={() => handleAddressSelect(description)}
                                        className="px-4 py-2 hover:bg-white/5 cursor-pointer text-sm text-zinc-300"
                                    >
                                        {description}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="text-xs text-zinc-500 mt-2">
                            This address will be used to center the Dispatch Map.
                            {lat && lng && <span className="text-emerald-500 ml-2">✓ Coordinates Found</span>}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">Company Slug</label>
                        <div className="font-mono text-sm bg-black/50 px-3 py-2 rounded border border-white/5 inline-block text-zinc-500 w-full cursor-not-allowed">
                            {slug}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-zinc-400 mb-1">API Key</label>
                        <div className="font-mono text-sm bg-black/50 px-3 py-2 rounded border border-white/5 flex items-center justify-between group text-zinc-500 cursor-not-allowed">
                            <span className="truncate">{apiKey}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Dispatch & Routing Section */}
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/10 mb-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 text-emerald-400">
                    🛣️ Advanced Dispatch & Routing
                </h2>
                <div className="space-y-6">
                    <p className="text-sm text-zinc-400">
                        By default, the system uses <strong className="text-white">Manual Dispatching</strong> where operators assign jobs to drivers. You can opt-in to our advanced Auto-Dispatch engine to automate this based on selected algorithms.
                    </p>

                    <div className="flex items-center space-x-3 bg-black/30 p-4 rounded-lg border border-white/5">
                        <Checkbox
                            id="autoDispatch"
                            checked={autoDispatch}
                            onCheckedChange={(checked) => setAutoDispatch(checked === true)}
                            className="border-emerald-500/50 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="autoDispatch"
                                className="text-sm font-medium leading-none cursor-pointer text-white"
                            >
                                Enable Auto-Dispatch Engine
                            </label>
                            <p className="text-sm text-zinc-500">
                                Automatically assign pending jobs to available drivers without human intervention.
                            </p>
                        </div>
                    </div>

                    {autoDispatch && (
                        <div className="bg-black/30 p-4 rounded-lg border border-white/5 space-y-4 animate-in fade-in slide-in-from-top-1">
                            <div>
                                <Label className="text-zinc-300">Dispatch Algorithm</Label>
                                <p className="text-xs text-zinc-500 mb-3">
                                    Select the logic the engine will use to decide which driver gets the job.
                                </p>
                                <Select value={dispatchAlgorithm} onValueChange={setDispatchAlgorithm}>
                                    <SelectTrigger className="w-full bg-black/50 border-white/10 text-white">
                                        <SelectValue placeholder="Select Algorithm" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-zinc-900 border-white/10 text-white">
                                        <SelectItem value="CLOSEST">
                                            <span className="font-medium">Closest Driver (GPS Distance)</span>
                                            <p className="text-xs text-zinc-400 mt-1">Assigns to the nearest driver by direct line-of-sight.</p>
                                        </SelectItem>
                                        <SelectItem value="LONGEST_WAITING">
                                            <span className="font-medium">Zone Queueing (Longest Waiting)</span>
                                            <p className="text-xs text-zinc-400 mt-1">First-In-First-Out within geographical zones. Falls back to Closest if queue is empty.</p>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Complex Fares & Pricing Section */}
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/10 mb-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 text-purple-400">
                    💳 Complex Fares & Pricing
                </h2>
                <div className="space-y-6">
                    <p className="text-sm text-zinc-400">
                        Configure advanced billing features like surge multipliers and automated penalty fees. Leave these disabled for standard fixed or mileage-based pricing.
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center space-x-3 bg-black/30 p-4 rounded-lg border border-white/5">
                            <Checkbox
                                id="enableDynamicPricing"
                                checked={enableDynamicPricing}
                                onCheckedChange={(checked) => setEnableDynamicPricing(checked === true)}
                                className="border-purple-500/50 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="enableDynamicPricing"
                                    className="text-sm font-medium leading-none cursor-pointer text-white"
                                >
                                    Enable Dynamic Pricing (Surge)
                                </label>
                                <p className="text-sm text-zinc-500">
                                    Automatically apply percentage or flat multipliers to fares based on active Surcharge rules (Time of day, Day of week, etc).
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 bg-black/30 p-4 rounded-lg border border-white/5">
                            <Checkbox
                                id="enableWaitCalculations"
                                checked={enableWaitCalculations}
                                onCheckedChange={(checked) => setEnableWaitCalculations(checked === true)}
                                className="border-purple-500/50 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="enableWaitCalculations"
                                    className="text-sm font-medium leading-none cursor-pointer text-white"
                                >
                                    Automate Wait Time Calculations
                                </label>
                                <p className="text-sm text-zinc-500">
                                    Include driver wait times into the quoted price based on the selected vehicle tier&#39;s waiting rate.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Web Integration / Booker */}
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/10 mb-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 text-blue-400">
                    🌍 Web Integration
                </h2>
                <div className="space-y-6">
                    <p className="text-sm text-zinc-400">
                        Allow customers to book directly from your own website using our standalone secure booking form.
                    </p>

                    <div className="flex items-center space-x-3 bg-black/30 p-4 rounded-lg border border-white/5">
                        <Checkbox
                            id="enableWebBooker"
                            checked={enableWebBooker}
                            onCheckedChange={(checked) => setEnableWebBooker(checked === true)}
                            className="border-blue-500/50 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="enableWebBooker"
                                className="text-sm font-medium leading-none cursor-pointer text-white"
                            >
                                Enable Standalone Web Booker
                            </label>
                            <p className="text-sm text-zinc-500">
                                Unlocks the public `/booker` route for your tenant account.
                            </p>
                        </div>
                    </div>

                    {enableWebBooker && tenantSlug && (
                        <div className="mt-4 bg-zinc-950 p-4 rounded-lg border border-white/10 relative">
                            <Label className="text-zinc-400 mb-2 block">Iframe Embed Code</Label>
                            <p className="text-xs text-zinc-500 mb-3">
                                Copy and paste this code into a "Custom HTML" block on your website (e.g., WordPress, Wix, Squarespace) to embed the booking form.
                            </p>
                            <div className="relative group">
                                <textarea
                                    readOnly
                                    value={`<iframe src="${window.location.origin}/booker/${tenantSlug}" width="100%" height="700px" style="border:none; border-radius:12px; overflow:hidden;" title="Book a Taxi"></iframe>`}
                                    className="w-full h-24 bg-black border border-white/10 text-green-400 font-mono text-sm p-3 rounded resize-none"
                                />
                                <Button
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 h-8"
                                    onClick={() => {
                                        navigator.clipboard.writeText(`<iframe src="${window.location.origin}/booker/${tenantSlug}" width="100%" height="700px" style="border:none; border-radius:12px; overflow:hidden;" title="Book a Taxi"></iframe>`);
                                        toast.success("Embed code copied!");
                                    }}
                                >
                                    Copy Code
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Communication Templates */}
            <div className="bg-zinc-900/50 p-6 rounded-xl border border-white/10 mb-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
                    💬 Communication Templates
                </h2>
                <div className="space-y-6">
                    <p className="text-sm text-zinc-400 mb-4">
                        Variables available: {'{booking_id}, {pickup_time}, {pickup_address}, {dropoff_address}, {driver_name}, {driver_phone}, {vehicle_details}'}
                    </p>

                    <div>
                        <Label className="text-zinc-400">Booking Confirmation SMS</Label>
                        <Textarea
                            value={smsTemplateConfirmation}
                            onChange={(e) => setSmsTemplateConfirmation(e.target.value)}
                            placeholder="Company: Booking #{booking_id} Confirmed.\nPickup: {pickup_time}\nFrom: {pickup_address}"
                            className="bg-black/50 border-white/10 mt-1"
                        />
                    </div>

                    <div>
                        <Label className="text-zinc-400">Driver Assigned SMS</Label>
                        <Textarea
                            value={smsTemplateDriverAssigned}
                            onChange={(e) => setSmsTemplateDriverAssigned(e.target.value)}
                            placeholder="Company: Driver Assigned.\n{driver_name} is on the way in {vehicle_details}.\nCall: {driver_phone}"
                            className="bg-black/50 border-white/10 mt-1"
                        />
                    </div>

                    <div>
                        <Label className="text-zinc-400">Driver Arrived SMS</Label>
                        <Textarea
                            value={smsTemplateDriverArrived}
                            onChange={(e) => setSmsTemplateDriverArrived(e.target.value)}
                            placeholder="Company: Driver Arrived.\n{driver_name} is waiting outside in {vehicle_details}.\nCall: {driver_phone}"
                            className="bg-black/50 border-white/10 mt-1"
                        />
                    </div>
                    <p className="text-xs text-zinc-500 mt-2">
                        Leave blank to use the default system messages.
                    </p>
                </div>
            </div>


            {/* Read Only Info */}
            <div className="bg-zinc-900/30 p-6 rounded-xl border border-white/5">
                <p className="text-sm text-zinc-500 text-center">
                    System Version 1.0.0 | Dispatch SaaS
                </p>
            </div>
        </div >
    );
}
