"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronRight, ChevronLeft, Building2, User, Key, Check } from "lucide-react";
import { useJsApiLoader, Autocomplete } from "@react-google-maps/api";

export default function NewTenantPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState({
        // Step 1: Company
        companyName: "",
        companySlug: "",
        companyEmail: "",
        address: "",
        lat: 0,
        lng: 0,

        // Step 2: Admin
        adminName: "",
        adminEmail: "",
        adminPassword: "",

        // Step 3: Keys (Optional)
        stripeSecretKey: "",
        stripePublishableKey: "",
        twilioAccountSid: "",
        twilioAuthToken: "",
        twilioFromNumber: "",
        resendApiKey: ""
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Auto-generate slug from name
        if (name === "companyName" && !formData.companySlug) {
            setFormData(prev => ({
                ...prev,
                companySlug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
            }));
        }
    };

    // Google Maps Hooks
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
        libraries: ["places"]
    });

    const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);

    const onLoad = (autoC: google.maps.places.Autocomplete) => setAutocomplete(autoC);

    const onPlaceChanged = () => {
        if (autocomplete) {
            const place = autocomplete.getPlace();
            if (place.geometry?.location) {
                setFormData(prev => ({
                    ...prev,
                    address: place.formatted_address || place.name || "",
                    lat: place.geometry!.location!.lat(),
                    lng: place.geometry!.location!.lng(),
                }));
            }
        }
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/tenants", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (res.ok) {
                toast.success("Tenant created successfully!");
                router.push("/admin/tenants");
                router.refresh();
            } else {
                const error = await res.json();
                toast.error(error.error || "Failed to create tenant");
            }
        } catch (error) {
            toast.error("Something went wrong");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto py-8">
            <h1 className="text-3xl font-bold mb-8">Onboard New Tenant</h1>

            {/* Steps Indicator */}
            <div className="flex justify-between mb-8 relative">
                <div className="absolute top-1/2 left-0 w-full h-0.5 bg-zinc-800 -z-10" />
                {[1, 2, 3].map((s) => (
                    <div key={s} className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${step >= s ? 'bg-amber-500 border-amber-500 text-black' : 'bg-zinc-950 border-zinc-700 text-zinc-500'}`}>
                        {step > s ? <Check className="w-5 h-5" /> : s}
                    </div>
                ))}
            </div>

            <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        {step === 1 && <><Building2 /> Company Details</>}
                        {step === 2 && <><User /> Initial Admin</>}
                        {step === 3 && <><Key /> Integrations (Optional)</>}
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">

                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Company Name *</label>
                                    <Input name="companyName" value={formData.companyName} onChange={handleChange} placeholder="e.g. Acme Taxis" className="bg-zinc-950 border-zinc-800" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Slug (subdomain) *</label>
                                    <Input name="companySlug" value={formData.companySlug} onChange={handleChange} placeholder="acme-taxis" className="bg-zinc-950 border-zinc-800" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Contact Email</label>
                                    <Input name="companyEmail" value={formData.companyEmail} onChange={handleChange} placeholder="contact@acme.com" className="bg-zinc-950 border-zinc-800" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Base Address</label>
                                    {isLoaded ? (
                                        <Autocomplete onLoad={onLoad} onPlaceChanged={onPlaceChanged}>
                                            <Input
                                                name="address"
                                                placeholder="Search base location..."
                                                value={formData.address}
                                                onChange={handleChange}
                                                className="bg-zinc-950 border-zinc-800"
                                            />
                                        </Autocomplete>
                                    ) : (
                                        <Input disabled placeholder="Loading maps..." className="bg-zinc-950 border-zinc-800" />
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Admin Name *</label>
                                <Input name="adminName" value={formData.adminName} onChange={handleChange} placeholder="John Doe" className="bg-zinc-950 border-zinc-800" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Admin Email *</label>
                                    <Input name="adminEmail" value={formData.adminEmail} onChange={handleChange} placeholder="admin@acme.com" className="bg-zinc-950 border-zinc-800" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Password *</label>
                                    <Input name="adminPassword" type="password" value={formData.adminPassword} onChange={handleChange} placeholder="••••••••" className="bg-zinc-950 border-zinc-800" />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-amber-500 uppercase tracking-wider">Stripe Payments</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Secret Key</label>
                                        <Input name="stripeSecretKey" type="password" value={formData.stripeSecretKey} onChange={handleChange} placeholder="sk_live_..." className="bg-zinc-950 border-zinc-800" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Publishable Key</label>
                                        <Input name="stripePublishableKey" value={formData.stripePublishableKey} onChange={handleChange} placeholder="pk_live_..." className="bg-zinc-950 border-zinc-800" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-blue-500 uppercase tracking-wider">Twilio SMS</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Account SID</label>
                                        <Input name="twilioAccountSid" value={formData.twilioAccountSid} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Auth Token</label>
                                        <Input name="twilioAuthToken" type="password" value={formData.twilioAuthToken} onChange={handleChange} className="bg-zinc-950 border-zinc-800" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">From Number (Verified)</label>
                                    <Input name="twilioFromNumber" value={formData.twilioFromNumber} onChange={handleChange} placeholder="+447..." className="bg-zinc-950 border-zinc-800" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-green-500 uppercase tracking-wider">Resend Email</h3>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">API Key</label>
                                    <Input name="resendApiKey" type="password" value={formData.resendApiKey} onChange={handleChange} placeholder="re_..." className="bg-zinc-950 border-zinc-800" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between pt-6 mt-4 border-t border-zinc-800">
                        <Button variant="ghost" disabled={step === 1} onClick={() => setStep(s => s - 1)}>
                            <ChevronLeft className="w-4 h-4 mr-2" /> Back
                        </Button>

                        {step < 3 ? (
                            <Button onClick={() => setStep(s => s + 1)} className="bg-amber-500 text-black hover:bg-amber-400">
                                Next <ChevronRight className="w-4 h-4 ml-2" />
                            </Button>
                        ) : (
                            <Button onClick={handleSubmit} disabled={loading} className="bg-green-600 text-white hover:bg-green-500">
                                {loading ? "Creating..." : "Create Tenant"}
                            </Button>
                        )}
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}
