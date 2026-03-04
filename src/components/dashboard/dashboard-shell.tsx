/* eslint-disable */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Menu, LayoutDashboard, Settings, Users, Car, FileText, Bell, Phone, CreditCard, Map, Building2, Calculator, LogOut, User as UserIcon, MessageSquare } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "next-auth/react";

export function DashboardShell({ children, userName, tenantSlug, userRole, isImpersonating }: { children: React.ReactNode, userName: string, tenantSlug: string, userRole: string, isImpersonating?: boolean }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();
    const { data: session, update } = useSession();

    // Explicit Role Check
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole as string);

    // Explicit Permission Evaluator (Session user holds permissions array now)
    const activeUser = session?.user as any;
    const userPermissions: string[] = activeUser?.permissions || [];
    const hasPermission = (permission_id: string) => isAdmin || userPermissions.includes(permission_id);

    const NavItem = ({ href, icon: Icon, label }: { href: string, icon: any, label: string }) => {
        const isActive = pathname === href;
        return (
            <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-blue-700/10 text-blue-700' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200'}`}>
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{label}</span>
            </Link>
        );
    };

    const handleLogout = async () => {
        await signOut({ redirect: false });
        window.location.href = '/login';
    };

    return (
        <div className="flex h-screen w-full bg-white text-slate-900 overflow-hidden font-sans">
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetContent side="left" className="w-64 bg-slate-100 border-r border-slate-200 p-0">
                    <div className="h-16 flex items-center px-6 border-b border-slate-200">
                        <SheetTitle className="font-bold text-lg tracking-wider text-slate-900">ADMIN MENU</SheetTitle>
                    </div>
                    <div className="p-4 flex flex-col gap-1">
                        <NavItem href="/dashboard" icon={LayoutDashboard} label="Console" />
                        <NavItem href="/dashboard/bookings" icon={FileText} label="All Bookings" />
                        <NavItem href="/dashboard/drivers" icon={Users} label="Drivers" />
                        <NavItem href="/dashboard/vehicles" icon={Car} label="Vehicles" />

                        <div className="my-2 border-t border-slate-200"></div>
                        <NavItem href="/dashboard/support" icon={MessageSquare} label="AI Support Desk" />

                        {/* Granular Feature Access */}
                        {(hasPermission('view_reports') || hasPermission('manage_pricing') || hasPermission('manage_zones') || hasPermission('manage_accounts') || hasPermission('manage_billing')) && (
                            <div className="my-2 border-t border-slate-200"></div>
                        )}

                        {hasPermission('view_reports') && <NavItem href="/dashboard/reports" icon={FileText} label="Reports & Analytics" />}
                        {hasPermission('manage_pricing') && <NavItem href="/dashboard/pricing" icon={Calculator} label="Pricing & Tariffs" />}
                        {hasPermission('manage_zones') && <NavItem href="/dashboard/zones" icon={Map} label="Zones" />}
                        {hasPermission('manage_accounts') && <NavItem href="/dashboard/accounts" icon={Building2} label="Corporate Accounts" />}
                        {hasPermission('manage_billing') && <NavItem href="/dashboard/invoices" icon={CreditCard} label="Billing & Invoicing" />}

                        {isAdmin && (
                            <>
                                <div className="my-2 border-t border-slate-200"></div>
                                <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
                                <NavItem href="/dashboard/settings/billing" icon={CreditCard} label="SaaS Subscription" />
                                <NavItem href="/dashboard/team" icon={Users} label="Team & Access" />
                            </>
                        )}

                        {userRole === 'SUPER_ADMIN' && (
                            <>
                                <div className="my-2 border-t border-slate-200"></div>
                                <div className="px-3 py-1 text-xs font-bold text-slate-400 uppercase tracking-wider">Super Admin</div>
                                <NavItem href="/admin/tenants" icon={Building2} label="Multi-Tenant Config" />
                            </>
                        )}

                        <div className="my-2 border-t border-slate-200"></div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-red-400 hover:text-red-300 hover:bg-slate-200 w-full text-left"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="text-sm font-medium">Log Out</span>
                        </button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* MAIN AREA */}
            <div className="flex-1 flex flex-col">
                {isImpersonating && (
                    <div className="bg-blue-700 text-black px-4 py-1 text-xs font-bold text-center flex items-center justify-center gap-2">
                        <span>VIEWING AS {tenantSlug.toUpperCase()}</span>
                        <Button
                            variant="link"
                            className="h-auto p-0 text-black underline hover:no-underline"
                            onClick={async () => {
                                await update({ stopImpersonation: true });
                                window.location.href = "/admin/tenants";
                            }}
                        >
                            EXIT VIEW
                        </Button>
                    </div>
                )}
                {/* GLOBAL HEADER */}
                <header className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-slate-100 backdrop-blur-md z-50 shrink-0">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="text-slate-500 hover:text-slate-900">
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="bg-blue-700 h-6 w-6 rounded flex items-center justify-center font-bold text-black text-xs">D</div>
                            <span className="font-bold tracking-wide text-sm hidden md:inline">DISPATCH<span className="text-blue-700">.SAAS</span></span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end mr-4">
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-bold text-emerald-600 tracking-wider">SYSTEM ONLINE</span>
                            </div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-slate-200 border border-slate-200 flex items-center justify-center p-0 hover:bg-zinc-700">
                                    <span className="text-xs font-bold">{userName.charAt(0)}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 bg-slate-100 border-slate-200 text-slate-900" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{userName}</p>
                                        <p className="text-xs leading-none text-slate-500">{tenantSlug}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem asChild className="cursor-pointer focus:bg-blue-700/10 focus:text-blue-700">
                                    <Link href="/dashboard/profile">
                                        <UserIcon className="mr-2 h-4 w-4" />
                                        <span>My Profile & Security</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-white/10" />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-400 focus:text-red-400 focus:bg-red-400/10 cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* CONTENT */}
                <main className="flex-1 overflow-hidden relative">
                    {children}
                </main>
            </div>
        </div>
    );
}

