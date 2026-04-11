"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Server, Database, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SuperAdminSettingsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">System Settings</h2>
                <p className="text-slate-500">Manage global platform configurations and infrastructure.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-500" />
                            Platform Branding
                        </CardTitle>
                        <CardDescription>Global white-label settings for the Super Admin panel.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Platform Name</label>
                            <input 
                                type="text" 
                                className="w-full p-2 border rounded-md" 
                                defaultValue="Cabot AI SaaS Platform"
                                disabled
                            />
                        </div>
                        <Button disabled>Coming Soon</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Server className="w-5 h-5 text-indigo-500" />
                            Global Infrastructure
                        </CardTitle>
                        <CardDescription>Master API keys used as fallback for all tenants.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">Global AviationStack API Key</label>
                            <input 
                                type="password" 
                                className="w-full p-2 border rounded-md" 
                                placeholder="••••••••••••••••"
                                disabled
                            />
                        </div>
                        <Button disabled>Coming Soon</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-emerald-500" />
                            Database Maintenance
                        </CardTitle>
                        <CardDescription>Run sweeping commands across the tenant database.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Warning: Actions here affect all tenants globally.
                        </p>
                        <Button variant="destructive" disabled>Clear Orphaned Logs</Button>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Shield className="w-5 h-5 text-red-500" />
                            Access Control
                        </CardTitle>
                        <CardDescription>Manage Super Admin access and security protocols.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-sm text-slate-600">
                            Current Role: <span className="font-bold text-slate-900">SUPER_ADMIN</span>
                        </p>
                        <Button disabled>Manage Admins</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
