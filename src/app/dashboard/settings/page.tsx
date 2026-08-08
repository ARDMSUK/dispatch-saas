'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LocationInput } from '@/components/dashboard/location-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, 
  Route, 
  CreditCard, 
  Globe, 
  Bot, 
  Palette, 
  MonitorPlay, 
  MessageSquare, 
  ShieldCheck
} from 'lucide-react';

export default function SettingsPage() {
    const { data: session } = useSession();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

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
    const [outOfHoursStart, setOutOfHoursStart] = useState("");
    const [outOfHoursEnd, setOutOfHoursEnd] = useState("");
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
    const [sumupClientId, setSumupClientId] = useState('');
    const [sumupClientSecret, setSumupClientSecret] = useState('');
    const [zettleClientId, setZettleClientId] = useState('');
    const [zettleClientSecret, setZettleClientSecret] = useState('');
    const [paymentRouting, setPaymentRouting] = useState('CENTRAL');
    const [aviationStackApiKey, setAviationStackApiKey] = useState('');

    // Initial Data
    const [slug, setSlug] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [user, setUser] = useState<any>(null);
    const [sumupConnected, setSumupConnected] = useState(false);
    const [zettleConnected, setZettleConnected] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const success = searchParams.get('success');
        const error = searchParams.get('error');
        if (success === 'sumup_connected') {
            toast.success("SumUp successfully connected");
            fetchData();
        } else if (success === 'zettle_connected') {
            toast.success("Zettle successfully connected");
            fetchData();
        } else if (error) {
            toast.error(`Integration error: ${error.replace(/_/g, ' ')}`);
        }
    }, [searchParams]);

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

                setSlug(data.slug);
                setApiKey(data.apiKey);

                setUseZonePricing(data.useZonePricing ?? false);
                setAutoDispatch(data.autoDispatch ?? false);
                setDispatchAlgorithm(data.dispatchAlgorithm || "CLOSEST");
                setEnableLiveTracking(data.enableLiveTracking ?? true);
                setEnableDynamicPricing(data.enableDynamicPricing ?? false);
                setEnableWaitCalculations(data.enableWaitCalculations ?? false);
                setOutOfHoursStart(data.outOfHoursStart || "");
                setOutOfHoursEnd(data.outOfHoursEnd || "");
                setEnableWebBooker(data.enableWebBooker ?? false);
                setTenantSlug(data.slug || "");
                setHasWebChatAi(data.hasWebChatAi ?? false);
                setHasWhatsAppAi(data.hasWhatsAppAi ?? false);
                setAiMessageCount(data.aiMessageCount ?? 0);
                setAiMessageLimit(data.aiMessageLimit ?? 100);
                setTwilioFromNumber(data.twilioFromNumber || "");
                setConsoleLayout(data.consoleLayout || "MODERN");

                setSmsTemplateConfirmation(data.smsTemplateConfirmation || '');
                setSmsTemplateDriverAssigned(data.smsTemplateDriverAssigned || '');
                setSmsTemplateDriverArrived(data.smsTemplateDriverArrived || '');

                setLogoUrl(data.logoUrl || '');
                setBrandColor(data.brandColor || '#f59e0b');

                setStripePublishableKey(data.stripePublishableKey || '');
                setStripeSecretKey(data.stripeSecretKey || '');
                setSumupClientId(data.sumupClientId || '');
                setSumupClientSecret(data.sumupClientSecret || '');
                setZettleClientId(data.zettleClientId || '');
                setZettleClientSecret(data.zettleClientSecret || '');
                setPaymentRouting(data.paymentRouting || 'CENTRAL');
                setAviationStackApiKey(data.aviationStackApiKey || '');
                setSumupConnected(!!data.sumupAccessToken);
                setZettleConnected(!!data.zettleAccessToken);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load settings");
        } finally {
            setLoading(false);
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
                    address,
                    lat,
                    lng,
                    useZonePricing,
                    autoDispatch,
                    dispatchAlgorithm,
                    enableLiveTracking,
                    enableDynamicPricing,
                    enableWaitCalculations,
                    outOfHoursStart,
                    outOfHoursEnd,
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
                    paymentRouting,
                    aviationStackApiKey
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

    const handleDisconnectSumUp = async () => {
        try {
            const res = await fetch('/api/settings/organization', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disconnectSumup: true })
            });
            if (res.ok) {
                setSumupConnected(false);
                toast.success("SumUp successfully disconnected");
            } else {
                toast.error("Failed to disconnect SumUp");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to disconnect SumUp");
        }
    };

    const handleDisconnectZettle = async () => {
        try {
            const res = await fetch('/api/settings/organization', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ disconnectZettle: true })
            });
            if (res.ok) {
                setZettleConnected(false);
                toast.success("Zettle successfully disconnected");
            } else {
                toast.error("Failed to disconnect Zettle");
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to disconnect Zettle");
        }
    };

    const handleExportData = async () => {
        setIsExporting(true);
        try {
            const res = await fetch('/api/tenant/export-data');
            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cabai-export-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                a.remove();
                toast.success("Data export initiated securely.");
            } else {
                toast.error("Failed to export data.");
            }
        } catch (error) {
            console.error("Export error", error);
            toast.error("An error occurred during export.");
        } finally {
            setIsExporting(false);
        }
    };

    if (loading) return <div className="p-8 text-muted-foreground flex items-center justify-center h-full">Loading settings...</div>;

    return (
        <div className="p-6 md:p-10 bg-slate-50 dark:bg-zinc-950 text-foreground min-h-full">
            <div className="max-w-[1000px] mx-auto space-y-12 pb-32">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 dark:border-zinc-800 pb-6">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-zinc-100">Settings</h1>
                        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">Configure your fleet settings, dispatch preferences, integrations, and templates.</p>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="mt-4 sm:mt-0 bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-sm h-10 px-6 transition-all"
                    >
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>

                <div className="space-y-12">
                    {/* Organization Section */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-slate-200 dark:border-zinc-800">
                        <div className="md:col-span-4">
                            <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-zinc-100 mb-2">
                                <Building2 className="w-4 h-4 text-indigo-500" />
                                Organization Details
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                                Core contact and location information used for receipts and dispatch routing.
                            </p>
                        </div>
                        
                        <div className="md:col-span-8">
                            <div className="space-y-6 bg-white dark:bg-zinc-900 p-6 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Company Name</Label>
                                        <Input
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            className="bg-transparent border-slate-200 dark:border-zinc-700 h-10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Email Address</Label>
                                        <Input
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="bg-transparent border-slate-200 dark:border-zinc-700 h-10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Telephone Number</Label>
                                        <Input
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className="bg-transparent border-slate-200 dark:border-zinc-700 h-10"
                                        />
                                    </div>
                                    <div className="space-y-2 sm:col-span-2">
                                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Operating Address</Label>
                                        <div className="relative">
                                            <LocationInput
                                                value={address}
                                                onChange={setAddress}
                                                onLocationSelect={(loc) => {
                                                    setAddress(loc.address);
                                                    setLat(loc.lat);
                                                    setLng(loc.lng);
                                                    toast.success("Location coordinates updated");
                                                }}
                                                placeholder="Search for your office address..."
                                                className="bg-transparent border-slate-200 dark:border-zinc-700 w-full rounded-md border px-3 h-10 text-sm"
                                            />
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                            <p className="text-[11px] text-slate-400">Centers the Dispatch Map.</p>
                                            {lat && lng && <span className="text-[11px] text-emerald-600 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">✓ Coordinates Found</span>}
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-slate-100 dark:border-zinc-800">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Company Slug</Label>
                                        <div className="font-mono text-sm bg-slate-50 dark:bg-zinc-800/50 px-3 h-10 rounded-md border border-slate-200 dark:border-zinc-700 text-slate-500 flex items-center cursor-not-allowed">
                                            {slug}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">API Key</Label>
                                        <div className="font-mono text-sm bg-slate-50 dark:bg-zinc-800/50 px-3 h-10 rounded-md border border-slate-200 dark:border-zinc-700 text-slate-500 flex items-center justify-between cursor-not-allowed truncate">
                                            {apiKey}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Advanced Dispatch & Routing */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-slate-200 dark:border-zinc-800">
                        <div className="md:col-span-4">
                            <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-zinc-100 mb-2">
                                <Route className="w-4 h-4 text-indigo-500" />
                                Advanced Dispatch & Routing
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                                Automate driver assignments using proximity or zone queueing logic.
                            </p>
                        </div>
                        
                        <div className="md:col-span-8">
                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800">
                                    <div className="pr-4">
                                        <Label htmlFor="autoDispatch" className="text-sm font-medium text-slate-900 dark:text-zinc-100 cursor-pointer">Enable Auto-Dispatch Engine</Label>
                                        <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-1">Automatically assign pending jobs to available drivers without human intervention.</p>
                                    </div>
                                    <Switch id="autoDispatch" checked={autoDispatch} onCheckedChange={(checked) => setAutoDispatch(checked)} />
                                </div>

                                {autoDispatch && (
                                    <div className="p-5 bg-slate-50/50 dark:bg-zinc-800/20">
                                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Dispatch Algorithm</Label>
                                        <Select value={dispatchAlgorithm} onValueChange={setDispatchAlgorithm}>
                                            <SelectTrigger className="w-full bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 h-10">
                                                <SelectValue placeholder="Select Algorithm" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="CLOSEST">Closest Driver (GPS Distance)</SelectItem>
                                                <SelectItem value="LONGEST_WAITING">Zone Queueing (Longest Waiting)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-3">
                                            {dispatchAlgorithm === "CLOSEST" 
                                                ? "Assigns to the nearest driver by direct line-of-sight."
                                                : "First-In-First-Out within geographical zones. Falls back to Closest if queue is empty."}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Complex Fares & Pricing */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-slate-200 dark:border-zinc-800">
                        <div className="md:col-span-4">
                            <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-zinc-100 mb-2">
                                <CreditCard className="w-4 h-4 text-indigo-500" />
                                Complex Fares & Pricing
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                                Configure surge multipliers and automated penalty fees.
                            </p>
                        </div>
                        
                        <div className="md:col-span-8">
                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800">
                                    <div className="pr-4">
                                        <Label htmlFor="enableDynamicPricing" className="text-sm font-medium text-slate-900 dark:text-zinc-100 cursor-pointer">Enable Dynamic Pricing (Surge)</Label>
                                        <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-1">
                                            Automatically apply multipliers to fares based on active Surcharge rules.
                                            <Link href="/dashboard/pricing" className="ml-1 text-indigo-600 hover:underline font-medium">Manage Pricing Rules &rarr;</Link>
                                        </p>
                                    </div>
                                    <Switch id="enableDynamicPricing" checked={enableDynamicPricing} onCheckedChange={(checked) => setEnableDynamicPricing(checked)} />
                                </div>
                                
                                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800">
                                    <div className="pr-4">
                                        <Label htmlFor="enableWaitCalculations" className="text-sm font-medium text-slate-900 dark:text-zinc-100 cursor-pointer">Automate Wait Time Calculations</Label>
                                        <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-1">Include driver wait times into the quoted price based on vehicle tier rates.</p>
                                    </div>
                                    <Switch id="enableWaitCalculations" checked={enableWaitCalculations} onCheckedChange={(checked) => setEnableWaitCalculations(checked)} />
                                </div>

                                <div className="p-5 bg-slate-50/50 dark:bg-zinc-800/20">
                                    <Label className="text-[13px] font-medium text-slate-900 dark:text-zinc-100 mb-3 block">Global Out of Hours Window</Label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Start Time</Label>
                                            <Input
                                                type="time"
                                                value={outOfHoursStart}
                                                onChange={(e) => setOutOfHoursStart(e.target.value)}
                                                className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 h-9"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <Label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">End Time</Label>
                                            <Input
                                                type="time"
                                                value={outOfHoursEnd}
                                                onChange={(e) => setOutOfHoursEnd(e.target.value)}
                                                className="bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-700 h-9"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Web Integration */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-slate-200 dark:border-zinc-800">
                        <div className="md:col-span-4">
                            <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-zinc-100 mb-2">
                                <Globe className="w-4 h-4 text-indigo-500" />
                                Web Integration
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                                Embed a secure booking form directly on your company website.
                            </p>
                        </div>
                        
                        <div className="md:col-span-8">
                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-zinc-800">
                                    <div className="pr-4">
                                        <Label htmlFor="enableWebBooker" className="text-sm font-medium text-slate-900 dark:text-zinc-100 cursor-pointer">Enable Standalone Web Booker</Label>
                                        <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-1">Unlocks the public `/booker` route for your tenant account.</p>
                                    </div>
                                    <Switch id="enableWebBooker" checked={enableWebBooker} onCheckedChange={(checked) => setEnableWebBooker(checked)} />
                                </div>

                                {enableWebBooker && tenantSlug && (
                                    <div className="p-5 bg-slate-50/50 dark:bg-zinc-800/20">
                                        <Label className="text-[13px] font-medium text-slate-900 dark:text-zinc-100 mb-3 block">Iframe Embed Code</Label>
                                        <div className="relative group">
                                            <textarea
                                                readOnly
                                                value={`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/booker/${tenantSlug}" width="100%" height="700px" style="border:none; border-radius:12px; overflow:hidden;" title="Book a Taxi"></iframe>`}
                                                className="w-full h-24 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-700 text-indigo-600 dark:text-indigo-400 font-mono text-[11px] p-3 rounded-md resize-none"
                                            />
                                            <Button
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 hover:bg-indigo-700 text-white h-7 px-3 text-xs font-medium"
                                                onClick={() => {
                                                    if (typeof window !== 'undefined') {
                                                        navigator.clipboard.writeText(`<iframe src="${window.location.origin}/booker/${tenantSlug}" width="100%" height="700px" style="border:none; border-radius:12px; overflow:hidden;" title="Book a Taxi"></iframe>`);
                                                        toast.success("Embed code copied!");
                                                    }
                                                }}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* AI Integrations */}
                    {(hasWebChatAi || hasWhatsAppAi) && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-slate-200 dark:border-zinc-800">
                            <div className="md:col-span-4">
                                <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-zinc-100 mb-2">
                                    <Bot className="w-4 h-4 text-indigo-500" />
                                    AI Integrations
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed mb-6">
                                    Manage your automated chat agents for Web and WhatsApp.
                                </p>
                                
                                {typeof aiMessageCount === 'number' && typeof aiMessageLimit === 'number' && (
                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-800/30 p-4 rounded-lg inline-flex flex-col gap-1 w-full max-w-xs">
                                        <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-500/80">Monthly Usage</span>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className={`font-semibold ${aiMessageCount >= aiMessageLimit ? "text-rose-600" : "text-indigo-700 dark:text-indigo-400"}`}>
                                                {aiMessageCount}
                                            </span>
                                            <span className="text-indigo-300 dark:text-indigo-800">/</span>
                                            <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{aiMessageLimit} messages</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            
                            <div className="md:col-span-8 space-y-6">
                                {hasWebChatAi && (
                                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-4">Web Chat Widget</h3>
                                        <Label className="text-[13px] font-medium text-slate-700 dark:text-zinc-300 mb-2 block">Script Embed Code</Label>
                                        <div className="relative group">
                                            <Input
                                                readOnly
                                                className="font-mono text-[11px] bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 h-12 pr-20"
                                                value={`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-api-key="${apiKey}" data-color="${brandColor || '#1d4ed8'}"></script>`}
                                            />
                                            <Button
                                                className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-600 hover:bg-indigo-700 text-white h-7 px-3 text-xs font-medium"
                                                onClick={() => {
                                                    if (typeof window !== 'undefined') {
                                                        navigator.clipboard.writeText(`<script src="${window.location.origin}/widget.js" data-api-key="${apiKey}" data-color="${brandColor || '#1d4ed8'}"></script>`);
                                                        toast.success("Embed script copied!");
                                                    }
                                                }}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                        <p className="text-[11px] text-rose-500/90 mt-2 font-medium">
                                            * This snippet includes your secret API Key. Do not share it unnecessarily.
                                        </p>
                                    </div>
                                )}

                                {hasWhatsAppAi && (
                                    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6">
                                        <h3 className="text-sm font-semibold text-slate-900 dark:text-zinc-100 mb-4">WhatsApp AI Agent</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">WhatsApp Number</Label>
                                                <Input
                                                    value={twilioFromNumber}
                                                    onChange={(e) => setTwilioFromNumber(e.target.value)}
                                                    placeholder="+14155238886"
                                                    className="bg-transparent border-slate-200 dark:border-zinc-700 h-10 font-mono text-indigo-600 dark:text-indigo-400 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Twilio Webhook URL</Label>
                                                <div className="relative group">
                                                    <Input
                                                        readOnly
                                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/twilio/whatsapp`}
                                                        className="bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-400 font-mono text-xs h-10 pr-16"
                                                    />
                                                    <Button
                                                        className="absolute top-1/2 -translate-y-1/2 right-1.5 h-7 px-3 text-xs bg-slate-200 hover:bg-slate-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium transition-colors"
                                                        onClick={() => {
                                                            if (typeof window !== 'undefined') {
                                                                navigator.clipboard.writeText(`${window.location.origin}/api/twilio/whatsapp`);
                                                                toast.success("Webhook URL copied");
                                                            }
                                                        }}
                                                    >
                                                        Copy
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Visual Branding */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-slate-200 dark:border-zinc-800">
                        <div className="md:col-span-4">
                            <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-zinc-100 mb-2">
                                <Palette className="w-4 h-4 text-indigo-500" />
                                Visual Branding
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                                Customize how your company appears on the Web Booker and inside receipts.
                            </p>
                        </div>
                        
                        <div className="md:col-span-8">
                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 space-y-8">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Public Logo URL</Label>
                                        <Input
                                            value={logoUrl}
                                            onChange={(e) => setLogoUrl(e.target.value)}
                                            placeholder="https://yourwebsite.com/logo.png"
                                            className="bg-transparent border-slate-200 dark:border-zinc-700 h-10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Primary Brand Color</Label>
                                        <div className="flex items-center gap-3">
                                            <div className="relative overflow-hidden rounded-md border border-slate-200 dark:border-zinc-700 w-10 h-10 shrink-0 shadow-sm">
                                                <input
                                                    type="color"
                                                    value={brandColor}
                                                    onChange={(e) => setBrandColor(e.target.value)}
                                                    className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer"
                                                />
                                            </div>
                                            <Input
                                                type="text"
                                                value={brandColor}
                                                onChange={(e) => setBrandColor(e.target.value)}
                                                className="bg-transparent border-slate-200 dark:border-zinc-700 font-mono uppercase h-10"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100 dark:border-zinc-800">
                                    <Label className="text-[13px] font-medium text-slate-900 dark:text-zinc-100 mb-3 block">Live Preview</Label>
                                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-lg max-w-sm">
                                        {logoUrl ? (
                                            <img src={logoUrl} alt="Company Logo" className="h-8 object-contain" />
                                        ) : (
                                            <span className="font-bold text-slate-900 dark:text-zinc-100 text-lg">{companyName || "Your Company"}</span>
                                        )}
                                        <div
                                            className="px-4 py-1.5 rounded-md text-white shadow-sm text-sm font-medium transition-colors"
                                            style={{ backgroundColor: brandColor }}
                                        >
                                            Book Now
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Workspace Preferences */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-slate-200 dark:border-zinc-800">
                        <div className="md:col-span-4">
                            <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-zinc-100 mb-2">
                                <MonitorPlay className="w-4 h-4 text-indigo-500" />
                                Workspace Preferences
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                                Customize the layout and default behaviors of the Dispatch Dashboard.
                            </p>
                        </div>
                        
                        <div className="md:col-span-8">
                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6">
                                <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">Booking Console Layout</Label>
                                <Select value={consoleLayout} onValueChange={setConsoleLayout}>
                                    <SelectTrigger className="w-full sm:w-2/3 bg-transparent border-slate-200 dark:border-zinc-700 h-10">
                                        <SelectValue placeholder="Select Layout" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="MODERN">Modern Layout (Card-based)</SelectItem>
                                        <SelectItem value="CLASSIC">Classic Layout (High-density)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-[13px] text-slate-500 dark:text-zinc-400 mt-2">
                                    {consoleLayout === "MODERN" 
                                        ? "Clean, large cards with comprehensive details and dedicated sidebars."
                                        : "iCabbi-style horizontal split with high-density columnar job strips."}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Payment Integrations */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-slate-200 dark:border-zinc-800">
                        <div className="md:col-span-4">
                            <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-zinc-100 mb-2">
                                <CreditCard className="w-4 h-4 text-indigo-500" />
                                Payments
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                                Connect your Stripe account to process in-app payments securely.
                            </p>
                        </div>
                        
                        <div className="md:col-span-8">
                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Stripe Publishable Key</Label>
                                        <Input
                                            value={stripePublishableKey}
                                            onChange={(e) => setStripePublishableKey(e.target.value)}
                                            placeholder="pk_live_..."
                                            className="bg-transparent border-slate-200 dark:border-zinc-700 font-mono text-sm h-10"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Stripe Secret Key</Label>
                                        <Input
                                            type={stripeSecretKey.includes('••••') ? "text" : "password"}
                                            value={stripeSecretKey}
                                            onChange={(e) => setStripeSecretKey(e.target.value)}
                                            placeholder="sk_live_..."
                                            className="bg-transparent border-slate-200 dark:border-zinc-700 font-mono text-sm h-10"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Developer API */}
                    {session?.user?.role === 'SUPER_ADMIN' && (
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-slate-200 dark:border-zinc-800">
                            <div className="md:col-span-4">
                                <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-zinc-100 mb-2">
                                    <Route className="w-4 h-4 text-indigo-500" />
                                    Developer API
                                </h2>
                                <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                                    Secured tokens for custom integrations and flight tracking.
                                </p>
                            </div>
                            
                            <div className="md:col-span-8">
                                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 space-y-6">
                                    <div className="space-y-2">
                                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Secret API Key</Label>
                                        <div className="flex items-center gap-3">
                                            <Input
                                                value={apiKey || '••••••••••••••••••••••••••••••••'}
                                                readOnly
                                                type="password"
                                                className="bg-slate-50 dark:bg-zinc-950 border-slate-200 dark:border-zinc-700 font-mono text-slate-500 w-full sm:w-2/3 h-10"
                                            />
                                            <Button
                                                variant="secondary"
                                                className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-300 font-medium h-10 px-4"
                                                onClick={() => {
                                                    if (apiKey) {
                                                        navigator.clipboard.writeText(apiKey);
                                                        toast.success("API Key copied");
                                                    }
                                                }}
                                            >
                                                Copy
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-slate-100 dark:border-zinc-800">
                                        <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider mb-2 block">AviationStack API Key</Label>
                                        <Input
                                            value={aviationStackApiKey}
                                            onChange={(e) => setAviationStackApiKey(e.target.value)}
                                            placeholder="Flight tracking API key..."
                                            className="bg-transparent border-slate-200 dark:border-zinc-700 font-mono text-sm w-full sm:w-2/3 h-10"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Communication Templates */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-12 border-b border-slate-200 dark:border-zinc-800">
                        <div className="md:col-span-4">
                            <h2 className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-zinc-100 mb-2">
                                <MessageSquare className="w-4 h-4 text-indigo-500" />
                                Comm Templates
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                                Format automated SMS messages sent to customers.
                            </p>
                        </div>
                        
                        <div className="md:col-span-8">
                            <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm p-6 space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Booking Confirmation SMS</Label>
                                    <Textarea
                                        value={smsTemplateConfirmation}
                                        onChange={(e) => setSmsTemplateConfirmation(e.target.value)}
                                        placeholder="Company: Booking #{booking_id} Confirmed.\nPickup: {pickup_time}\nFrom: {pickup_address}"
                                        className="bg-transparent border-slate-200 dark:border-zinc-700 h-20 resize-none text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Driver Assigned SMS</Label>
                                    <Textarea
                                        value={smsTemplateDriverAssigned}
                                        onChange={(e) => setSmsTemplateDriverAssigned(e.target.value)}
                                        placeholder="Company: Driver Assigned.\n{driver_name} is on the way in {vehicle_details}.\nCall: {driver_phone}"
                                        className="bg-transparent border-slate-200 dark:border-zinc-700 h-20 resize-none text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">Driver Arrived SMS</Label>
                                    <Textarea
                                        value={smsTemplateDriverArrived}
                                        onChange={(e) => setSmsTemplateDriverArrived(e.target.value)}
                                        placeholder="Company: Driver Arrived.\n{driver_name} is waiting outside in {vehicle_details}.\nCall: {driver_phone}"
                                        className="bg-transparent border-slate-200 dark:border-zinc-700 h-20 resize-none text-sm"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data & Privacy */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 pb-4">
                        <div className="md:col-span-4">
                            <h2 className="text-sm font-semibold flex items-center gap-2 text-rose-600 dark:text-rose-500 mb-2">
                                <ShieldCheck className="w-4 h-4" />
                                Data & Privacy
                            </h2>
                            <p className="text-sm text-slate-500 dark:text-zinc-400 leading-relaxed">
                                Export a complete raw JSON backup of your workspace at any time.
                            </p>
                        </div>
                        
                        <div className="md:col-span-8">
                            <div className="bg-rose-50/50 dark:bg-rose-950/20 p-6 rounded-xl border border-rose-200/50 dark:border-rose-900/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-semibold text-sm text-rose-900 dark:text-rose-300">Anti-Ransom Guarantee</h3>
                                    <p className="text-[13px] text-rose-700/80 dark:text-rose-400/80 mt-1">
                                        Your data belongs to you. Download everything instantly.
                                    </p>
                                </div>
                                <Button 
                                    onClick={handleExportData}
                                    disabled={isExporting}
                                    className="bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-sm shrink-0 h-10 px-5"
                                >
                                    {isExporting ? 'Bundling...' : 'Export JSON'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Minimal Save Banner */}
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white dark:bg-zinc-900 rounded-full shadow-lg border border-slate-200 dark:border-zinc-800 p-2 pr-6 z-50">
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-full h-10 px-6 shadow-sm transition-transform active:scale-95"
                >
                    {saving ? 'Saving...' : 'Save Settings'}
                </Button>
                <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 hidden sm:inline-block">
                    Unsaved changes will be lost
                </span>
            </div>
        </div>
    );
}
