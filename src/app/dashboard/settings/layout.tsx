import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AlertTriangle } from "lucide-react";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
    const session = await auth();

    if (!session || !session.user) {
        redirect('/login');
    }

    const allowedRoles = ['ADMIN', 'TENANT_ADMIN', 'OWNER', 'SUPER_ADMIN'];
    
    // Strict Admin check for settings
    if (!allowedRoles.includes(session.user.role as string)) {
        return (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                <AlertTriangle className="w-12 h-12 text-rose-500" />
                <h2 className="text-2xl font-bold text-slate-900">Access Denied (403)</h2>
                <p className="text-slate-500 max-w-md">
                    You do not have permission to access the organization settings. 
                    This area is restricted to Tenant Administrators and Owners.
                </p>
            </div>
        );
    }

    return <>{children}</>;
}
