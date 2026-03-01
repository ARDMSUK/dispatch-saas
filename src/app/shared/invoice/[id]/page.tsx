"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import { Job, Account, Tenant } from "@/lib/types";
import { Printer } from "lucide-react";

interface InvoiceData {
    id: string;
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    status: string;
    subtotal: number;
    taxTotal: number;
    total: number;
    notes: string;
    account: Account;
    tenant: Tenant;
    jobs: Job[];
}

export default function InvoiceViewer() {
    const params = useParams();
    const [invoice, setInvoice] = useState<InvoiceData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchInvoice = async () => {
            if (!params?.id) return;
            try {
                const res = await fetch(`/api/invoices/${params.id}`);
                if (res.ok) {
                    setInvoice(await res.json());
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchInvoice();
    }, [params?.id]);

    if (loading) {
        return <div className="p-20 text-center font-sans">Loading invoice document...</div>;
    }

    if (!invoice) {
        return <div className="p-20 text-center text-red-500 font-sans">Invoice not found or access denied.</div>;
    }

    const { tenant, account, jobs } = invoice;

    return (
        <div className="min-h-screen bg-neutral-100 font-sans text-neutral-900 py-10 print:py-0 print:bg-white flex flex-col items-center">

            {/* Control Bar (Hidden on Print) */}
            <div className="w-full max-w-4xl flex justify-end mb-6 print:hidden px-4">
                <button
                    onClick={() => window.print()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md shadow transition"
                >
                    <Printer className="w-4 h-4" /> Print / Save PDF
                </button>
            </div>

            {/* A4 Paper Container */}
            <div className="w-full max-w-4xl bg-white shadow-2xl print:shadow-none print:w-full sm:rounded-lg overflow-hidden border border-neutral-200">

                {/* Header Banner */}
                <div className="bg-neutral-900 text-white p-8 sm:p-12 flex flex-col sm:flex-row justify-between items-start sm:items-center">
                    <div>
                        <h1 className="text-3xl font-black mb-1 tracking-tight uppercase">INVOICE</h1>
                        <p className="text-neutral-400 font-mono text-sm">{invoice.invoiceNumber}</p>
                    </div>
                    <div className="mt-6 sm:mt-0 text-right">
                        <h2 className="text-xl font-bold">{tenant.name}</h2>
                        <p className="text-sm text-neutral-400 mt-1 max-w-[250px] whitespace-pre-line leading-snug">
                            {tenant.address || "123 Business Road\nLondon, UK"}
                        </p>
                    </div>
                </div>

                <div className="p-8 sm:p-12">
                    {/* Meta Details */}
                    <div className="flex flex-col sm:flex-row justify-between mb-12 gap-8">
                        <div>
                            <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-3">Billed To</h3>
                            <h4 className="text-lg font-bold text-neutral-800">{account.name}</h4>
                            <p className="text-sm text-neutral-600 mt-1 max-w-[200px] leading-relaxed">
                                {account.addressLine1 ? (
                                    <>
                                        {account.addressLine1}<br />
                                        {account.townCity} {account.postcode}
                                    </>
                                ) : "Address not provided"}
                            </p>
                            <p className="text-sm text-neutral-600 mt-2 font-mono">{account.email}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm max-w-sm">
                            <div>
                                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Issue Date</h3>
                                <p className="font-medium text-neutral-800">
                                    {format(new Date(invoice.issueDate), "MMM do, yyyy")}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Due Date</h3>
                                <p className="font-bold text-indigo-600">
                                    {format(new Date(invoice.dueDate), "MMM do, yyyy")}
                                </p>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Account Code</h3>
                                <p className="font-mono text-neutral-800">{account.code}</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">Status</h3>
                                <p className={`font-bold uppercase tracking-wide ${invoice.status === 'PAID' ? 'text-emerald-600' : 'text-amber-600'}`}>
                                    {invoice.status}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Line Items Table */}
                    <div className="mb-12">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b-2 border-neutral-900 text-xs uppercase tracking-wider text-neutral-500">
                                    <th className="py-3 px-2 font-bold w-[15%]">Date</th>
                                    <th className="py-3 px-2 font-bold w-[15%]">Ref</th>
                                    <th className="py-3 px-2 font-bold w-[20%]">Passenger</th>
                                    <th className="py-3 px-2 font-bold w-[35%]">Route</th>
                                    <th className="py-3 px-2 font-bold text-right w-[15%]">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {jobs && jobs.map((job: Job, idx: number) => (
                                    <tr key={job.id} className={`border-b border-neutral-200 text-sm ${idx % 2 === 0 ? 'bg-neutral-50/50' : 'bg-white'}`}>
                                        <td className="py-4 px-2 whitespace-nowrap text-neutral-600">
                                            {format(new Date(job.pickupTime), "dd/MM/yy HH:mm")}
                                        </td>
                                        <td className="py-4 px-2 font-mono text-neutral-500">TRIP-{job.id}</td>
                                        <td className="py-4 px-2 font-medium text-neutral-800">{job.passengerName}</td>
                                        <td className="py-4 px-2">
                                            <div className="flex flex-col gap-1 max-w-[250px]">
                                                <span className="truncate text-neutral-700" title={job.pickupAddress}>
                                                    <span className="text-neutral-400 mr-1">A:</span>{job.pickupAddress}
                                                </span>
                                                <span className="truncate text-neutral-700" title={job.dropoffAddress}>
                                                    <span className="text-neutral-400 mr-1">B:</span>{job.dropoffAddress}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2 text-right font-mono font-medium text-neutral-900">
                                            £{(job.fare || 0).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                                {(!jobs || jobs.length === 0) && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-neutral-400 text-sm italic">
                                            No trips attached to this invoice.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Financial Summary */}
                    <div className="flex flex-col sm:flex-row justify-between items-end border-t border-neutral-200 pt-8 gap-8">

                        <div className="w-full sm:w-1/2 text-sm text-neutral-500 bg-neutral-50 p-4 rounded-md border border-neutral-100">
                            <p className="font-bold text-neutral-700 mb-1">Notes & Payment Terms</p>
                            <p className="leading-relaxed">
                                {invoice.notes || "Please remit payment within the specified terms. Make all cheques payable to the company name above. For bank transfers, use the Account Code as the payment reference."}
                            </p>
                        </div>

                        <div className="w-full sm:w-1/3 min-w-[250px]">
                            <div className="flex justify-between py-2 text-sm border-b border-neutral-100">
                                <span className="font-medium text-neutral-500">Subtotal</span>
                                <span className="font-mono text-neutral-900">£{invoice.subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-2 text-sm border-b border-neutral-100">
                                <span className="font-medium text-neutral-500">Tax / VAT</span>
                                <span className="font-mono text-neutral-900">£{invoice.taxTotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-4 mt-2">
                                <span className="text-lg font-black text-neutral-900">Total Due</span>
                                <span className="text-2xl font-black text-indigo-600 font-mono">£{invoice.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Stripe */}
                <div className="h-4 w-full bg-gradient-to-r from-indigo-500 to-purple-600"></div>
            </div>
        </div>
    );
}
