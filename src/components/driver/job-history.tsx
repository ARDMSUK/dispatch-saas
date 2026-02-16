
'use client';

import { useState, useEffect } from 'react';
import { JobCard } from './job-card';
import { Loader2 } from 'lucide-react';

export function JobHistory() {
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const token = localStorage.getItem('driver_token');
                const res = await fetch('/api/driver/jobs?type=history', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    setJobs(await res.json());
                }
            } catch (err) {
                console.error("Failed to load history", err);
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    if (loading) return (
        <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 text-zinc-500 animate-spin" />
        </div>
    );

    if (jobs.length === 0) return (
        <div className="text-center py-20 text-zinc-500">
            <p>No job history yet.</p>
        </div>
    );

    return (
        <div className="space-y-4 pb-4">
            {jobs.map(job => (
                <JobCard key={job.id} job={job} onStatusUpdate={() => { }} />
            ))}
        </div>
    );
}
