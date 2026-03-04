"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Building, Activity } from "lucide-react";

export default function TenantCard({ tenant }: { tenant: any }) {
    const { update } = useSession();
    const router = useRouter();

    const handleImpersonate = async () => {
        await update({
            impersonateTenantId: tenant.id,
            impersonateTenantSlug: tenant.slug
        });
        router.push("/dashboard");
    };

    return (
        <Card className="bg-slate-100 border-slate-200 text-slate-900">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Building className="w-4 h-4 text-slate-400" />
                        {tenant.name}
                    </CardTitle>
                    <Badge variant="outline" className="border-slate-300 text-slate-500">
                        {tenant.slug}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400">Users</span>
                        <span className="font-mono text-xl">{tenant._count.users}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400">Drivers</span>
                        <span className="font-mono text-xl">{tenant._count.drivers}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400">Jobs</span>
                        <span className="font-mono text-xl">{tenant._count.jobs}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-slate-400">Active</span>
                        <span className="flex items-center gap-1 text-green-500 text-sm mt-1">
                            <Activity className="w-3 h-3" />
                            Live
                        </span>
                    </div>
                </div>
                <div className="pt-4 border-t border-slate-200 flex justify-end gap-2">
                    <Link href={`/admin/tenants/${tenant.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs hover:bg-slate-200">
                            Configure
                        </Button>
                    </Link>
                    <Button onClick={handleImpersonate} variant="outline" size="sm" className="h-8 text-xs border-slate-300 hover:bg-slate-200">
                        View Dashboard
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
