"use client";

import { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, FileText, CheckCircle, XCircle, AlertCircle, Trash2, ShieldCheck, Car } from "lucide-react";
import { Document } from "@/lib/types";

export default function ComplianceDashboard() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const fetchDocuments = async () => {
        try {
            const res = await fetch("/api/documents");
            if (!res.ok) throw new Error("Failed to fetch documents");
            const data = await res.json();
            setDocuments(data);
        } catch (error) {
            console.error("Failed to fetch documents", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const updateStatus = async (id: string, status: string) => {
        try {
            const res = await fetch(`/api/documents/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status })
            });
            if (res.ok) {
                fetchDocuments();
            }
        } catch (error) {
            console.error("Error updating status", error);
        }
    };

    const deleteDocument = async (id: string) => {
        if (!confirm("Are you sure you want to delete this document?")) return;
        try {
            const res = await fetch(`/api/documents/${id}`, {
                method: "DELETE"
            });
            if (res.ok) {
                fetchDocuments();
            }
        } catch (error) {
            console.error("Error deleting document", error);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case "APPROVED": return <CheckCircle className="w-4 h-4 text-emerald-500" />;
            case "REJECTED": return <XCircle className="w-4 h-4 text-red-500" />;
            case "EXPIRED": return <AlertCircle className="w-4 h-4 text-orange-500" />;
            default: return <AlertCircle className="w-4 h-4 text-slate-400" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "APPROVED": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
            case "REJECTED": return "bg-red-500/10 text-red-600 border-red-500/20";
            case "EXPIRED": return "bg-orange-500/10 text-orange-600 border-orange-500/20";
            default: return "bg-slate-200 text-slate-600 border-slate-300";
        }
    };

    const filteredDocs = documents.filter(doc => 
        doc.type.toLowerCase().includes(searchTerm.toLowerCase()) || 
        doc.driver?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.vehicle?.reg?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="h-full flex flex-col p-6 bg-background text-foreground gap-4 overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Compliance Dashboard</h1>
                    <p className="text-muted-foreground text-sm">Manage driver and vehicle document compliance.</p>
                </div>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by driver, vehicle, or document type..."
                        className="pl-8 bg-background border-input text-foreground placeholder:text-muted-foreground"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border border-border overflow-hidden bg-card shadow-sm">
                <Table>
                    <TableHeader className="bg-muted/50 border-b border-border">
                        <TableRow className="hover:bg-transparent border-border">
                            <TableHead className="text-muted-foreground font-semibold w-[200px]">Entity</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Document Type</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Status</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">Expiry Date</TableHead>
                            <TableHead className="text-muted-foreground font-semibold">File</TableHead>
                            <TableHead className="text-right text-muted-foreground font-semibold">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Loading documents...</TableCell>
                            </TableRow>
                        ) : filteredDocs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">No documents found.</TableCell>
                            </TableRow>
                        ) : (
                            filteredDocs.map((doc) => (
                                <TableRow key={doc.id} className="hover:bg-muted/50 border-border transition-colors">
                                    <TableCell>
                                        {doc.driver ? (
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-primary" />
                                                <span className="font-medium text-foreground">{doc.driver.name}</span>
                                            </div>
                                        ) : doc.vehicle ? (
                                            <div className="flex items-center gap-2">
                                                <Car className="w-4 h-4 text-primary" />
                                                <span className="font-medium text-foreground">{doc.vehicle.reg}</span>
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground">Unknown</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium text-foreground">
                                        {doc.type.replace('_', ' ')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`flex w-fit items-center gap-1 ${getStatusColor(doc.status)}`}>
                                            {getStatusIcon(doc.status)}
                                            {doc.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {doc.fileUrl ? (
                                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-primary hover:underline text-sm font-semibold">
                                                <FileText className="w-4 h-4" /> View File
                                            </a>
                                        ) : (
                                            <span className="text-muted-foreground text-sm italic">No File</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {doc.status === 'PENDING' && (
                                                <>
                                                    <Button size="sm" variant="outline" className="h-8 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-400" onClick={() => updateStatus(doc.id, 'APPROVED')}>Approve</Button>
                                                    <Button size="sm" variant="outline" className="h-8 border-red-500/30 text-red-500 hover:bg-red-500/10 hover:text-red-400" onClick={() => updateStatus(doc.id, 'REJECTED')}>Reject</Button>
                                                </>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-500/10" onClick={() => deleteDocument(doc.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
