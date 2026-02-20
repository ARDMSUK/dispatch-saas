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
    createdAt: string;
}

export default function TeamPage() {
    const { data: session } = useSession();
    const router = useRouter();
    const [users, setUsers] = useState<UserType[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        password: "",
        role: "DISPATCHER" as "ADMIN" | "DISPATCHER"
    });

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
        if (!formData.name || !formData.email || !formData.password) {
            toast.error("Please fill in all fields");
            return;
        }

        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                toast.success("Team member added successfully");
                setIsDialogOpen(false);
                setFormData({ name: "", email: "", password: "", role: "DISPATCHER" });
                fetchUsers();
            } else {
                const error = await res.json();
                toast.error(error.message || error.error);
            }
        } catch (error) {
            toast.error("Failed to create user");
        }
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
        <div className="h-full flex flex-col p-4 bg-zinc-950 gap-4 text-zinc-100">
            <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">Team & Access</h1>
                    <p className="text-zinc-500 text-sm">Manage staff access and roles.</p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-amber-500 text-black hover:bg-amber-400 font-bold">
                            <Plus className="mr-2 h-4 w-4" /> Add Member
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-zinc-900 border-white/10 text-white">
                        <DialogHeader>
                            <DialogTitle>Add New Team Member</DialogTitle>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Full Name</label>
                                <Input
                                    placeholder="e.g. John Doe"
                                    className="bg-zinc-800 border-white/10"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Email Address</label>
                                <Input
                                    type="email"
                                    placeholder="john@example.com"
                                    className="bg-zinc-800 border-white/10"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Password</label>
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="bg-zinc-800 border-white/10"
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-zinc-400">Role</label>
                                <select
                                    className="w-full h-10 rounded-md border border-white/10 bg-zinc-800 px-3 py-2 text-sm text-white"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                >
                                    <option value="DISPATCHER">Dispatcher (Staff)</option>
                                    <option value="ADMIN">Admin (Manager)</option>
                                </select>
                                <p className="text-xs text-zinc-500">
                                    {['ADMIN', 'SUPER_ADMIN'].includes(formData.role)
                                        ? "Full access to settings, pricing, and team management."
                                        : "Can create bookings and view drivers/vehicles only."}
                                </p>
                            </div>
                            <Button onClick={handleSave} className="w-full bg-amber-500 text-black hover:bg-amber-400 mt-2">
                                Create Account
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <Card className="overflow-hidden bg-zinc-900/20 border-white/10">
                <Table>
                    <TableHeader className="bg-zinc-900/50">
                        <TableRow className="border-white/5 hover:bg-transparent">
                            <TableHead className="text-zinc-400">User</TableHead>
                            <TableHead className="text-zinc-400">Role</TableHead>
                            <TableHead className="text-zinc-400">Joined</TableHead>
                            <TableHead className="text-right text-zinc-400">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-zinc-500">Loading team...</TableCell>
                            </TableRow>
                        ) : filteredUsers.map((user) => (
                            <TableRow key={user.id} className="border-white/5 hover:bg-white/5">
                                <TableCell>
                                    <div className="flex flex-col">
                                        <span className="font-medium text-zinc-200">{user.name}</span>
                                        <span className="text-xs text-zinc-500">{user.email}</span>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={['ADMIN', 'SUPER_ADMIN'].includes(user.role) ? 'border-amber-500 text-amber-500' : 'border-zinc-500 text-zinc-500'}>
                                        {['ADMIN', 'SUPER_ADMIN'].includes(user.role) ? <Shield className="w-3 h-3 mr-1" /> : <User className="w-3 h-3 mr-1" />}
                                        {user.role === 'SUPER_ADMIN' ? 'Admin' : (user.role.charAt(0).toUpperCase() + user.role.slice(1).toLowerCase())}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-zinc-500">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                </TableCell>
                                <TableCell className="text-right">
                                    {user.id !== session?.user?.id && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                            onClick={() => handleDelete(user.id, user.name)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}
