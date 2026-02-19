import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Building, Users, Activity } from "lucide-react";

export default async function TenantsPage() {
    const tenants = await prisma.tenant.findMany({
        include: {
            _count: {
                select: { users: true, drivers: true, vehicles: true, jobs: true }
            }
        },
        orderBy: { createdAt: 'desc' }
    });

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Tenants</h2>
                    <p className="text-zinc-400">Manage taxi companies and their configurations.</p>
                </div>
                <Link href="/admin/tenants/new">
                    <Button className="bg-white text-black hover:bg-zinc-200">
                        <Plus className="w-4 h-4 mr-2" />
                        Onboard Tenant
                    </Button>
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {tenants.map(tenant => (
                    <Card key={tenant.id} className="bg-zinc-900 border-zinc-800 text-zinc-100">
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
                                <Link href="/dashboard">
                                    <Button variant="outline" size="sm" className="h-8 text-xs border-zinc-700 hover:bg-zinc-800">
                                        View Dashboard
                                    </Button>
                                </Link>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {tenants.length === 0 && (
                    <div className="col-span-full py-12 text-center text-zinc-500 border border-dashed border-zinc-800 rounded-lg">
                        <Building className="w-12 h-12 mx-auto mb-4 opacity-20" />
                        <p>No tenants found. Start by onboarding a new company.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
