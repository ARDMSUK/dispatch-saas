"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard } from "lucide-react";
import Link from "next/link";

interface BillingLockoutOverlayProps {
    status: string;
}

export function BillingLockoutOverlay({ status }: BillingLockoutOverlayProps) {
    const pathname = usePathname();

    // The user is allowed to access the billing page and the admin page (if they are super admin, but that's a different root)
    if (status === "ACTIVE" || status === "TRIALING") {
        return null;
    }

    // Don't block if they are currently on the billing page trying to fix it
    if (pathname.includes("/dashboard/settings/billing")) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm">
            <div className="max-w-md w-full bg-white rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-red-500 p-6 flex items-center justify-center text-white">
                    <AlertCircle className="h-12 w-12" />
                </div>
                <div className="p-8 text-center space-y-4">
                    <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-rose-500">
                        Platform Access Suspended
                    </h2>
                    <p className="text-slate-600">
                        Your dispatch application has been paused due to a billing issue on your subscription.
                        Please update your payment method to restore full dispatch capabilities immediately.
                    </p>

                    <div className="pt-6 border-t mt-4 gap-3 flex flex-col items-center">
                        <Link href="/dashboard/settings/billing" className="w-full">
                            <Button className="w-full bg-red-600 hover:bg-red-700" size="lg">
                                <CreditCard className="mr-2 h-4 w-4" />
                                Go to Billing Settings
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
