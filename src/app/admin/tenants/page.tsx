import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Building } from "lucide-react";
import TenantCard from "./tenant-card";

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
                    <TenantCard key={tenant.id} tenant={tenant} />
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
