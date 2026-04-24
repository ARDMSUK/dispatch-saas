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
        <div className="h-full flex flex-col p-4 bg-slate-100 gap-4 text-slate-900">
            <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Compliance Dashboard</h1>
                    <p className="text-slate-500 text-sm">Manage driver and vehicle document compliance.</p>
                </div>
            </div>

            <div className="flex gap-2">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        placeholder="Search by driver, vehicle, or document type..."
                        className="pl-8 bg-white border-slate-200 text-slate-900"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="rounded-md border border-slate-200 overflow-hidden bg-white">
                <Table>
                    <TableHeader className="bg-slate-50 border-b border-slate-200">
                        <TableRow className="hover:bg-slate-50">
                            <TableHead className="text-slate-500 w-[200px]">Entity</TableHead>
                            <TableHead className="text-slate-500">Document Type</TableHead>
                            <TableHead className="text-slate-500">Status</TableHead>
                            <TableHead className="text-slate-500">Expiry Date</TableHead>
                            <TableHead className="text-slate-500">File</TableHead>
                            <TableHead className="text-right text-slate-500">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-slate-400">Loading documents...</TableCell>
                            </TableRow>
                        ) : filteredDocs.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-12 text-slate-400">No documents found.</TableCell>
                            </TableRow>
                        ) : (
                            filteredDocs.map((doc) => (
                                <TableRow key={doc.id} className="hover:bg-slate-50">
                                    <TableCell>
                                        {doc.driver ? (
                                            <div className="flex items-center gap-2">
                                                <ShieldCheck className="w-4 h-4 text-blue-500" />
                                                <span className="font-medium">{doc.driver.name}</span>
                                            </div>
                                        ) : doc.vehicle ? (
                                            <div className="flex items-center gap-2">
                                                <Car className="w-4 h-4 text-indigo-500" />
                                                <span className="font-medium">{doc.vehicle.reg}</span>
                                            </div>
                                        ) : (
                                            <span className="text-slate-400">Unknown</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="font-medium text-slate-700">
                                        {doc.type.replace('_', ' ')}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className={`flex w-fit items-center gap-1 ${getStatusColor(doc.status)}`}>
                                            {getStatusIcon(doc.status)}
                                            {doc.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-slate-600">
                                        {doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-'}
                                    </TableCell>
                                    <TableCell>
                                        {doc.fileUrl ? (
                                            <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline text-sm">
                                                <FileText className="w-4 h-4" /> View File
                                            </a>
                                        ) : (
                                            <span className="text-slate-400 text-sm">No File</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {doc.status === 'PENDING' && (
                                                <>
                                                    <Button size="sm" variant="outline" className="h-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={() => updateStatus(doc.id, 'APPROVED')}>Approve</Button>
                                                    <Button size="sm" variant="outline" className="h-8 border-red-200 text-red-600 hover:bg-red-50" onClick={() => updateStatus(doc.id, 'REJECTED')}>Reject</Button>
                                                </>
                                            )}
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => deleteDocument(doc.id)}>
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
