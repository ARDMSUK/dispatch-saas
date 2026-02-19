/* eslint-disable */
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Menu, LayoutDashboard, Settings, Users, Car, FileText, Bell, Phone, CreditCard, Map, Building2, Calculator, LogOut, User as UserIcon } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";

export function DashboardShell({ children, userName, tenantSlug, userRole }: { children: React.ReactNode, userName: string, tenantSlug: string, userRole: string }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();

    const isAdmin = userRole === 'ADMIN';

    const NavItem = ({ href, icon: Icon, label }: { href: string, icon: any, label: string }) => {
        const isActive = pathname === href;
        return (
            <Link href={href} className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${isActive ? 'bg-amber-500/10 text-amber-500' : 'text-zinc-400 hover:text-white hover:bg-white/5'}`}>
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
        <div className="flex h-screen w-full bg-zinc-950 text-white overflow-hidden font-sans">
            {/* COLLAPSIBLE SIDEBAR (Sheet on Mobile, hidden by default on Desktop unless toggled? User said "click button to open") */}
            {/* We will use a Sheet for the "Admin Menu" as requested to keep it hidden */}

            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetContent side="left" className="w-64 bg-zinc-900 border-r border-white/5 p-0">
                    <div className="h-16 flex items-center px-6 border-b border-white/5">
                        <SheetTitle className="font-bold text-lg tracking-wider text-white">ADMIN MENU</SheetTitle>
                    </div>
                    <div className="p-4 flex flex-col gap-1">
                        <NavItem href="/dashboard" icon={LayoutDashboard} label="Console" />
                        <NavItem href="/dashboard/bookings" icon={FileText} label="All Bookings" />
                        <NavItem href="/dashboard/drivers" icon={Users} label="Drivers" />
                        <NavItem href="/dashboard/vehicles" icon={Car} label="Vehicles" />

                        {isAdmin && (
                            <>
                                <div className="my-2 border-t border-white/5"></div>
                                <NavItem href="/dashboard/pricing" icon={Calculator} label="Pricing & Tariffs" />
                                <NavItem href="/dashboard/zones" icon={Map} label="Zones" />
                                <NavItem href="/dashboard/accounts" icon={Building2} label="Corporate Accounts" />
                                <div className="my-2 border-t border-white/5"></div>
                                <div className="my-2 border-t border-white/5"></div>
                                <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
                            </>
                        )}

                        <div className="my-2 border-t border-white/5"></div>
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-red-400 hover:text-red-300 hover:bg-white/5 w-full text-left"
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="text-sm font-medium">Log Out</span>
                        </button>
                    </div>
                </SheetContent>
            </Sheet>

            {/* MAIN AREA */}
            <div className="flex-1 flex flex-col">
                {/* GLOBAL HEADER */}
                <header className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-zinc-900/50 backdrop-blur-md z-50 shrink-0">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="text-zinc-400 hover:text-white">
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <div className="bg-amber-500 h-6 w-6 rounded flex items-center justify-center font-bold text-black text-xs">D</div>
                            <span className="font-bold tracking-wide text-sm hidden md:inline">DISPATCH<span className="text-amber-500">.SAAS</span></span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex flex-col items-end mr-4">
                            <div className="flex items-center gap-2">
                                <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                                <span className="text-[10px] font-bold text-emerald-400 tracking-wider">SYSTEM ONLINE</span>
                            </div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-zinc-800 border border-white/10 flex items-center justify-center p-0 hover:bg-zinc-700">
                                    <span className="text-xs font-bold">{userName.charAt(0)}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 bg-zinc-900 border-white/10 text-white" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{userName}</p>
                                        <p className="text-xs leading-none text-zinc-400">{tenantSlug}</p>
                                    </div>
                                </DropdownMenuLabel>
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

