"use client";

import { useState } from "react";
import useSWR from "swr";
import { Plus, Trash2, Edit2, CheckCircle2, XCircle, Save, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface AiKnowledgeRule {
    id: string;
    topic: string;
    content: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function KnowledgeBasePage() {
    const { data: rules, error, mutate } = useSWR<AiKnowledgeRule[]>("/api/admin/knowledge-base", fetcher);
    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [form, setForm] = useState({ topic: "", content: "", isActive: true });

    if (error) return <div className="text-red-500">Failed to load rules.</div>;
    if (!rules) return <div className="animate-pulse space-y-4"><div className="h-20 bg-slate-200 rounded-xl w-full" /></div>;

    const handleSave = async () => {
        if (!form.topic || !form.content) return alert("Topic and content are required.");
        
        const method = editingId ? "PUT" : "POST";
        const body = editingId ? { ...form, id: editingId } : form;

        const res = await fetch("/api/admin/knowledge-base", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            mutate();
            setIsAdding(false);
            setEditingId(null);
            setForm({ topic: "", content: "", isActive: true });
        } else {
            alert("Failed to save rule.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this rule?")) return;
        const res = await fetch(`/api/admin/knowledge-base?id=${id}`, { method: "DELETE" });
        if (res.ok) mutate();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">CABAI Knowledge Base</h1>
                    <p className="text-slate-500">Manage the dynamic instructions and rules that CABAI uses to answer support tickets.</p>
                </div>
                {!isAdding && !editingId && (
                    <Button onClick={() => setIsAdding(true)} className="bg-slate-900 hover:bg-slate-800 text-white shadow-md">
                        <Plus className="w-4 h-4 mr-2" /> Add Rule
                    </Button>
                )}
            </div>

            {(isAdding || editingId) && (
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">{editingId ? "Edit Rule" : "Create New Rule"}</h2>
                        <Button variant="ghost" size="sm" onClick={() => { setIsAdding(false); setEditingId(null); setForm({ topic: "", content: "", isActive: true }); }}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-700">Topic / Category</label>
                            <Input 
                                placeholder="e.g. Password Reset, Stripe Issues, Dispatch Rules" 
                                value={form.topic} 
                                onChange={e => setForm({...form, topic: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700">Instructions Content</label>
                            <Textarea 
                                placeholder="Write the exact instructions you want the AI to follow regarding this topic..." 
                                className="min-h-[150px]"
                                value={form.content} 
                                onChange={e => setForm({...form, content: e.target.value})}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <input 
                                type="checkbox" 
                                id="isActive"
                                checked={form.isActive}
                                onChange={e => setForm({...form, isActive: e.target.checked})}
                                className="rounded border-slate-300"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active (CABAI will use this rule)</label>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                        <Button variant="outline" onClick={() => { setIsAdding(false); setEditingId(null); setForm({ topic: "", content: "", isActive: true }); }}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 text-white">
                            <Save className="w-4 h-4 mr-2" /> Save Rule
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid gap-4">
                {rules.map(rule => (
                    <div key={rule.id} className={`bg-white p-5 rounded-xl border transition-all ${rule.isActive ? 'border-slate-200 shadow-sm' : 'border-dashed border-slate-300 opacity-60'}`}>
                        <div className="flex items-start justify-between">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <h3 className="font-semibold text-slate-900">{rule.topic}</h3>
                                    {rule.isActive ? (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800">
                                            <CheckCircle2 className="w-3 h-3 mr-1" /> Active
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800">
                                            <XCircle className="w-3 h-3 mr-1" /> Inactive
                                        </span>
                                    )}
                                </div>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap">{rule.content}</p>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-slate-500 hover:text-blue-600"
                                    onClick={() => {
                                        setForm({ topic: rule.topic, content: rule.content, isActive: rule.isActive });
                                        setEditingId(rule.id);
                                        setIsAdding(false);
                                        window.scrollTo({ top: 0, behavior: 'smooth' });
                                    }}
                                >
                                    <Edit2 className="w-4 h-4" />
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-slate-500 hover:text-red-600 hover:bg-red-50"
                                    onClick={() => handleDelete(rule.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))}

                {rules.length === 0 && !isAdding && (
                    <div className="text-center py-12 bg-white border border-slate-200 rounded-xl border-dashed">
                        <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">No Knowledge Base Rules</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mt-1 mb-4">CABAI relies on hardcoded defaults. Add rules here to override its behavior dynamically.</p>
                        <Button onClick={() => setIsAdding(true)} variant="outline">
                            <Plus className="w-4 h-4 mr-2" /> Add First Rule
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
