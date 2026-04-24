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
    const [hasWebChatAi, setHasWebChatAi] = useState(false);
    const [hasWhatsAppAi, setHasWhatsAppAi] = useState(false);
    const [aiMessageCount, setAiMessageCount] = useState(0);
    const [aiMessageLimit, setAiMessageLimit] = useState(100);
    const [twilioFromNumber, setTwilioFromNumber] = useState("");
    const [consoleLayout, setConsoleLayout] = useState("MODERN");

    // SMS Templates State
    const [smsTemplateConfirmation, setSmsTemplateConfirmation] = useState('');
    const [smsTemplateDriverAssigned, setSmsTemplateDriverAssigned] = useState('');
    const [smsTemplateDriverArrived, setSmsTemplateDriverArrived] = useState('');

    // Branding State
    const [logoUrl, setLogoUrl] = useState('');
    const [brandColor, setBrandColor] = useState('#f59e0b');

    // Integrations State
    const [stripePublishableKey, setStripePublishableKey] = useState('');
    const [stripeSecretKey, setStripeSecretKey] = useState('');
    const [paymentRouting, setPaymentRouting] = useState('CENTRAL');

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
                setHasWebChatAi(data.hasWebChatAi ?? false);
                setHasWhatsAppAi(data.hasWhatsAppAi ?? false);
                setAiMessageCount(data.aiMessageCount ?? 0);
                setAiMessageLimit(data.aiMessageLimit ?? 100);
                setTwilioFromNumber(data.twilioFromNumber || "");
                setConsoleLayout(data.consoleLayout || "MODERN");

                // Load templates
                setSmsTemplateConfirmation(data.smsTemplateConfirmation || '');
                setSmsTemplateDriverAssigned(data.smsTemplateDriverAssigned || '');
                setSmsTemplateDriverArrived(data.smsTemplateDriverArrived || '');

                // Load Branding
                setLogoUrl(data.logoUrl || '');
                setBrandColor(data.brandColor || '#f59e0b');

                // Load Integrations
                setStripePublishableKey(data.stripePublishableKey || '');
                setStripeSecretKey(data.stripeSecretKey || '');
                setPaymentRouting(data.paymentRouting || 'CENTRAL');
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
                    logoUrl,
                    brandColor,
                    consoleLayout,
                    smsTemplateConfirmation,
                    smsTemplateDriverAssigned,
                    smsTemplateDriverArrived,
                    twilioFromNumber,
                    stripePublishableKey,
                    stripeSecretKey,
                    paymentRouting
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

    if (loading) return <div className="p-8 text-slate-400">Loading settings...</div>;

    return (
        <div className="p-6 text-slate-900 max-w-4xl mx-auto overflow-y-auto h-full pb-20">
            <h1 className="text-3xl font-bold mb-8">Settings</h1>

            {/* Organization Section */}
            <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 mb-6 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        🏢 Organization Details
                    </h2>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-emerald-600 hover:bg-emerald-700 text-slate-900"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2">
                        <Label className="text-slate-500">Company Name</Label>
                        <Input
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            className="bg-slate-100 border-slate-200 mt-1"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-500">Email Address</Label>
                        <Input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-slate-100 border-slate-200 mt-1"
                        />
                    </div>
                    <div>
                        <Label className="text-slate-500">Telephone Number</Label>
                        <Input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="bg-slate-100 border-slate-200 mt-1"
                        />
                    </div>

                    <div className="md:col-span-2 relative">
                        <Label className="text-slate-500">Operating Address</Label>
                        <Input
                            value={value}
                            onChange={(e) => {
                                setValue(e.target.value);
                                setAddress(e.target.value); // Sync basic text
                            }}
                            disabled={!ready}
                            placeholder="Search for your office address..."
                            className="bg-slate-100 border-slate-200 mt-1"
                        />
                        {/* Autocomplete Suggestions */}
                        {status === "OK" && (
                            <ul className="absolute z-50 w-full bg-slate-100 border border-slate-200 rounded-md mt-1 shadow-xl max-h-60 overflow-auto">
                                {data.map(({ place_id, description }) => (
                                    <li
                                        key={place_id}
                                        onClick={() => handleAddressSelect(description)}
                                        className="px-4 py-2 hover:bg-slate-200 cursor-pointer text-sm text-slate-600"
                                    >
                                        {description}
                                    </li>
                                ))}
                            </ul>
                        )}
                        <p className="text-xs text-slate-400 mt-2">
                            This address will be used to center the Dispatch Map.
                            {lat && lng && <span className="text-emerald-500 ml-2">✓ Coordinates Found</span>}
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">Company Slug</label>
                        <div className="font-mono text-sm bg-slate-100 px-3 py-2 rounded border border-slate-200 inline-block text-slate-400 w-full cursor-not-allowed">
                            {slug}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-500 mb-1">API Key</label>
                        <div className="font-mono text-sm bg-slate-100 px-3 py-2 rounded border border-slate-200 flex items-center justify-between group text-slate-400 cursor-not-allowed">
                            <span className="truncate">{apiKey}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Advanced Dispatch & Routing Section */}
            <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 mb-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 text-emerald-600">
                    🛣️ Advanced Dispatch & Routing
                </h2>
                <div className="space-y-6">
                    <p className="text-sm text-slate-500">
                        By default, the system uses <strong className="text-slate-900">Manual Dispatching</strong> where operators assign jobs to drivers. You can opt-in to our advanced Auto-Dispatch engine to automate this based on selected algorithms.
                    </p>

                    <div className="flex items-center space-x-3 bg-slate-100 p-4 rounded-lg border border-slate-200">
                        <Checkbox
                            id="autoDispatch"
                            checked={autoDispatch}
                            onCheckedChange={(checked) => setAutoDispatch(checked === true)}
                            className="border-emerald-500/50 data-[state=checked]:bg-emerald-600 data-[state=checked]:text-white"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="autoDispatch"
                                className="text-sm font-medium leading-none cursor-pointer text-slate-900"
                            >
                                Enable Auto-Dispatch Engine
                            </label>
                            <p className="text-sm text-slate-400">
                                Automatically assign pending jobs to available drivers without human intervention.
                            </p>
                        </div>
                    </div>

                    {autoDispatch && (
                        <div className="bg-slate-100 p-4 rounded-lg border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-1">
                            <div>
                                <Label className="text-slate-600">Dispatch Algorithm</Label>
                                <p className="text-xs text-slate-400 mb-3">
                                    Select the logic the engine will use to decide which driver gets the job.
                                </p>
                                <Select value={dispatchAlgorithm} onValueChange={setDispatchAlgorithm}>
                                    <SelectTrigger className="w-full bg-slate-100 border-slate-200 text-slate-900">
                                        <SelectValue placeholder="Select Algorithm" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-100 border-slate-200 text-slate-900">
                                        <SelectItem value="CLOSEST">
                                            <span className="font-medium">Closest Driver (GPS Distance)</span>
                                            <p className="text-xs text-slate-500 mt-1">Assigns to the nearest driver by direct line-of-sight.</p>
                                        </SelectItem>
                                        <SelectItem value="LONGEST_WAITING">
                                            <span className="font-medium">Zone Queueing (Longest Waiting)</span>
                                            <p className="text-xs text-slate-500 mt-1">First-In-First-Out within geographical zones. Falls back to Closest if queue is empty.</p>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Complex Fares & Pricing Section */}
            <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 mb-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 text-purple-400">
                    💳 Complex Fares & Pricing
                </h2>
                <div className="space-y-6">
                    <p className="text-sm text-slate-500">
                        Configure advanced billing features like surge multipliers and automated penalty fees. Leave these disabled for standard fixed or mileage-based pricing.
                    </p>

                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex items-center space-x-3 bg-slate-100 p-4 rounded-lg border border-slate-200">
                            <Checkbox
                                id="enableDynamicPricing"
                                checked={enableDynamicPricing}
                                onCheckedChange={(checked) => setEnableDynamicPricing(checked === true)}
                                className="border-purple-500/50 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="enableDynamicPricing"
                                    className="text-sm font-medium leading-none cursor-pointer text-slate-900"
                                >
                                    Enable Dynamic Pricing (Surge)
                                </label>
                                <p className="text-sm text-slate-400">
                                    Automatically apply percentage or flat multipliers to fares based on active Surcharge rules (Time of day, Day of week, etc).
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-3 bg-slate-100 p-4 rounded-lg border border-slate-200">
                            <Checkbox
                                id="enableWaitCalculations"
                                checked={enableWaitCalculations}
                                onCheckedChange={(checked) => setEnableWaitCalculations(checked === true)}
                                className="border-purple-500/50 data-[state=checked]:bg-purple-600 data-[state=checked]:text-white"
                            />
                            <div className="grid gap-1.5 leading-none">
                                <label
                                    htmlFor="enableWaitCalculations"
                                    className="text-sm font-medium leading-none cursor-pointer text-slate-900"
                                >
                                    Automate Wait Time Calculations
                                </label>
                                <p className="text-sm text-slate-400">
                                    Include driver wait times into the quoted price based on the selected vehicle tier&#39;s waiting rate.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Web Integration / Booker */}
            <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 mb-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 text-blue-600">
                    🌍 Web Integration
                </h2>
                <div className="space-y-6">
                    <p className="text-sm text-slate-500">
                        Allow customers to book directly from your own website using our standalone secure booking form.
                    </p>

                    <div className="flex items-center space-x-3 bg-slate-100 p-4 rounded-lg border border-slate-200">
                        <Checkbox
                            id="enableWebBooker"
                            checked={enableWebBooker}
                            onCheckedChange={(checked) => setEnableWebBooker(checked === true)}
                            className="border-blue-500/50 data-[state=checked]:bg-blue-600 data-[state=checked]:text-white"
                        />
                        <div className="grid gap-1.5 leading-none">
                            <label
                                htmlFor="enableWebBooker"
                                className="text-sm font-medium leading-none cursor-pointer text-slate-900"
                            >
                                Enable Standalone Web Booker
                            </label>
                            <p className="text-sm text-slate-400">
                                Unlocks the public `/booker` route for your tenant account.
                            </p>
                        </div>
                    </div>

                    {enableWebBooker && tenantSlug && (
                        <div className="mt-4 bg-white p-4 rounded-lg border border-slate-200 relative">
                            <Label className="text-slate-500 mb-2 block">Iframe Embed Code</Label>
                            <p className="text-xs text-slate-400 mb-3">
                                Copy and paste this code into a "Custom HTML" block on your website (e.g., WordPress, Wix, Squarespace) to embed the booking form.
                            </p>
                            <div className="relative group">
                                <textarea
                                    readOnly
                                    value={`<iframe src="${window.location.origin}/booker/${tenantSlug}" width="100%" height="700px" style="border:none; border-radius:12px; overflow:hidden;" title="Book a Taxi"></iframe>`}
                                    className="w-full h-24 bg-slate-50 border border-slate-200 text-green-400 font-mono text-sm p-3 rounded resize-none"
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

            {/* AI Integrations */}
            {(hasWebChatAi || hasWhatsAppAi) && (
                <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 mb-6 backdrop-blur-sm">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <h2 className="text-xl font-semibold flex items-center gap-2 text-indigo-600">
                            🤖 AI Integrations
                        </h2>
                        {typeof aiMessageCount === 'number' && typeof aiMessageLimit === 'number' && (
                            <div className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 flex items-center gap-2">
                                <span>Monthly Usage:</span>
                                <div>
                                    <span className={aiMessageCount >= aiMessageLimit ? "text-rose-600" : "text-emerald-600"}>
                                        {aiMessageCount}
                                    </span>
                                    <span className="text-slate-400 mx-1">/</span>
                                    <span className="text-slate-500">{aiMessageLimit}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {hasWebChatAi && (
                        <div className="mb-8 border-b border-slate-200 pb-8">
                            <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center gap-2">🌐 Web Chat Widget</h3>
                            <div className="space-y-6">
                                <p className="text-sm text-slate-500">
                                    Embed our interactive AI Booking Agent directly onto your website. It can answer customer questions, provide quotes, and take modern bookings 24/7.
                                </p>

                                <div className="mt-4 bg-white p-4 rounded-lg border border-slate-200 relative">
                                    <Label className="text-slate-500 mb-2 block">Iframe Embed Code</Label>
                                    <Label className="text-slate-500 mb-2 block">Script Embed Code</Label>
                                    <p className="text-xs text-slate-400 mb-3">
                                        Copy and paste this code near the bottom of your website's &lt;body&gt; tag.
                                    </p>
                                    <div className="relative group">
                                        <Input
                                            readOnly
                                            className="font-mono text-xs bg-slate-50 border-slate-200 text-slate-800 break-all h-24"
                                            value={`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-api-key="${apiKey}" data-color="${brandColor || '#1d4ed8'}"></script>`}
                                        />
                                        <Button
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 hover:bg-indigo-700 h-8 text-slate-900 font-medium"
                                            onClick={() => {
                                                if (typeof window !== 'undefined') {
                                                    navigator.clipboard.writeText(`<script src="${window.location.origin}/widget.js" data-api-key="${apiKey}" data-color="${brandColor || '#1d4ed8'}"></script>`);
                                                    toast.success("Embed script copied!");
                                                }
                                            }}
                                        >
                                            Copy Code
                                        </Button>
                                    </div>
                                    <p className="text-xs text-rose-500 mt-2 font-medium">
                                        Important: This snippet includes your secret API Key. Do not share it unnecessarily, though it's required for the web client to function.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {hasWhatsAppAi && (
                        <div>
                            <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center gap-2">📱 WhatsApp AI Agent</h3>
                            <div className="space-y-4">
                                <p className="text-sm text-slate-500">
                                    Your WhatsApp Business number is connected and managed by our platform. Customers who message this number will talk directly to the AI to book rides.
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                                        <Label className="text-slate-500 block mb-2">Connected WhatsApp Number</Label>
                                        <Input
                                            value={twilioFromNumber}
                                            onChange={(e) => setTwilioFromNumber(e.target.value)}
                                            placeholder="e.g. +447... or +14155238886"
                                            className="bg-slate-100 border-slate-200 font-mono text-emerald-600"
                                        />
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-slate-200">
                                        <Label className="text-slate-500 block mb-2">Twilio Webhook URL</Label>
                                        <div className="relative group">
                                            <input
                                                readOnly
                                                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/twilio/whatsapp`}
                                                className="w-full bg-slate-50 border border-slate-200 text-indigo-600 font-mono text-xs p-2 rounded truncate pr-20"
                                            />
                                            <Button
                                                className="absolute top-1 right-1 h-6 text-xs bg-slate-200 hover:bg-zinc-700 text-slate-900"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${window.location.origin}/api/twilio/whatsapp`);
                                                    toast.success("Webhook URL copied");
                                                }}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 leading-tight">
                                            Set this as the incoming message Webhook in your Twilio Console.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Visual Branding */}
            <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 mb-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 text-pink-400">
                    ✨ Visual Branding
                </h2>
                <div className="space-y-6">
                    <p className="text-sm text-slate-500">
                        Customize how your company appears to your customers on the Web Booker and inside HTML email receipts.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label className="text-slate-500">Public Logo URL</Label>
                            <Input
                                value={logoUrl}
                                onChange={(e) => setLogoUrl(e.target.value)}
                                placeholder="https://yourwebsite.com/logo.png"
                                className="bg-slate-100 border-slate-200 mt-1"
                            />
                            <p className="text-xs text-slate-400 mt-2">
                                Provide a direct link to your company logo (PNG or SVG recommended).
                            </p>
                        </div>
                        <div>
                            <Label className="text-slate-500">Primary Brand Color</Label>
                            <div className="flex items-center gap-3 mt-1">
                                <Input
                                    type="color"
                                    value={brandColor}
                                    onChange={(e) => setBrandColor(e.target.value)}
                                    className="w-12 h-10 p-1 bg-slate-100 border-slate-200 cursor-pointer"
                                />
                                <Input
                                    type="text"
                                    value={brandColor}
                                    onChange={(e) => setBrandColor(e.target.value)}
                                    className="bg-slate-100 border-slate-200 font-mono uppercase"
                                    placeholder="#F59E0B"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 p-6 border border-slate-200 rounded-lg bg-white">
                        <Label className="text-slate-400 mb-4 block">Live Preview</Label>
                        <div className="flex items-center justify-between p-4 bg-white rounded-md max-w-sm">
                            {logoUrl ? (
                                <img src={logoUrl} alt="Company Logo" className="h-8 object-contain" />
                            ) : (
                                <span className="font-bold text-black text-lg">{companyName || "Your Company"}</span>
                            )}
                            <div
                                className="px-4 py-2 rounded text-slate-900 text-sm font-medium"
                                style={{ backgroundColor: brandColor }}
                            >
                                Book Now
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Workspace Preferences */}
            <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 mb-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 text-teal-600">
                    🖥️ Workspace Preferences
                </h2>
                <div className="space-y-6">
                    <p className="text-sm text-slate-500">
                        Customize the layout and default behaviors of the Dispatch Dashboard.
                    </p>

                    <div>
                        <Label className="text-slate-600">Booking Console Layout</Label>
                        <p className="text-xs text-slate-400 mb-3">
                            Choose between the Modern card-based layout or the Classic high-density columnar layout.
                        </p>
                        <Select value={consoleLayout} onValueChange={setConsoleLayout}>
                            <SelectTrigger className="w-full md:w-1/2 bg-white border-slate-200 text-slate-900">
                                <SelectValue placeholder="Select Layout" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-slate-200 text-slate-900">
                                <SelectItem value="MODERN">
                                    <span className="font-medium text-emerald-600">Modern Layout (Default)</span>
                                    <p className="text-xs text-slate-500 mt-1">Clean, large cards with comprehensive details and dedicated sidebars.</p>
                                </SelectItem>
                                <SelectItem value="CLASSIC">
                                    <span className="font-medium text-blue-600">Classic Layout (Dense)</span>
                                    <p className="text-xs text-slate-500 mt-1">iCabbi-style horizontal split with high-density columnar job strips.</p>
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {/* Payment Integrations */}
            <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 mb-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 text-indigo-500">
                    💳 Payment Integrations
                </h2>
                <div className="space-y-6">
                    <p className="text-sm text-slate-500">
                        Connect your Stripe account to process in-app payments from the Customer App and Web Booker.
                        For in-car terminal payments, connect your SumUp or Zettle account.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <Label className="text-slate-500">Stripe Publishable Key</Label>
                            <Input
                                value={stripePublishableKey}
                                onChange={(e) => setStripePublishableKey(e.target.value)}
                                placeholder="pk_live_..."
                                className="bg-slate-100 border-slate-200 mt-1 font-mono text-sm"
                            />
                            <p className="text-xs text-slate-400 mt-2">
                                Used safely by the frontend to initiate payments.
                            </p>
                        </div>
                        <div>
                            <Label className="text-slate-500">Stripe Secret Key</Label>
                            <Input
                                type="password"
                                value={stripeSecretKey}
                                onChange={(e) => setStripeSecretKey(e.target.value)}
                                placeholder="sk_live_..."
                                className="bg-slate-100 border-slate-200 mt-1 font-mono text-sm"
                            />
                            <p className="text-xs text-slate-400 mt-2">
                                Used by our backend to process charges securely. Will be encrypted.
                            </p>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 pt-6 mt-6">
                        <h3 className="text-lg font-medium text-slate-900 mb-4 flex items-center gap-2">📱 In-Car Terminals</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-between gap-2">
                                <div>
                                    <Label className="text-slate-900 font-bold block mb-1">SumUp</Label>
                                    <p className="text-xs text-slate-500">Process payments using your SumUp Air card reader via the driver app.</p>
                                </div>
                                <Button 
                                    onClick={() => window.location.href = '/api/integrations/sumup/connect'}
                                    className="bg-blue-600 hover:bg-blue-700 mt-2 w-full"
                                    disabled={paymentRouting === 'DRIVER'}
                                >
                                    Connect SumUp
                                </Button>
                            </div>
                            <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col justify-between gap-2">
                                <div>
                                    <Label className="text-slate-900 font-bold block mb-1">Zettle</Label>
                                    <p className="text-xs text-slate-500">Process payments using your Zettle card reader via the driver app.</p>
                                </div>
                                <Button 
                                    onClick={() => window.location.href = '/api/integrations/zettle/connect'}
                                    className="bg-[#00c8a5] hover:bg-[#009c82] mt-2 text-white w-full"
                                    disabled={paymentRouting === 'DRIVER'}
                                >
                                    Connect Zettle
                                </Button>
                            </div>
                        </div>

                        <div className="mt-6 bg-slate-100 p-4 rounded-lg border border-slate-200">
                            <Label className="text-slate-600 font-medium">Payment Routing Configuration</Label>
                            <p className="text-xs text-slate-400 mb-3">
                                Decide whose accounts are used for in-car terminal payments and remote payment links.
                            </p>
                            <Select value={paymentRouting} onValueChange={setPaymentRouting}>
                                <SelectTrigger className="w-full bg-white border-slate-200 text-slate-900">
                                    <SelectValue placeholder="Select Routing Method" />
                                </SelectTrigger>
                                <SelectContent className="bg-white border-slate-200 text-slate-900">
                                    <SelectItem value="CENTRAL">
                                        <span className="font-medium">Central Account (Company)</span>
                                        <p className="text-xs text-slate-500 mt-1">Payments are processed through the company's central SumUp/Zettle accounts.</p>
                                    </SelectItem>
                                    <SelectItem value="DRIVER">
                                        <span className="font-medium">Driver Accounts (Individual)</span>
                                        <p className="text-xs text-slate-500 mt-1">Drivers will connect their own accounts in the Driver App to process payments directly.</p>
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Developer API */}
            <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 mb-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-6 text-emerald-600">
                    💻 Developer API
                </h2>
                <div className="space-y-6">
                    <p className="text-sm text-slate-500">
                        Use this secured token to build custom integrations (e.g., Zapier, Custom Apps) by sending HTTP requests directly to the `{window.location.host}/api/v1/bookings` ingestion endpoints.
                    </p>

                    <div>
                        <Label className="text-slate-500">Secret API Key</Label>
                        <div className="flex items-center gap-3 mt-1">
                            <Input
                                value={apiKey || '••••••••••••••••••••••••••••••••'}
                                readOnly
                                className="bg-slate-100 border-slate-200 font-mono text-slate-600 w-full md:w-2/3"
                                type="password"
                            />
                            <Button
                                variant="secondary"
                                className="bg-slate-200 hover:bg-zinc-700 text-slate-900"
                                onClick={() => {
                                    if (apiKey) {
                                        navigator.clipboard.writeText(apiKey);
                                        toast.success("API Key copied to clipboard");
                                    }
                                }}
                            >
                                Copy Keystring
                            </Button>
                        </div>
                        <p className="text-xs text-rose-500 mt-2 font-medium">
                            Warning: Do not expose this key to the public. It provides direct read/write access to your tenant data.
                        </p>
                    </div>
                </div>
            </div>

            {/* Communication Templates */}
            <div className="bg-slate-100 p-6 rounded-xl border border-slate-200 mb-6 backdrop-blur-sm">
                <h2 className="text-xl font-semibold flex items-center gap-2 mb-6">
                    💬 Communication Templates
                </h2>
                <div className="space-y-6">
                    <p className="text-sm text-slate-500 mb-4">
                        Variables available: {'{booking_id}, {pickup_time}, {pickup_address}, {dropoff_address}, {driver_name}, {driver_phone}, {vehicle_details}'}
                    </p>

                    <div>
                        <Label className="text-slate-500">Booking Confirmation SMS</Label>
                        <Textarea
                            value={smsTemplateConfirmation}
                            onChange={(e) => setSmsTemplateConfirmation(e.target.value)}
                            placeholder="Company: Booking #{booking_id} Confirmed.\nPickup: {pickup_time}\nFrom: {pickup_address}"
                            className="bg-slate-100 border-slate-200 mt-1"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-500">Driver Assigned SMS</Label>
                        <Textarea
                            value={smsTemplateDriverAssigned}
                            onChange={(e) => setSmsTemplateDriverAssigned(e.target.value)}
                            placeholder="Company: Driver Assigned.\n{driver_name} is on the way in {vehicle_details}.\nCall: {driver_phone}"
                            className="bg-slate-100 border-slate-200 mt-1"
                        />
                    </div>

                    <div>
                        <Label className="text-slate-500">Driver Arrived SMS</Label>
                        <Textarea
                            value={smsTemplateDriverArrived}
                            onChange={(e) => setSmsTemplateDriverArrived(e.target.value)}
                            placeholder="Company: Driver Arrived.\n{driver_name} is waiting outside in {vehicle_details}.\nCall: {driver_phone}"
                            className="bg-slate-100 border-slate-200 mt-1"
                        />
                    </div>
                    <p className="text-xs text-slate-400 mt-2">
                        Leave blank to use the default system messages.
                    </p>
                </div>
            </div>


            {/* Read Only Info */}
            <div className="bg-zinc-900/30 p-6 rounded-xl border border-slate-200">
                <p className="text-sm text-slate-400 text-center">
                    System Version 1.0.0 | Dispatch SaaS
                </p>
            </div>
        </div >
    );
}
