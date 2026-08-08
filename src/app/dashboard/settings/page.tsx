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
import { Checkbox } from '@/components/ui/checkbox';
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
        <div className="p-6 md:p-10 bg-background text-foreground max-w-6xl mx-auto overflow-y-auto h-full pb-32">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 pb-6 border-b border-border/60 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1.5">Manage your workspace preferences, integrations, and branding.</p>
                </div>
                <Button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-6 shadow-sm shrink-0"
                >
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <div className="space-y-10">
                {/* Organization Section */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10 border-b border-border/50">
                    <div className="xl:col-span-1">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground mb-2">
                            <Building2 className="w-5 h-5 text-muted-foreground" />
                            Organization Details
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                            Configure your company's core contact and location information. This is used for receipts and dispatch routing.
                        </p>
                    </div>
                    
                    <div className="xl:col-span-2">
                        <div className="bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Company Name</Label>
                                    <Input
                                        value={companyName}
                                        onChange={(e) => setCompanyName(e.target.value)}
                                        className="bg-background/50 text-foreground"
                                    />
                                </div>
                                <div>
                                    <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Email Address</Label>
                                    <Input
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="bg-background/50 text-foreground"
                                    />
                                </div>
                                <div>
                                    <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Telephone Number</Label>
                                    <Input
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="bg-background/50 text-foreground"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Operating Address</Label>
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
                                            className="bg-background/50 text-foreground w-full rounded-md border p-2 text-sm"
                                        />
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                        <p className="text-xs text-muted-foreground">Centers the Dispatch Map.</p>
                                        {lat && lng && <span className="text-xs text-emerald-500 font-medium">✓ Coordinates Found</span>}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Company Slug</Label>
                                    <div className="font-mono text-sm bg-muted/50 px-3 py-2 rounded-md border border-border/50 text-muted-foreground/80 cursor-not-allowed">
                                        {slug}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">API Key</Label>
                                    <div className="font-mono text-sm bg-muted/50 px-3 py-2 rounded-md border border-border/50 text-muted-foreground/80 cursor-not-allowed flex items-center justify-between">
                                        <span className="truncate">{apiKey}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Advanced Dispatch & Routing Section */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10 border-b border-border/50">
                    <div className="xl:col-span-1">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground mb-2">
                            <Route className="w-5 h-5 text-muted-foreground" />
                            Advanced Dispatch
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                            Automate driver assignments using proximity or zone queueing logic.
                        </p>
                    </div>
                    
                    <div className="xl:col-span-2">
                        <div className="bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm space-y-6">
                            <div className="flex items-start space-x-3 p-4 bg-muted/20 rounded-lg border border-border/30">
                                <Checkbox
                                    id="autoDispatch"
                                    checked={autoDispatch}
                                    onCheckedChange={(checked) => setAutoDispatch(checked === true)}
                                    className="mt-1 border-input data-[state=checked]:bg-primary"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label
                                        htmlFor="autoDispatch"
                                        className="text-sm font-medium cursor-pointer text-foreground"
                                    >
                                        Enable Auto-Dispatch Engine
                                    </label>
                                    <p className="text-sm text-muted-foreground/80 leading-relaxed">
                                        Automatically assign pending jobs to available drivers without human intervention.
                                    </p>
                                </div>
                            </div>

                            {autoDispatch && (
                                <div className="p-5 bg-muted/30 rounded-lg border border-border/40 animate-in fade-in slide-in-from-top-2">
                                    <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-3 block">Dispatch Algorithm</Label>
                                    <Select value={dispatchAlgorithm} onValueChange={setDispatchAlgorithm}>
                                        <SelectTrigger className="w-full bg-background/50 border-input text-foreground">
                                            <SelectValue placeholder="Select Algorithm" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CLOSEST">Closest Driver (GPS Distance)</SelectItem>
                                            <SelectItem value="LONGEST_WAITING">Zone Queueing (Longest Waiting)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground mt-3">
                                        {dispatchAlgorithm === "CLOSEST" 
                                            ? "Assigns to the nearest driver by direct line-of-sight."
                                            : "First-In-First-Out within geographical zones. Falls back to Closest if queue is empty."}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Complex Fares & Pricing Section */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10 border-b border-border/50">
                    <div className="xl:col-span-1">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground mb-2">
                            <CreditCard className="w-5 h-5 text-muted-foreground" />
                            Fares & Pricing
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                            Configure surge multipliers and automated penalty fees.
                        </p>
                    </div>
                    
                    <div className="xl:col-span-2">
                        <div className="bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm space-y-4">
                            <div className="flex items-start space-x-3 p-4 bg-muted/20 rounded-lg border border-border/30">
                                <Checkbox
                                    id="enableDynamicPricing"
                                    checked={enableDynamicPricing}
                                    onCheckedChange={(checked) => setEnableDynamicPricing(checked === true)}
                                    className="mt-1 border-input data-[state=checked]:bg-primary"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label htmlFor="enableDynamicPricing" className="text-sm font-medium cursor-pointer text-foreground">
                                        Enable Dynamic Pricing (Surge)
                                    </label>
                                    <p className="text-sm text-muted-foreground/80 leading-relaxed">
                                        Automatically apply multipliers to fares based on active Surcharge rules.
                                        <span className="block mt-2">
                                            <Link href="/dashboard/pricing" className="text-primary hover:underline text-xs font-medium">
                                                Manage Pricing Rules &rarr;
                                            </Link>
                                        </span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-3 p-4 bg-muted/20 rounded-lg border border-border/30">
                                <Checkbox
                                    id="enableWaitCalculations"
                                    checked={enableWaitCalculations}
                                    onCheckedChange={(checked) => setEnableWaitCalculations(checked === true)}
                                    className="mt-1 border-input data-[state=checked]:bg-primary"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label htmlFor="enableWaitCalculations" className="text-sm font-medium cursor-pointer text-foreground">
                                        Automate Wait Time Calculations
                                    </label>
                                    <p className="text-sm text-muted-foreground/80 leading-relaxed">
                                        Include driver wait times into the quoted price based on vehicle tier rates.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border/40 mt-6">
                                <Label className="text-foreground font-medium mb-3 block">Global Out of Hours Window</Label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Start Time</Label>
                                        <Input
                                            type="time"
                                            value={outOfHoursStart}
                                            onChange={(e) => setOutOfHoursStart(e.target.value)}
                                            className="bg-background/50 border-input text-foreground"
                                        />
                                    </div>
                                    <div>
                                        <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">End Time</Label>
                                        <Input
                                            type="time"
                                            value={outOfHoursEnd}
                                            onChange={(e) => setOutOfHoursEnd(e.target.value)}
                                            className="bg-background/50 border-input text-foreground"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Web Integration */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10 border-b border-border/50">
                    <div className="xl:col-span-1">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground mb-2">
                            <Globe className="w-5 h-5 text-muted-foreground" />
                            Web Integration
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                            Embed a secure booking form directly on your company website.
                        </p>
                    </div>
                    
                    <div className="xl:col-span-2">
                        <div className="bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm space-y-6">
                            <div className="flex items-start space-x-3 p-4 bg-muted/20 rounded-lg border border-border/30">
                                <Checkbox
                                    id="enableWebBooker"
                                    checked={enableWebBooker}
                                    onCheckedChange={(checked) => setEnableWebBooker(checked === true)}
                                    className="mt-1 border-input data-[state=checked]:bg-primary"
                                />
                                <div className="grid gap-1.5 leading-none">
                                    <label htmlFor="enableWebBooker" className="text-sm font-medium cursor-pointer text-foreground">
                                        Enable Standalone Web Booker
                                    </label>
                                    <p className="text-sm text-muted-foreground/80 leading-relaxed">
                                        Unlocks the public `/booker` route for your tenant account.
                                    </p>
                                </div>
                            </div>

                            {enableWebBooker && tenantSlug && (
                                <div className="p-5 bg-muted/30 rounded-lg border border-border/40 relative">
                                    <Label className="text-foreground font-medium mb-3 block">Iframe Embed Code</Label>
                                    <div className="relative group">
                                        <textarea
                                            readOnly
                                            value={`<iframe src="${typeof window !== 'undefined' ? window.location.origin : ''}/booker/${tenantSlug}" width="100%" height="700px" style="border:none; border-radius:12px; overflow:hidden;" title="Book a Taxi"></iframe>`}
                                            className="w-full h-24 bg-background/80 border border-border/50 text-emerald-600 dark:text-emerald-400 font-mono text-xs p-3 rounded-md resize-none"
                                        />
                                        <Button
                                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground h-7 text-xs font-medium"
                                            onClick={() => {
                                                if (typeof window !== 'undefined') {
                                                    navigator.clipboard.writeText(`<iframe src="${window.location.origin}/booker/${tenantSlug}" width="100%" height="700px" style="border:none; border-radius:12px; overflow:hidden;" title="Book a Taxi"></iframe>`);
                                                    toast.success("Embed code copied!");
                                                }
                                            }}
                                        >
                                            Copy Code
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* AI Integrations */}
                {(hasWebChatAi || hasWhatsAppAi) && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10 border-b border-border/50">
                        <div className="xl:col-span-1">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground mb-2">
                                <Bot className="w-5 h-5 text-muted-foreground" />
                                AI Integrations
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                                Manage your automated chat agents for Web and WhatsApp.
                            </p>
                            
                            {typeof aiMessageCount === 'number' && typeof aiMessageLimit === 'number' && (
                                <div className="mt-6 text-sm font-medium text-muted-foreground bg-muted/40 p-3 rounded-lg border border-border/40 inline-flex flex-col gap-1 w-full max-w-xs">
                                    <span className="text-xs uppercase tracking-wider text-muted-foreground/70">Monthly Usage</span>
                                    <div className="flex items-center gap-1.5">
                                        <span className={aiMessageCount >= aiMessageLimit ? "text-rose-600 font-bold" : "text-emerald-600 font-bold"}>
                                            {aiMessageCount}
                                        </span>
                                        <span className="text-muted-foreground/50">/</span>
                                        <span className="text-foreground">{aiMessageLimit} messages</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="xl:col-span-2">
                            <div className="bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm space-y-8">
                                {hasWebChatAi && (
                                    <div className={hasWhatsAppAi ? "pb-8 border-b border-border/40" : ""}>
                                        <h3 className="text-base font-medium text-foreground mb-4">Web Chat Widget</h3>
                                        <div className="p-5 bg-muted/30 rounded-lg border border-border/40">
                                            <Label className="text-foreground font-medium mb-3 block">Script Embed Code</Label>
                                            <div className="relative group">
                                                <Input
                                                    readOnly
                                                    className="font-mono text-xs bg-background/80 border-input text-foreground h-16"
                                                    value={`<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/widget.js" data-api-key="${apiKey}" data-color="${brandColor || '#1d4ed8'}"></script>`}
                                                />
                                                <Button
                                                    className="absolute top-1/2 -translate-y-1/2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-primary text-primary-foreground h-7 text-xs font-medium"
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
                                            <p className="text-xs text-rose-500/90 mt-3 font-medium">
                                                * This snippet includes your secret API Key. Do not share it unnecessarily.
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {hasWhatsAppAi && (
                                    <div>
                                        <h3 className="text-base font-medium text-foreground mb-4">WhatsApp AI Agent</h3>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="bg-muted/20 p-4 rounded-lg border border-border/30">
                                                <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">WhatsApp Number</Label>
                                                <Input
                                                    value={twilioFromNumber}
                                                    onChange={(e) => setTwilioFromNumber(e.target.value)}
                                                    placeholder="+14155238886"
                                                    className="bg-background/50 border-input font-mono text-emerald-600 dark:text-emerald-400"
                                                />
                                            </div>
                                            <div className="bg-muted/20 p-4 rounded-lg border border-border/30">
                                                <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Twilio Webhook URL</Label>
                                                <div className="relative group">
                                                    <Input
                                                        readOnly
                                                        value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/twilio/whatsapp`}
                                                        className="bg-background/50 border-input text-primary font-mono text-xs pr-16"
                                                    />
                                                    <Button
                                                        className="absolute top-1/2 -translate-y-1/2 right-1.5 h-6 px-2 text-[10px] bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium"
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
                    </div>
                )}

                {/* Visual Branding */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10 border-b border-border/50">
                    <div className="xl:col-span-1">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground mb-2">
                            <Palette className="w-5 h-5 text-muted-foreground" />
                            Visual Branding
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                            Customize how your company appears on the Web Booker and inside receipts.
                        </p>
                    </div>
                    
                    <div className="xl:col-span-2">
                        <div className="bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Public Logo URL</Label>
                                    <Input
                                        value={logoUrl}
                                        onChange={(e) => setLogoUrl(e.target.value)}
                                        placeholder="https://yourwebsite.com/logo.png"
                                        className="bg-background/50 border-input text-foreground"
                                    />
                                </div>
                                <div>
                                    <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Primary Brand Color</Label>
                                    <div className="flex items-center gap-3">
                                        <div className="relative overflow-hidden rounded-md border border-input w-10 h-10 shrink-0">
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
                                            className="bg-background/50 border-input font-mono uppercase"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-border/40 mt-6">
                                <Label className="text-foreground font-medium mb-3 block">Live Preview</Label>
                                <div className="flex items-center justify-between p-4 bg-background/50 border border-border/50 rounded-lg max-w-sm">
                                    {logoUrl ? (
                                        <img src={logoUrl} alt="Company Logo" className="h-8 object-contain" />
                                    ) : (
                                        <span className="font-bold text-foreground text-lg">{companyName || "Your Company"}</span>
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
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10 border-b border-border/50">
                    <div className="xl:col-span-1">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground mb-2">
                            <MonitorPlay className="w-5 h-5 text-muted-foreground" />
                            Workspace
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                            Customize the layout and default behaviors of the Dispatch Dashboard.
                        </p>
                    </div>
                    
                    <div className="xl:col-span-2">
                        <div className="bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm">
                            <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-3 block">Booking Console Layout</Label>
                            <Select value={consoleLayout} onValueChange={setConsoleLayout}>
                                <SelectTrigger className="w-full sm:w-2/3 bg-background/50 border-input text-foreground">
                                    <SelectValue placeholder="Select Layout" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="MODERN">Modern Layout (Card-based)</SelectItem>
                                    <SelectItem value="CLASSIC">Classic Layout (High-density)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground/80 mt-3">
                                {consoleLayout === "MODERN" 
                                    ? "Clean, large cards with comprehensive details and dedicated sidebars."
                                    : "iCabbi-style horizontal split with high-density columnar job strips."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Payment Integrations */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10 border-b border-border/50">
                    <div className="xl:col-span-1">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground mb-2">
                            <CreditCard className="w-5 h-5 text-muted-foreground" />
                            Payments
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                            Connect your Stripe account to process in-app payments securely.
                        </p>
                    </div>
                    
                    <div className="xl:col-span-2">
                        <div className="bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <div>
                                    <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Stripe Publishable Key</Label>
                                    <Input
                                        value={stripePublishableKey}
                                        onChange={(e) => setStripePublishableKey(e.target.value)}
                                        placeholder="pk_live_..."
                                        className="bg-background/50 border-input font-mono text-sm text-foreground"
                                    />
                                </div>
                                <div>
                                    <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Stripe Secret Key</Label>
                                    <Input
                                        type={stripeSecretKey.includes('••••') ? "text" : "password"}
                                        value={stripeSecretKey}
                                        onChange={(e) => setStripeSecretKey(e.target.value)}
                                        placeholder="sk_live_..."
                                        className="bg-background/50 border-input font-mono text-sm text-foreground"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Developer API */}
                {session?.user?.role === 'SUPER_ADMIN' && (
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10 border-b border-border/50">
                        <div className="xl:col-span-1">
                            <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground mb-2">
                                <Route className="w-5 h-5 text-muted-foreground" />
                                Developer API
                            </h2>
                            <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                                Secured tokens for custom integrations and flight tracking.
                            </p>
                        </div>
                        
                        <div className="xl:col-span-2">
                            <div className="bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm space-y-6">
                                <div>
                                    <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Secret API Key</Label>
                                    <div className="flex items-center gap-3">
                                        <Input
                                            value={apiKey || '••••••••••••••••••••••••••••••••'}
                                            readOnly
                                            type="password"
                                            className="bg-background/50 border-input font-mono text-muted-foreground w-full sm:w-2/3"
                                        />
                                        <Button
                                            variant="secondary"
                                            className="bg-secondary text-secondary-foreground font-medium"
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

                                <div className="pt-6 border-t border-border/40 mt-6">
                                    <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">AviationStack API Key</Label>
                                    <Input
                                        value={aviationStackApiKey}
                                        onChange={(e) => setAviationStackApiKey(e.target.value)}
                                        placeholder="Flight tracking API key..."
                                        className="bg-background/50 border-input font-mono text-sm text-foreground w-full sm:w-2/3"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Communication Templates */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-10 border-b border-border/50">
                    <div className="xl:col-span-1">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-foreground mb-2">
                            <MessageSquare className="w-5 h-5 text-muted-foreground" />
                            Comm Templates
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                            Format automated SMS messages sent to customers.
                        </p>
                    </div>
                    
                    <div className="xl:col-span-2">
                        <div className="bg-card p-6 sm:p-8 rounded-xl border border-border/40 shadow-sm space-y-6">
                            <div>
                                <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Booking Confirmation SMS</Label>
                                <Textarea
                                    value={smsTemplateConfirmation}
                                    onChange={(e) => setSmsTemplateConfirmation(e.target.value)}
                                    placeholder="Company: Booking #{booking_id} Confirmed.\nPickup: {pickup_time}\nFrom: {pickup_address}"
                                    className="bg-background/50 border-input text-foreground h-20 resize-none"
                                />
                            </div>
                            <div>
                                <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Driver Assigned SMS</Label>
                                <Textarea
                                    value={smsTemplateDriverAssigned}
                                    onChange={(e) => setSmsTemplateDriverAssigned(e.target.value)}
                                    placeholder="Company: Driver Assigned.\n{driver_name} is on the way in {vehicle_details}.\nCall: {driver_phone}"
                                    className="bg-background/50 border-input text-foreground h-20 resize-none"
                                />
                            </div>
                            <div>
                                <Label className="text-muted-foreground font-medium text-xs uppercase tracking-wider mb-2 block">Driver Arrived SMS</Label>
                                <Textarea
                                    value={smsTemplateDriverArrived}
                                    onChange={(e) => setSmsTemplateDriverArrived(e.target.value)}
                                    placeholder="Company: Driver Arrived.\n{driver_name} is waiting outside in {vehicle_details}.\nCall: {driver_phone}"
                                    className="bg-background/50 border-input text-foreground h-20 resize-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Data & Privacy */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 pb-4 border-b border-border/50">
                    <div className="xl:col-span-1">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-rose-600 dark:text-rose-500 mb-2">
                            <ShieldCheck className="w-5 h-5" />
                            Data & Privacy
                        </h2>
                        <p className="text-sm text-muted-foreground leading-relaxed pr-6">
                            Export a complete raw JSON backup of your workspace at any time.
                        </p>
                    </div>
                    
                    <div className="xl:col-span-2">
                        <div className="bg-rose-50/50 dark:bg-rose-950/20 p-6 sm:p-8 rounded-xl border border-rose-200/50 dark:border-rose-900/50 shadow-sm flex items-center justify-between">
                            <div className="pr-8">
                                <h3 className="font-medium text-rose-900 dark:text-rose-300">Anti-Ransom Guarantee</h3>
                                <p className="text-sm text-rose-700/80 dark:text-rose-400/80 mt-1">
                                    Your data belongs to you. Download everything instantly.
                                </p>
                            </div>
                            <Button 
                                onClick={handleExportData}
                                disabled={isExporting}
                                className="bg-rose-600 hover:bg-rose-700 text-white shadow-sm shrink-0"
                            >
                                {isExporting ? 'Bundling...' : 'Export JSON'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
            
            {/* Save Bar */}
            <div className="sticky bottom-0 mt-12 p-4 -mx-6 md:-mx-10 border-t border-border/60 bg-background/80 backdrop-blur-md flex justify-between items-center z-10 shadow-[0_-4px_20px_-15px_rgba(0,0,0,0.1)]">
                <div className="pl-6 md:pl-10 text-sm text-muted-foreground font-medium hidden sm:block">
                    Remember to save your changes.
                </div>
                <div className="pr-6 md:pr-10 w-full sm:w-auto">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        size="lg"
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium px-10 w-full shadow-md transition-transform active:scale-95"
                    >
                        {saving ? 'Saving...' : 'Save Settings'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
