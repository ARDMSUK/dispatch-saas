import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ReportsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    if (!session) {
        redirect('/login');
    }

    const role = session?.user?.role || "DISPATCHER";
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(role);

    // Check granular permissions array
    const activeUser = session?.user as any;
    const permissions: string[] = activeUser?.permissions || [];
    const hasPermission = isAdmin || permissions.includes('view_reports');

    if (!hasPermission) {
        // Unauthorized users are redirected back to the main console
        redirect('/dashboard');
    }

    return <>{children}</>;
}
