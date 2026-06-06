/* eslint-disable */
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Menu, LayoutDashboard, Settings, Users, Car, FileText, Bell, Phone, CreditCard, Map, Building2, Calculator, LogOut, User as UserIcon, MessageSquare, Sparkles, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "next-auth/react";
import { createClient } from '@/utils/supabase/client';
import { toast } from 'sonner';

export function DashboardShell({ children, userName, tenantSlug, userRole, isImpersonating, hasSchoolContracts = false, hasDataImport = false }: { children: React.ReactNode, userName: string, tenantSlug: string, userRole: string, isImpersonating?: boolean, hasSchoolContracts?: boolean, hasDataImport?: boolean }) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const pathname = usePathname();
    const { data: session, update } = useSession();

    const [isFleetOpen, setIsFleetOpen] = useState(() => {
        return pathname.startsWith('/dashboard/drivers') || 
               pathname.startsWith('/dashboard/vehicles') || 
               pathname.startsWith('/dashboard/compliance') ||
               pathname.startsWith('/dashboard/staff/pas');
    });

    useEffect(() => {
        if (
            pathname.startsWith('/dashboard/drivers') || 
            pathname.startsWith('/dashboard/vehicles') || 
            pathname.startsWith('/dashboard/compliance') ||
            pathname.startsWith('/dashboard/staff/pas')
        ) {
            setIsFleetOpen(true);
        }
    }, [pathname]);

    // Explicit Role Check
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(userRole as string);

    // Explicit Permission Evaluator (Session user holds permissions array now)
    const activeUser = session?.user as any;
    const userPermissions: string[] = activeUser?.permissions || [];
    const hasPermission = (permission_id: string) => isAdmin || userPermissions.includes(permission_id);
    const tenantId = activeUser?.tenantId;

    useEffect(() => {
        if (!tenantId) return;

        try {
            const supabase = createClient();
            const channel = supabase.channel(`operator-alerts-${tenantId}`);

            channel.on('broadcast', { event: 'new-alert' }, (payload: any) => {
                const data = payload.payload;
                if (data) {
                    toast.info(`⚠️ AI Alert: ${data.message}`, {
                        duration: 8000,
                        action: data.bookingId ? {
                            label: 'View Booking',
                            onClick: () => {
                                // Navigate to bookings search
                                window.location.href = `/dashboard/bookings?search=${data.bookingId}`;
                            }
                        } : undefined
                    });
                }
            });

            channel.subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        } catch (err) {
            console.error('[Dashboard Alerts WebSockets] Setup failed:', err);
        }
    }, [tenantId]);

    const NavItem = ({ href, icon: Icon, label, target }: { href: string, icon: any, label: string, target?: string }) => {
        const isActive = pathname === href;
        return (
            <Link href={href} target={target} onClick={() => setIsSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-200 ${isActive ? 'bg-primary text-primary-foreground font-semibold shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-accent/80'}`}>
                <Icon className="h-4.5 w-4.5 shrink-0" />
                <span className="text-sm font-medium tracking-wide flex items-center gap-1.5">
                    {label} {target === '_blank' && <ExternalLink className="w-3 h-3 opacity-60" />}
                </span>
            </Link>
        );
    };

    const CollapsibleNavGroup = ({ 
        label, 
        icon: Icon, 
        isOpen, 
        setIsOpen, 
        children 
    }: { 
        label: string, 
        icon: any, 
        isOpen: boolean, 
        setIsOpen: (val: boolean) => void, 
        children: React.ReactNode 
    }) => {
        return (
            <div className="flex flex-col gap-1">
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center justify-between w-full px-3 py-2.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/80 transition-all duration-200 cursor-pointer"
                >
                    <div className="flex items-center gap-3">
                        <Icon className="h-4.5 w-4.5 shrink-0" />
                        <span className="text-sm font-medium tracking-wide">{label}</span>
                    </div>
                    {isOpen ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground/70" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70" />}
                </button>
                {isOpen && (
                    <div className="pl-6 flex flex-col gap-1 border-l border-border/60 ml-[21px] mt-1 transition-all duration-200 animate-in fade-in slide-in-from-top-1">
                        {children}
                    </div>
                )}
            </div>
        );
    };

    const handleLogout = async () => {
        await signOut({ redirect: false });
        window.location.href = '/login';
    };

    const NavLinks = () => (
        <>
            <NavItem href="/dashboard" icon={LayoutDashboard} label="Console" />
            <NavItem href="/dashboard/bookings" icon={FileText} label="All Bookings" />
            
            {hasSchoolContracts && (
                <NavItem href="/dashboard/contracts" icon={Building2} label="School Contracts" />
            )}
            
            <CollapsibleNavGroup label="Fleet Management" icon={Users} isOpen={isFleetOpen} setIsOpen={setIsFleetOpen}>
                <NavItem href="/dashboard/drivers" icon={Users} label="Drivers" />
                
                {hasSchoolContracts && (
                    <NavItem href="/dashboard/staff/pas" icon={UserIcon} label="Passenger Assistants" />
                )}
                
                <NavItem href="/dashboard/vehicles" icon={Car} label="Vehicles" />
                <NavItem href="/dashboard/compliance" icon={FileText} label="Compliance" />
            </CollapsibleNavGroup>

            <div className="my-2 border-t border-border"></div>
            <NavItem href="/dashboard/support" icon={MessageSquare} label="AI Support Desk" />
            <NavItem href="/dashboard/logs" icon={FileText} label="Audit & VoIP Logs" />

            {/* Granular Feature Access */}
            {(hasPermission('view_reports') || hasPermission('manage_pricing') || hasPermission('manage_zones') || hasPermission('manage_accounts') || hasPermission('manage_billing')) && (
                <div className="my-2 border-t border-border"></div>
            )}

            {hasPermission('view_reports') && (
                <>
                    <NavItem href="/dashboard/reports" icon={FileText} label="Reports & Analytics" />
                    <NavItem href="/dashboard/reports/operator" icon={Phone} label="Call Center Floor" />
                    <NavItem href="/dashboard/wallboard" icon={LayoutDashboard} label="Live Wallboard" />
                    <NavItem href="/dashboard/map" icon={Map} label="Standalone Map" target="_blank" />
                </>
            )}
            {hasPermission('manage_pricing') && <NavItem href="/dashboard/pricing" icon={Calculator} label="Pricing & Tariffs" />}
            {hasPermission('manage_zones') && <NavItem href="/dashboard/zones" icon={Map} label="Zones" />}
            {hasPermission('manage_accounts') && <NavItem href="/dashboard/accounts" icon={Building2} label="Corporate Accounts" />}
            {hasPermission('manage_billing') && <NavItem href="/dashboard/invoices" icon={CreditCard} label="Billing & Invoicing" />}

            {isAdmin && (
                <>
                    <div className="my-2 border-t border-border"></div>
                    <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
                    <NavItem href="/dashboard/settings/ai" icon={Sparkles} label="AI Agents" />
                    {hasDataImport && <NavItem href="/dashboard/settings/import" icon={FileText} label="Data Migration Hub" />}
                    <NavItem href="/dashboard/settings/billing" icon={CreditCard} label="SaaS Subscription" />
                    <NavItem href="/dashboard/team" icon={Users} label="Team & Access" />
                </>
            )}

            {userRole === 'SUPER_ADMIN' && (
                <>
                    <div className="my-2 border-t border-border"></div>
                    <div className="px-3 py-1 text-xs font-bold text-muted-foreground uppercase tracking-wider">Super Admin</div>
                    <NavItem href="/admin/tenants" icon={Building2} label="Multi-Tenant Config" />
                </>
            )}

            <div className="my-2 border-t border-border"></div>
            <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-red-500 hover:text-red-600 hover:bg-red-500/10 w-full text-left cursor-pointer"
            >
                <LogOut className="h-4.5 w-4.5" />
                <span className="text-sm font-medium">Log Out</span>
            </button>
        </>
    );

    return (
        <div className="flex h-screen w-full bg-background text-foreground overflow-hidden font-sans">
            {/* Sheet/Drawer for all devices */}
            <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                <SheetContent side="left" className="w-64 bg-card border-r border-border p-0">
                    <div className="h-16 flex items-center px-6 border-b border-border">
                        <SheetTitle className="font-bold text-lg tracking-wider text-foreground">ADMIN MENU</SheetTitle>
                    </div>
                    <div className="p-4 flex flex-col gap-1 overflow-y-auto h-[calc(100vh-4rem)] pb-20 custom-scrollbar">
                        <NavLinks />
                    </div>
                </SheetContent>
            </Sheet>

            {/* MAIN AREA */}
            <div className="flex-1 flex flex-col min-w-0">
                {isImpersonating && (
                    <div className="bg-indigo-600 text-white px-4 py-1.5 text-xs font-bold text-center flex items-center justify-center gap-2 z-50 shrink-0">
                        <span>VIEWING AS {tenantSlug.toUpperCase()}</span>
                        <Button
                            variant="link"
                            className="h-auto p-0 text-white font-extrabold underline hover:no-underline"
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
                <header className="relative h-14 border-b border-border flex items-center justify-between px-4 bg-card/95 backdrop-blur-md z-50 shrink-0">
                    {/* Brand Gradient Top Bar */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-brand-gradient" />
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)} className="text-muted-foreground hover:text-foreground">
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="flex items-center gap-2">
                            <img src="/logo-full.png" alt="CabAI" className="h-10 md:h-12 object-contain" />
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
                                <Button variant="ghost" className="relative h-8 w-8 rounded-full bg-accent border border-border flex items-center justify-center p-0 hover:bg-accent/80">
                                    <span className="text-xs font-bold">{userName.charAt(0)}</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="w-56 bg-popover border-border text-popover-foreground" align="end" forceMount>
                                <DropdownMenuLabel className="font-normal">
                                    <div className="flex flex-col space-y-1">
                                        <p className="text-sm font-medium leading-none">{userName}</p>
                                        <p className="text-xs leading-none text-muted-foreground">{tenantSlug}</p>
                                    </div>
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-border" />
                                <DropdownMenuItem asChild className="cursor-pointer focus:bg-accent focus:text-accent-foreground">
                                    <Link href="/dashboard/profile">
                                        <UserIcon className="mr-2 h-4 w-4" />
                                        <span>My Profile & Security</span>
                                    </Link>
                                </DropdownMenuItem>
                                <DropdownMenuSeparator className="bg-border" />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-500 focus:text-red-600 focus:bg-red-500/10 cursor-pointer">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Log out</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </header>

                {/* CONTENT */}
                <main className="flex-1 overflow-hidden relative bg-background">
                    {children}
                </main>
            </div>
        </div>
    );
}

