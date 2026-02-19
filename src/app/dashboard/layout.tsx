import { auth } from "@/auth";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { GoogleMapsLoader } from "@/components/dashboard/google-maps-loader";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

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
