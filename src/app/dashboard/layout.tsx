import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GoogleMapsLoader } from "@/components/dashboard/google-maps-loader";
import { CliPopListener } from "@/components/dispatch/cli-pop-listener";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BillingLockoutOverlay } from "@/components/dashboard/billing-lockout-overlay";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    if (session.user?.forcePasswordReset) {
        redirect('/auth/force-reset');
    }

    const userName = session?.user?.name || "Operator";
    const tenantSlug = session?.user?.tenantSlug || "DEV";

    const role = session?.user?.role || "DISPATCHER";

    const isImpersonating = session?.user?.isImpersonating || false;

    const tenant = await prisma.tenant.findUnique({
        where: { id: session.user.tenantId! },
        select: { subscriptionStatus: true }
    });

    const status = tenant?.subscriptionStatus || "TRIALING";

    return (
        <DashboardShell userName={userName} tenantSlug={tenantSlug} userRole={role} isImpersonating={isImpersonating}>
            <GoogleMapsLoader>
                {children}
                <CliPopListener />
            </GoogleMapsLoader>
        </DashboardShell>
    );
}
