'use client';

import { useEffect, useState } from 'react';
import { format } from 'date-fns';

type LightJob = {
    id: string;
    pickup: string;
    dropoff: string;
    time: string;
    status: string;
    name: string;
    phone: string;
    driver: string;
};

export default function OfflinePage() {
    const [jobs, setJobs] = useState<LightJob[]>([]);
    const [lastSync, setLastSync] = useState<string | null>(null);

    useEffect(() => {
        // Load data from localStorage when offline UI mounts
        const cachedManifest = localStorage.getItem('dispatch_offline_manifest');
        const cachedSyncTime = localStorage.getItem('dispatch_offline_last_sync');

        if (cachedManifest) {
            try {
                setJobs(JSON.parse(cachedManifest));
            } catch (e) {
                console.error("Failed to parse offline manifest");
            }
        }
        if (cachedSyncTime) {
            try {
                setLastSync(format(new Date(cachedSyncTime), 'MMM dd, h:mm a'));
            } catch (e) {
                setLastSync("Unknown");
            }
        }
    }, []);

    // Helper to test if online again
    const handleRetry = () => {
        window.location.href = '/dashboard';
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-4 border-b border-red-500/30">
                    <div>
                        <h1 className="text-3xl font-bold text-red-500 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
                                <path d="M12 18l.01 0"></path>
                                <path d="M9.172 15.172a4 4 0 0 1 5.656 0"></path>
                                <path d="M6.343 12.343a8 8 0 0 1 11.314 0"></path>
                                <path d="M3.515 9.515c4.686 -4.687 12.284 -4.687 17 0"></path>
                                <line x1="3" y1="3" x2="21" y2="21"></line>
                            </svg>
                            Connection Lost
                        </h1>
                        <p className="text-slate-400 mt-1">Read-Only Dispatch Console</p>
                    </div>

                    <div className="mt-4 md:mt-0 flex flex-col items-end">
                        <span className="text-sm text-slate-400">
                            Last synced: {lastSync || 'Never'}
                        </span>
                        <button
                            onClick={handleRetry}
                            className="mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded shadow transition-colors text-sm font-medium"
                        >
                            Try Reconnect
                        </button>
                    </div>
                </div>

                <div className="bg-slate-900 rounded-lg shadow-xl border border-slate-800 overflow-hidden">
                    <div className="p-4 bg-slate-800 border-b border-slate-700">
                        <h2 className="font-semibold text-slate-100">Cached Manifest (Next 48 Hours)</h2>
                    </div>

                    {jobs.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">
                            No cached jobs available.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                                        <th className="p-4 font-medium">Time</th>
                                        <th className="p-4 font-medium">Passenger</th>
                                        <th className="p-4 font-medium">Route</th>
                                        <th className="p-4 font-medium">Driver</th>
                                        <th className="p-4 font-medium">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800">
                                    {jobs.map((job) => (
                                        <tr key={job.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="p-4 whitespace-nowrap">
                                                {format(new Date(job.time), 'HH:mm')}
                                                <div className="text-xs text-slate-500">{format(new Date(job.time), 'd MMM')}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-medium text-slate-200">{job.name}</div>
                                                <div className="text-xs text-slate-400">{job.phone}</div>
                                            </td>
                                            <td className="p-4 max-w-xs truncate">
                                                <div className="text-slate-300 truncate" title={job.pickup}><span className="text-slate-500">A:</span> {job.pickup}</div>
                                                <div className="text-slate-300 truncate" title={job.dropoff}><span className="text-slate-500">B:</span> {job.dropoff}</div>
                                            </td>
                                            <td className="p-4 text-slate-300">
                                                {job.driver}
                                            </td>
                                            <td className="p-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${job.status === 'PENDING' ? 'bg-yellow-500/10 text-yellow-500' :
                                                        job.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' :
                                                            'bg-blue-500/10 text-blue-500'
                                                    }`}>
                                                    {job.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
