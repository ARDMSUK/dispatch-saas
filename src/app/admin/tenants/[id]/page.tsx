"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronLeft, Save, Building2, Key, Trash2 } from "lucide-react";

export default function TenantConfigPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [tenant, setTenant] = useState<any>(null);

    // Fetch Tenant Data
    useEffect(() => {
        fetch(`/api/admin/tenants/${params.id}`)
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    toast.error(data.error);
                } else {
                    setTenant(data);
                }
                setLoading(false);
            })
            .catch(() => {
                toast.error("Failed to load tenant");
                setLoading(false);
            });
    }, [params.id]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTenant({ ...tenant, [e.target.name]: e.target.value });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`/api/admin/tenants/${params.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(tenant),
            });

            if (res.ok) {
                toast.success("Configuration saved");
                router.refresh();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to save");
            }
        } catch (error) {
            toast.error("Error saving tenant");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-zinc-500">Loading...</div>;
    if (!tenant) return <div className="p-8 text-center text-red-500">Tenant not found</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" onClick={() => router.back()}>
                    <ChevronLeft className="w-4 h-4 mr-2" /> Back
                </Button>
                <h1 className="text-2xl font-bold">{tenant.name} Configuration</h1>
            </div>

            <div className="grid gap-6">
                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5" />
                            Company Details
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Name</label>
                                <Input name="name" value={tenant.name} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Slug</label>
                                <Input name="slug" value={tenant.slug} disabled className="bg-zinc-950 border-zinc-800 opacity-50 cursor-not-allowed" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Contact Email</label>
                            <Input name="email" value={tenant.email || ''} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Phone</label>
                                <Input name="phone" value={tenant.phone || ''} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Address</label>
                                <Input name="address" value={tenant.address || ''} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Key className="w-5 h-5" />
                            API Integrations
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Stripe</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Secret Key</label>
                                    <Input name="stripeSecretKey" type="password" value={tenant.stripeSecretKey || ''} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Publishable Key</label>
                                    <Input name="stripePublishableKey" value={tenant.stripePublishableKey || ''} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider">Twilio</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Account SID</label>
                                    <Input name="twilioAccountSid" value={tenant.twilioAccountSid || ''} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Auth Token</label>
                                    <Input name="twilioAuthToken" type="password" value={tenant.twilioAuthToken || ''} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">From Number</label>
                                <Input name="twilioFromNumber" value={tenant.twilioFromNumber || ''} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-sm font-bold text-green-500 uppercase tracking-wider">Resend</h3>
                            <div className="space-y-2">
                                <label className="text-sm font-medium">API Key</label>
                                <Input name="resendApiKey" type="password" value={tenant.resendApiKey || ''} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-between items-center pt-6 pb-20">
                <Button variant="destructive" className="bg-red-900/50 hover:bg-red-900 text-red-200">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Tenant
                </Button>

                <Button onClick={handleSave} disabled={saving} className="bg-green-600 text-white hover:bg-green-500 min-w-[150px]">
                    {saving ? "Saving..." : (
                        <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
}
