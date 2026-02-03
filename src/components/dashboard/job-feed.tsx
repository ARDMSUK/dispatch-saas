'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, User, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';

type Job = {
    id: number;
    pickupAddress: string;
    dropoffAddress: string;
    pickupTime: string;
    passengerName: string;
    status: string;
    vehicleType: string;
    fare: number | null;
};

type JobFeedProps = {
    onSelectJob: (job: Job) => void;
    selectedJobId?: number;
};

export function JobFeed({ onSelectJob, selectedJobId }: JobFeedProps) {
    const [jobs, setJobs] = useState<Job[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchJobs = async () => {
        try {
            // Fetch PENDING or UNASSIGNED jobs
            const res = await fetch('/api/jobs?status=PENDING');
            const data = await res.json();
            // Also fetch UNASSIGNED if separate? For now let's assume PENDING covers it or filter client side
            setJobs(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error("Failed to fetch jobs", error);
        } finally {
            setLoading(false);
        }
    };

    // Polling every 10 seconds
    useEffect(() => {
        fetchJobs();
        const interval = setInterval(fetchJobs, 10000);
        return () => clearInterval(interval);
    }, []);

    return (
        <Card className="h-full bg-zinc-900 border-zinc-800 flex flex-col">
            <CardHeader className="pb-3 border-b border-white/5">
                <CardTitle className="text-white text-lg flex items-center justify-between">
                    Live Queue
                    <Badge variant="secondary" className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">
                        {jobs.length} Pending
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-zinc-700">
                {loading && jobs.length === 0 ? (
                    <div className="p-4 text-zinc-500 text-sm text-center">Loading feed...</div>
                ) : jobs.length === 0 ? (
                    <div className="p-4 text-zinc-500 text-sm text-center">No pending jobs</div>
                ) : (
                    <div className="divide-y divide-white/5">
                        {jobs.map(job => (
                            <div
                                key={job.id}
                                onClick={() => onSelectJob(job)}
                                className={`p-4 cursor-pointer transition-colors hover:bg-white/5 ${selectedJobId === job.id ? 'bg-amber-500/10 border-l-2 border-amber-500' : 'border-l-2 border-transparent'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2 text-amber-500 font-mono text-xs font-bold">
                                        <Clock className="h-3 w-3" />
                                        {format(new Date(job.pickupTime), 'HH:mm')}
                                    </div>
                                    <Badge variant="outline" className="border-zinc-700 text-zinc-400 text-[10px] h-5">
                                        {job.vehicleType}
                                    </Badge>
                                </div>

                                <div className="space-y-2 mb-3">
                                    <div className="flex gap-2">
                                        <div className="mt-1 min-w-[16px] flex flex-col items-center">
                                            <div className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" />
                                            <div className="w-0.5 h-full bg-zinc-800 my-1" />
                                            <div className="h-2 w-2 rounded-full bg-amber-500" />
                                        </div>
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <p className="text-sm text-white font-medium truncate" title={job.pickupAddress}>
                                                {job.pickupAddress.split(',')[0]}
                                            </p>
                                            <p className="text-sm text-zinc-400 truncate" title={job.dropoffAddress}>
                                                {job.dropoffAddress.split(',')[0]}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-3 pl-6">
                                    <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                                        <User className="h-3 w-3" />
                                        <span>{job.passengerName}</span>
                                    </div>
                                    {job.fare && (
                                        <span className="text-emerald-500 font-mono text-sm font-bold">
                                            £{job.fare.toFixed(2)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
