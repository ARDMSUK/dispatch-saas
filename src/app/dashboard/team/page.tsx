"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, KeyRound, Shield, User } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface UserType {
    id: string;
    name: string;
    email: string;
    role: "ADMIN" | "DISPATCHER" | "SUPER_ADMIN";
    permissions?: string[];
    sipExtension?: string | null;
    createdAt: string;
}

const AVAILABLE_PERMISSIONS = [
    { id: 'view_reports', label: 'Reports & Analytics' },
    { id: 'manage_pricing', label: 'Pricing & Tariffs' },
    { id: 'manage_zones', label: 'Zones' },
    { id: 'manage_accounts', label: 'Corporate Accounts' },
    { id: 'manage_billing', label: 'Billing & Invoices' }
];

export default function TeamPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        id: "",
        name: "",
        email: "",
        password: "",
        role: "DISPATCHER" as "ADMIN" | "DISPATCHER",
        permissions: [] as string[],
        sipExtension: ""
    });

    const resetForm = () => {
        setFormData({ id: "", name: "", email: "", password: "", role: "DISPATCHER", permissions: [], sipExtension: "" });
    };

    useEffect(() => {
        if (session?.user && !['ADMIN', 'SUPER_ADMIN'].includes(session.user.role as string)) {
            // Redirect or show access denied?
            // The API protects data anyway, but let's be nice.
            // router.push('/dashboard'); 
        }
        fetchUsers();
    }, [session]);

    const fetchUsers = async () => {
        try {
            const res = await fetch("/api/users");
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error("Failed to fetch users", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.name || !formData.email || (!formData.id && !formData.password)) {
            toast.error("Please fill in all required fields");
            return;
        }

        try {
            const url = formData.id ? `/api/users/${formData.id}` : "/api/users";
            const method = formData.id ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success(formData.id ? "Team member updated" : "Team member added successfully");
                setIsDialogOpen(false);
                resetForm();
                fetchUsers();
            } else {
                const error = await res.json();
                toast.error(error.message || error.error);
            }
        } catch (error) {
            toast.error("Failed to save user");
        }
    };

    const handleEdit = (user: UserType) => {
        setFormData({
            id: user.id,
            name: user.name,
            email: user.email,
            password: "", // Don't show existing password
            role: user.role === 'SUPER_ADMIN' ? 'ADMIN' : user.role, // Fallback for UI
            permissions: user.permissions || [],
            sipExtension: user.sipExtension || ""
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (id === session?.user?.id) {
            toast.error("You cannot delete yourself!");
            return;
        }

        if (!confirm(`Are you sure you want to remove ${name}? They will lose access immediately.`)) return;

        try {
            const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("User removed");
                fetchUsers();
            } else {
                toast.error("Failed to remove user");
            }
        } catch (error) {
            toast.error("Error deleting user");
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-6 bg-background text-foreground gap-4 overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground tracking-tight">Team & Access</h1>
                    <p className="text-muted-foreground text-sm">Manage staff access and roles.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                }}>
                    <DialogTrigger asChild>
                        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium" onClick={resetForm}>
                            <Plus className="mr-2 h-4 w-4" /> Add Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border text-foreground">
                        <DialogHeader>
                            <DialogTitle className="text-foreground">{formData.id ? "Edit Team Member" : "Add New Team Member"}</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Full Name</label>
                                <Input
                                    placeholder="e.g. John Doe"
                                    className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Email Address</label>
                                <Input
                                    type="email"
                                    placeholder="john@example.com"
                                    className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    disabled={!!formData.id}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">SIP Extension (Optional)</label>
                                <Input
                                    type="text"
                                    placeholder="e.g. 1001"
                                    className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                    value={formData.sipExtension}
                                    onChange={e => setFormData({ ...formData, sipExtension: e.target.value })}
                                />
                                <p className="text-xs text-muted-foreground">Used to route calls from desk phones to this user.</p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Password {formData.id && "(Leave blank to keep existing)"}</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="bg-background border-input text-foreground placeholder:text-muted-foreground"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-muted-foreground">Role</label>
                                <select
                                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                >
                                    <option value="DISPATCHER">Dispatcher (Staff)</option>
                                    <option value="ADMIN">Admin (Manager)</option>
                                </select>
                                <p className="text-xs text-muted-foreground">
                                    {['ADMIN', 'SUPER_ADMIN'].includes(formData.role)
                                        ? "Full access to settings, pricing, and team management."
                                        : "Can create bookings and view drivers/vehicles only."}
                                </p>
                            </div>

                            {formData.role === 'DISPATCHER' && (
                                <div className="space-y-3 pt-2 border-t border-border mt-2">
                                    <label className="text-sm font-medium text-muted-foreground">Extra Permissions</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {AVAILABLE_PERMISSIONS.map(perm => (
                                            <label key={perm.id} className="flex items-center space-x-2 text-sm text-foreground cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-input bg-background text-primary focus:ring-ring"
                                                    checked={formData.permissions.includes(perm.id)}
                                                    onChange={(e) => {
                                                        const newPerms = e.target.checked
                                                            ? [...formData.permissions, perm.id]
                                                            : formData.permissions.filter(p => p !== perm.id);
                                                        setFormData({ ...formData, permissions: newPerms });
                                                    }}
                                                />
                                                <span>{perm.label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <p className="text-xs text-muted-foreground italic">These allow specific access without granting full Admin rights.</p>
                                </div>
                            )}

                            <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium mt-2">
                                {formData.id ? "Update Account" : "Create Account"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="overflow-hidden bg-card border border-border shadow-sm rounded-lg">
                <Table>
                    <TableHeader className="bg-muted/50 border-b border-border">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="text-muted-foreground font-semibold">User</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Role</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Joined</TableHead>
                            <TableHead className="text-right text-muted-foreground font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading team...</TableCell>
                            </TableRow>
                        ) : filteredUsers.map((user) => (
                            <TableRow key={user.id} className="border-border hover:bg-muted/50 transition-colors">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-foreground">{user.name}</span>
                                        <span className="text-xs text-muted-foreground">{user.email}</span>
                                        {user.sipExtension && <span className="text-xs text-primary font-mono mt-0.5">Ext: {user.sipExtension}</span>}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-col gap-1 items-start">
                                        <Badge variant="outline" className={['ADMIN', 'SUPER_ADMIN'].includes(user.role) ? 'border-primary text-primary' : 'border-border text-muted-foreground'}>
                                            {['ADMIN', 'SUPER_ADMIN'].includes(user.role) ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                                            {user.role === 'SUPER_ADMIN' ? 'Admin' : (user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase())}
                                        </Badge>
                                        {user.role === 'DISPATCHER' && user.permissions && user.permissions.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {user.permissions.map(p => (
                                                    <span key={p} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded border border-border">
                                                        {AVAILABLE_PERMISSIONS.find(ap => ap.id === p)?.label || p}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground hover:text-foreground hover:bg-muted"
                                            onClick={() => handleEdit(user)}
                                        >
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        {user.id !== session?.user?.id && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                                onClick={() => handleDelete(user.id, user.name)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
