"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, CreditCard } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";

interface BillingProps {
    tenantId: string;
    status: string;
    plan: string | null;
    hasCustomerProfile: boolean;
}

export function BillingSettingsClient({ tenantId, status, plan, hasCustomerProfile }: BillingProps) {
    const [isLoading, setIsLoading] = useState(false);

    // Hardcoded production Price ID for the SaaS plan
    // In reality, this would be fetched from the DB or env vars
    const CORE_PLAN_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID || "price_1EXAMPLE";

    const handleCheckout = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ priceId: CORE_PLAN_PRICE_ID }),
            });
            const data = await res.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error(data.error || "Failed to initiate checkout");
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Checkout error:", error);
            toast.error("Checkout failed. Please try again later.");
            setIsLoading(false);
        }
    };

    const handlePortal = async () => {
        setIsLoading(true);
        try {
            const res = await fetch("/api/stripe/portal", {
                method: "POST",
            });
            const data = await res.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                toast.error(data.error || "Failed to load billing portal");
                setIsLoading(false);
            }
        } catch (error) {
            console.error("Portal error:", error);
            toast.error("Could not access billing portal.");
            setIsLoading(false);
        }
    };

    const getStatusDisplay = () => {
        switch (status) {
            case "ACTIVE":
                return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Active Subscription</Badge>;
            case "PAST_DUE":
                return <Badge variant="destructive">Payment Failed. Update Required.</Badge>;
            case "CANCELED":
                return <Badge variant="outline" className="text-slate-500">Canceled</Badge>;
            case "TRIALING":
            default:
                return <Badge variant="secondary">Trial Period</Badge>;
        }
    };

    return (
        <div className="space-y-6 max-w-4xl">
            {(status === "PAST_DUE" || status === "CANCELED") && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription>
                        Your account subscription is currently inactive. Dispatch functionality may be disabled until your billing is updated.
                    </AlertDescription>
                </Alert>
            )}

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Current Plan Overview</CardTitle>
                            <CardDescription>Your plan features and usage limits.</CardDescription>
                        </div>
                        {getStatusDisplay()}
                    </div>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex flex-col gap-4">
                        <div className="grid grid-cols-2 gap-4 border rounded-lg p-4 bg-slate-50/50">
                            <div>
                                <p className="text-sm font-medium text-slate-500">Plan</p>
                                <p className="text-lg font-semibold">{plan || "Dispatch Core Platform"}</p>
                            </div>
                            <div>
                                <p className="text-sm font-medium text-slate-500">Billing Cycle</p>
                                <p className="text-lg font-semibold">Monthly</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-medium text-sm">Included in this plan:</h4>
                            <ul className="space-y-2 text-sm text-slate-600">
                                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Unlimited Drivers & Vehicles</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Advanced Dynamic Pricing Matrix</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> B2B Corporate Invoicing Portal</li>
                                <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Live Flight Tracking API hook</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3 border-t bg-slate-50 p-4">
                    {hasCustomerProfile ? (
                        <Button variant="outline" onClick={handlePortal} disabled={isLoading}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Manage Billing & Invoices
                        </Button>
                    ) : (
                        <Button onClick={handleCheckout} disabled={isLoading}>
                            Subscribe Now
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </div>
    );
}
