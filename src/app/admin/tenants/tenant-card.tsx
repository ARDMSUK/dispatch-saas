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
        <Card className="bg-zinc-900 border-zinc-800 text-zinc-100">
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Building className="w-4 h-4 text-zinc-500" />
                        {tenant.name}
                    </CardTitle>
                    <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                        {tenant.slug}
                    </Badge>
                </div>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 gap-4 py-2">
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500">Users</span>
                        <span className="font-mono text-xl">{tenant._count.users}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500">Drivers</span>
                        <span className="font-mono text-xl">{tenant._count.drivers}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500">Jobs</span>
                        <span className="font-mono text-xl">{tenant._count.jobs}</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-zinc-500">Active</span>
                        <span className="flex items-center gap-1 text-green-500 text-sm mt-1">
                            <Activity className="w-3 h-3" />
                            Live
                        </span>
                    </div>
                </div>
                <div className="pt-4 border-t border-zinc-800 flex justify-end gap-2">
                    <Link href={`/admin/tenants/${tenant.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs hover:bg-zinc-800">
                            Configure
                        </Button>
                    </Link>
                    <Button onClick={handleImpersonate} variant="outline" size="sm" className="h-8 text-xs border-zinc-700 hover:bg-zinc-800">
                        View Dashboard
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
