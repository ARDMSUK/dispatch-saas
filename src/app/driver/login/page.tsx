
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2, ShieldCheck, Truck } from 'lucide-react';

export default function DriverLoginPage() {
    const router = useRouter();
    const [step, setStep] = useState<'CALLSIGN' | 'PIN'>('CALLSIGN');
    const [tenantSlug, setTenantSlug] = useState('');
    const [callsign, setCallsign] = useState('');
    const [pin, setPin] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCallsignSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenantSlug.trim()) {
            toast.error("Enter your company code");
            return;
        }
        if (!callsign.trim()) {
            toast.error("Enter your callsign");
            return;
        }
        setStep('PIN');
    };

    const handlePinDigit = (digit: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + digit);
        }
    };

    const handlePinDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handleLogin = async () => {
        if (pin.length !== 4) return;
        setLoading(true);

        try {
            const res = await fetch('/api/driver/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companySlug: tenantSlug.toLowerCase(), callsign, pin })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(`Welcome back, ${data.driver.name}`);
                // Store token
                localStorage.setItem('driver_token', data.token);
                localStorage.setItem('driver_info', JSON.stringify(data.driver));

                router.push('/driver/dashboard');
            } else {
                toast.error(data.error || "Login Failed");
                setPin(''); // Reset PIN on failure
            }
        } catch (error) {
            console.error(error);
            toast.error("Connection Error");
            setPin('');
        } finally {
            setLoading(false);
        }
    };

    // Auto-submit when PIN is 4 digits
    if (step === 'PIN' && pin.length === 4 && !loading) {
        // Debounce or just call logic
        // We'll use a useEffect or just let the user click "GO" or auto-trigger? 
        // Let's make it manual "GO" or auto. Auto is nicer.
        handleLogin();
    }

    return (
        <div className="flex flex-col h-screen max-w-md mx-auto bg-zinc-950 p-6">

            {/* Header */}
            <div className="flex flex-col items-center justify-center pt-10 pb-6 space-y-4">
                <div className="h-16 w-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Truck className="h-8 w-8 text-black" />
                </div>
                <div className="text-center">
                    <h1 className="text-2xl font-bold tracking-tight text-white mb-1">Driver Portal</h1>
                    <p className="text-zinc-500 text-sm">Secure Dispatch System</p>
                </div>
            </div>

            {/* Step 1: Callsign */}
            {step === 'CALLSIGN' && (
                <form onSubmit={handleCallsignSubmit} className="flex-1 flex flex-col space-y-4 animate-in fade-in slide-in-from-bottom-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-zinc-500 ml-1">Company Code</label>
                            <Input
                                autoFocus
                                value={tenantSlug}
                                onChange={(e) => setTenantSlug(e.target.value.toLowerCase())}
                                placeholder="e.g. demo-taxis"
                                className="h-14 text-lg bg-zinc-900 border-zinc-800 focus:ring-amber-500 focus:border-amber-500 text-center tracking-widest lowercase"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs uppercase font-bold text-zinc-500 ml-1">Your Callsign</label>
                            <Input
                                value={callsign}
                                onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                                placeholder="e.g. CAB-001"
                                className="h-14 text-lg bg-zinc-900 border-zinc-800 focus:ring-amber-500 focus:border-amber-500 text-center tracking-widest uppercase"
                            />
                        </div>
                    </div>
                    <Button type="submit" className="h-14 text-lg font-bold bg-amber-500 hover:bg-amber-400 text-black w-full shadow-lg shadow-amber-900/20">
                        CONTINUE
                    </Button>

                    <div className="mt-8 text-center">
                        <p className="text-zinc-600 text-xs">
                            Terminated? Contact Dispatch.
                        </p>
                    </div>
                </form>
            )}

            {/* Step 2: PIN Pad */}
            {step === 'PIN' && (
                <div className="flex-1 flex flex-col h-full animate-in fade-in zoom-in-95">
                    <div className="mb-8 text-center">
                        <p className="text-zinc-400 mb-4">Enter PIN for <span className="text-white font-bold">{callsign}</span></p>
                        <div className="flex justify-center gap-4">
                            {[0, 1, 2, 3].map((i) => (
                                <div key={i} className={`w-4 h-4 rounded-full transition-all duration-200 ${pin.length > i ? 'bg-amber-500 scale-110' : 'bg-zinc-800'}`} />
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                            <button
                                key={num}
                                onClick={() => handlePinDigit(num.toString())}
                                disabled={loading || pin.length >= 4}
                                className="h-16 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 text-2xl font-semibold text-white active:scale-95 transition-all flex items-center justify-center"
                            >
                                {num}
                            </button>
                        ))}
                        <button
                            onClick={() => setStep('CALLSIGN')}
                            className="h-16 rounded-xl bg-zinc-900/20 hover:bg-zinc-800 text-xs font-bold text-zinc-500 active:scale-95 transition-all flex items-center justify-center uppercase"
                        >
                            Back
                        </button>
                        <button
                            onClick={() => handlePinDigit("0")}
                            disabled={loading || pin.length >= 4}
                            className="h-16 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 text-2xl font-semibold text-white active:scale-95 transition-all flex items-center justify-center"
                        >
                            0
                        </button>
                        <button
                            onClick={handlePinDelete}
                            className="h-16 rounded-xl bg-zinc-900/20 hover:bg-zinc-800 text-zinc-400 active:scale-95 transition-all flex items-center justify-center"
                        >
                            ⌫
                        </button>
                    </div>

                    {loading && (
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                            <Loader2 className="h-10 w-10 text-amber-500 animate-spin" />
                        </div>
                    )}
                </div>
            )}

            <div className="text-center py-4 text-[10px] text-zinc-700">
                v1.0.0 &bull; Secure Connection
            </div>
        </div>
    );
}
