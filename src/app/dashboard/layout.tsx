import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GoogleMapsLoader } from "@/components/dashboard/google-maps-loader";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();
    const userName = session?.user?.name || "Operator";
    const tenantSlug = session?.user?.tenantSlug || "DEV";

    const role = session?.user?.role || "DISPATCHER";

    return (
        <DashboardShell userName={userName} tenantSlug={tenantSlug} userRole={role}>
            <GoogleMapsLoader>
                {children}
            </GoogleMapsLoader>
        </DashboardShell>
    );
}
