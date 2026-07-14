"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Driver, Document } from "@/lib/types";
import { Plus, Search, Car, Pencil, Trash2, X, MoreHorizontal, Power, CheckCircle, Clock, FileText, Upload } from "lucide-react";
import { useSession } from "next-auth/react";

export default function DriversPage() {
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [pendingDocs, setPendingDocs] = useState<{ type: string; fileUrl: string; expiryDate: string }[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        callsign: "",
        phone: "",
        email: "",
        badgeNumber: "",
        licenseExpiry: "",
        pin: "",
        commissionRate: 20,
        complianceOverrideActive: false,
        complianceOverrideReason: ""
    });

    const fetchDrivers = async () => {
        try {
            const res = await fetch("/api/drivers");
            if (!res.ok) throw new Error("Failed to fetch drivers");

            const data = await res.json();
            if (Array.isArray(data)) {
                setDrivers(data);
            } else {
                console.error("Invalid drivers data:", data);
                setDrivers([]);
            }
        } catch (error) {
            console.error("Failed to fetch drivers", error);
            setDrivers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const resetForm = () => {
        setFormData({ name: "", callsign: "", phone: "", email: "", badgeNumber: "", licenseExpiry: "", pin: "", commissionRate: 20, complianceOverrideActive: false, complianceOverrideReason: "" });
        setEditingId(null);
        setPendingDocs([]);
    };

    const handleOpenChange = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) resetForm();
    };

    const handleSave = async () => {
        try {
            const url = editingId ? `/api/drivers/${editingId}` : "/api/drivers";
            const method = editingId ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData)
            });

            if (res.ok) {
                if (!editingId && pendingDocs.length > 0) {
                    const newDriver = await res.json();
                    for (const doc of pendingDocs) {
                        await fetch('/api/documents', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                type: doc.type,
                                fileUrl: doc.fileUrl,
                                expiryDate: doc.expiryDate,
                                driverId: newDriver.id
                            })
                        });
                    }
                }
                setIsDialogOpen(false);
                resetForm();
                fetchDrivers();
            } else {
                const error = await res.json();
                alert(`Failed to ${editingId ? 'update' : 'create'} driver: ${error.message || error.error}`);
            }
        } catch (error) {
            console.error("Error saving driver", error);
        }
    };

    const handleEdit = (driver: Driver) => {
        setEditingId(driver.id);
        setFormData({
            name: driver.name,
            callsign: driver.callsign,
            phone: driver.phone,
            email: driver.email || "",
            badgeNumber: driver.badgeNumber || "",
            licenseExpiry: driver.licenseExpiry || "",
            pin: driver.pin || "",
            commissionRate: driver.commissionRate || 20,
            complianceOverrideActive: driver.complianceOverrideActive || false,
            complianceOverrideReason: driver.complianceOverrideReason || ""
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this driver?")) return;

        try {
            const res = await fetch(`/api/drivers/${id}`, { method: "DELETE" });
            if (res.ok) {
                fetchDrivers();
            } else {
                alert("Failed to delete driver");
            }
        } catch (error) {
            console.error("Error deleting driver", error);
        }
    };

    const filteredDrivers = drivers.filter(d =>
        d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.callsign.includes(searchTerm)
    );

    const { data: session } = useSession();
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session?.user?.role as string);

    return (
        <div className="flex flex-col p-6 bg-background text-foreground gap-4 min-h-full">
            <div className="flex justify-between items-center border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Fleet Management</h1>
                    <p className="text-muted-foreground text-sm">Manage your drivers and their availability.</p>
                </div>
                {isAdmin && (
                    <Dialog open={isDialogOpen} onOpenChange={handleOpenChange}>
                        <DialogTrigger asChild>
                            <Button className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                                <Plus className="mr-2 h-4 w-4" /> Add Driver
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-card border-border text-foreground max-w-4xl sm:max-w-4xl">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">{editingId ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
                            </DialogHeader>
                            <Tabs defaultValue="profile" className="w-full">
                                <TabsList className="grid w-full grid-cols-2">
                                    <TabsTrigger value="profile">Profile</TabsTrigger>
                                    <TabsTrigger value="documents">Compliance</TabsTrigger>
                                </TabsList>
                                <TabsContent value="profile" className="grid gap-4 py-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Callsign (e.g. 101)"
                                        value={formData.callsign}
                                        onChange={e => setFormData({ ...formData, callsign: e.target.value })}
                                        className="bg-background border-input text-foreground"
                                    />
                                    <Input
                                        placeholder="Full Name"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        className="bg-background border-input text-foreground"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Input
                                        placeholder="Phone Number"
                                        value={formData.phone}
                                        onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                        className="bg-background border-input text-foreground"
                                    />
                                    <Input
                                        placeholder="Email Address (Optional)"
                                        value={formData.email}
                                        onChange={e => setFormData({ ...formData, email: e.target.value })}
                                        className="bg-background border-input text-foreground"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground block">Login PIN (4 digits)</label>
                                        <Input
                                            placeholder="Login PIN"
                                            value={formData.pin}
                                            onChange={e => setFormData({ ...formData, pin: e.target.value })}
                                            className="bg-background border-input text-foreground"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-muted-foreground block">Commission Rate (%)</label>
                                        <Input
                                            type="number"
                                            placeholder="Commission Rate"
                                            value={formData.commissionRate}
                                            onChange={e => setFormData({ ...formData, commissionRate: parseFloat(e.target.value) })}
                                            className="bg-background border-input text-foreground"
                                        />
                                    </div>
                                </div>
                                {isAdmin && (
                                    <div className="p-3 border border-red-200 bg-red-50 rounded-md flex flex-col gap-2">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="complianceOverride"
                                                checked={formData.complianceOverrideActive}
                                                onChange={e => setFormData({ ...formData, complianceOverrideActive: e.target.checked })}
                                                className="w-4 h-4 cursor-pointer accent-red-600"
                                            />
                                            <label htmlFor="complianceOverride" className="text-sm font-bold text-red-700 cursor-pointer">Administrative Compliance Override</label>
                                        </div>
                                        {formData.complianceOverrideActive && (
                                            <Input
                                                placeholder="Reason for Override (Optional)"
                                                value={formData.complianceOverrideReason}
                                                onChange={e => setFormData({ ...formData, complianceOverrideReason: e.target.value })}
                                                className="bg-white border-red-200"
                                            />
                                        )}
                                    </div>
                                )}
                                <Button onClick={handleSave} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                                    {editingId ? 'Update Driver' : 'Create Driver'}
                                </Button>
                            </TabsContent>
                             <TabsContent value="documents" className="space-y-4">
                                 <DriverDocuments driverId={editingId} pendingDocuments={pendingDocs} setPendingDocuments={setPendingDocs} />
                                 <div className="mt-4 pt-4 border-t border-border flex justify-end">
                                     <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
                                         {editingId ? 'Update Driver' : 'Create Driver'}
                                     </Button>
                                 </div>
                             </TabsContent>
                            </Tabs>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search drivers..."
                        className="pl-8 bg-background border-input text-foreground placeholder:text-muted-foreground"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border border-border overflow-hidden bg-card shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50 border-b border-border">
                        <TableRow className="border-border hover:bg-transparent">
                            <TableHead className="w-[100px] text-muted-foreground font-semibold">Callsign</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Name</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Contact</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Vehicle</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Badge</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Expiry</TableHead>
                            {isAdmin && <TableHead className="text-right text-muted-foreground font-semibold">Actions</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-slate-400">Loading fleet data...</TableCell>
                            </TableRow>
                        ) : filteredDrivers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-slate-400">No drivers found matches.</TableCell>
                            </TableRow>
                        ) : (
                            filteredDrivers.map((driver) => (
                                <TableRow key={driver.id} className="hover:bg-muted/50 border-border group transition-colors">
                                    <TableCell className="font-bold font-mono text-lg text-primary">{driver.callsign}</TableCell>
                                    <TableCell className="font-medium text-foreground">{driver.name}</TableCell>
                                    <TableCell>
                                        <DriverStatusCell driver={driver} onUpdate={fetchDrivers} />
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{driver.phone}</TableCell>
                                    <TableCell>
                                        {driver.vehicles?.[0] ? (
                                            <div className="flex items-center gap-2 text-sm text-primary">
                                                <Car className="h-3 w-3" />
                                                <span>{driver.vehicles[0].reg} <span className="text-muted-foreground">({driver.vehicles[0].make})</span></span>
                                            </div>
                                        ) : <span className="text-muted-foreground text-xs italic">Unassigned</span>}
                                    </TableCell>
                                    <TableCell className="text-sm font-mono text-muted-foreground">{driver.badgeNumber || '-'}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                        {driver.licenseExpiry ? new Date(driver.licenseExpiry).toLocaleDateString() : '-'}
                                    </TableCell>
                                    {isAdmin && (
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted" onClick={() => handleEdit(driver)}>
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-500/10" onClick={() => handleDelete(driver.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    )}
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

function DriverStatusCell({ driver, onUpdate }: { driver: Driver; onUpdate: () => void }) {
    const [loading, setLoading] = useState(false);

    const updateStatus = async (newStatus: string) => {
        setLoading(true);
        try {
            await fetch(`/api/drivers/${driver.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            onUpdate();
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const getBadgeStyle = (status: string) => {
        switch (status) {
            case 'FREE': return 'bg-emerald-500/20 text-emerald-500 border-emerald-500/20';
            case 'BUSY': return 'bg-indigo-600/20 text-indigo-600 border-indigo-600/20';
            case 'POB': return 'bg-blue-500/20 text-blue-500 border-blue-500/20';
            case 'OFF_DUTY': return 'bg-slate-200 text-slate-400 border-slate-300';
            default: return 'bg-slate-200 text-slate-400';
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 p-0 hover:bg-transparent">
                    <Badge className={`cursor-pointer transition-opacity ${getBadgeStyle(driver.status)} border`}>
                        {loading ? '...' : driver.status}
                    </Badge>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="bg-popover border-border text-popover-foreground">
                <DropdownMenuItem onClick={() => updateStatus('FREE')} className="text-emerald-500 focus:bg-emerald-500/10 focus:text-emerald-400">
                    <CheckCircle className="mr-2 h-4 w-4" /> Set FREE
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus('BUSY')} className="text-indigo-600 focus:bg-indigo-600/10 focus:text-blue-500">
                    <Clock className="mr-2 h-4 w-4" /> Set BUSY
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => updateStatus('OFF_DUTY')} className="text-muted-foreground focus:bg-accent focus:text-accent-foreground">
                    <Power className="mr-2 h-4 w-4" /> Set OFF DUTY
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function DriverDocuments({ 
    driverId, 
    pendingDocuments = [], 
    setPendingDocuments 
}: { 
    driverId: string | null; 
    pendingDocuments?: { type: string; fileUrl: string; expiryDate: string }[]; 
    setPendingDocuments?: React.Dispatch<React.SetStateAction<{ type: string; fileUrl: string; expiryDate: string }[]>>; 
}) {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [type, setType] = useState('DRIVING_LICENSE');
    const [file, setFile] = useState<File | null>(null);
    const [expiryDate, setExpiryDate] = useState('');
    const [uploading, setUploading] = useState(false);

    const fetchDocs = async () => {
        if (!driverId) return;
        try {
            const res = await fetch(`/api/documents?driverId=${driverId}`);
            if (res.ok) {
                setDocuments(await res.json());
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { 
        if (!driverId) {
            setDocuments([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        fetchDocs(); 
    }, [driverId]);

    const handleUpload = async () => {
        if (!file) return alert("Please select a file");
        setUploading(true);
        try {
            const response = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}`, {
                method: 'POST',
                body: file,
            });
            const blob = await response.json();
            if (blob.error) throw new Error(blob.error);

            if (!driverId) {
                // Creation mode: append to pending list
                if (setPendingDocuments) {
                    setPendingDocuments(prev => [...prev, { type, fileUrl: blob.url, expiryDate }]);
                }
                setFile(null);
                setExpiryDate('');
                const fileInput = document.getElementById('fileUploadInput') as HTMLInputElement;
                if (fileInput) fileInput.value = '';
            } else {
                // Edit mode: save directly
                const res = await fetch('/api/documents', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ type, fileUrl: blob.url, expiryDate, driverId })
                });
                if (res.ok) {
                    setFile(null);
                    setExpiryDate('');
                    const fileInput = document.getElementById('fileUploadInput') as HTMLInputElement;
                    if (fileInput) fileInput.value = '';
                    fetchDocs();
                }
            }
        } catch (e: any) {
            console.error(e);
            alert("Upload failed: " + e.message);
        } finally {
            setUploading(false);
        }
    };

    const allDocs = [
        ...documents,
        ...pendingDocuments.map((d, index) => ({
            id: `pending-${index}`,
            type: d.type,
            status: 'UNSAVED',
            expiryDate: d.expiryDate,
            fileUrl: d.fileUrl,
            isPending: true,
            index
        }))
    ];

    return (
        <div className="py-4 flex flex-col gap-4">
            <div className="bg-card p-4 rounded border border-border grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="w-full">
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Doc Type</label>
                     <select value={type} onChange={e => setType(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground">
                         <option value="DRIVING_LICENSE">Driving License</option>
                         <option value="PCO_BADGE">PCO Badge</option>
                         <option value="INSURANCE">Insurance</option>
                         <option value="TAXI_LICENSE">Taxi License</option>
                         <option value="SCHOOL_BADGE">School Badge</option>
                         <option value="DBS">DBS</option>
                         <option value="PASSPORT">Passport</option>
                         <option value="RIGHT_TO_WORK">Right To Work Proof</option>
                     </select>
                </div>
                <div className="w-full">
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">File</label>
                    <Input id="fileUploadInput" type="file" onChange={e => setFile(e.target.files?.[0] || null)} className="bg-background text-xs pt-2 border-input cursor-pointer text-foreground w-full" />
                </div>
                <div className="w-full">
                    <label className="text-xs font-bold text-muted-foreground mb-1 block">Expiry</label>
                    <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="bg-background border-input text-foreground w-full" />
                </div>
                 <Button onClick={handleUpload} disabled={uploading || !file} className="bg-primary text-primary-foreground hover:bg-primary/90 w-full">
                     {uploading ? 'Uploading...' : <><Upload className="h-4 w-4 mr-1"/> Upload & Save Document</>}
                 </Button>
            </div>
            
            <div className="border border-border rounded overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow className="border-border">
                            <TableHead className="text-muted-foreground font-semibold">Type</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Expiry</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">File</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody className="bg-card">
                        {loading ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">Loading...</TableCell></TableRow> :
                         allDocs.length === 0 ? <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground">No documents found</TableCell></TableRow> :
                         allDocs.map((doc: any, docIdx: number) => (
                             <TableRow key={doc.id || docIdx} className="border-border hover:bg-muted/50">
                                 <TableCell className="font-medium text-foreground">{doc.type.replace('_', ' ')}</TableCell>
                                 <TableCell>
                                     <Badge variant="outline" className={`border-border ${doc.isPending ? 'text-indigo-600 border-indigo-600/30 bg-indigo-600/5' : 'text-foreground'}`}>
                                         {doc.status}
                                     </Badge>
                                 </TableCell>
                                 <TableCell className="text-muted-foreground">{doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-'}</TableCell>
                                 <TableCell className="flex items-center gap-2">
                                     {doc.fileUrl ? <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-semibold">View</a> : '-'}
                                     {doc.isPending && (
                                         <Button 
                                             variant="ghost" 
                                             size="sm" 
                                             className="h-6 px-2 text-red-500 hover:text-red-600 hover:bg-red-500/10 text-xs ml-auto"
                                             onClick={() => {
                                                 if (setPendingDocuments) {
                                                     setPendingDocuments(prev => prev.filter((_, idx) => idx !== doc.index));
                                                 }
                                             }}
                                         >
                                             Remove
                                         </Button>
                                     )}
                                 </TableCell>
                             </TableRow>
                         ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
