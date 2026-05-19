"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";
import { Car, CheckCircle2, ShieldCheck, Zap } from "lucide-react";

const formSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1, "Password is required"),
    twoFactorToken: z.string().optional(),
});

export default function LoginPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showTwoFactor, setShowTwoFactor] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
            twoFactorToken: "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        setError("");

        try {
            const { signIn } = await import("next-auth/react");

            const res = await signIn("credentials", {
                email: values.email,
                password: values.password,
                twoFactorToken: values.twoFactorToken,
                redirect: false,
            });

            if (res?.error) {
                if (res.error === "2FA_REQUIRED") {
                    setShowTwoFactor(true);
                    setError(""); 
                } else if (res.error === "INVALID_2FA_TOKEN") {
                    setError("Invalid Authenticator code. Please try again.");
                } else {
                    setError("Invalid email or password");
                }
            } else {
                router.push("/dashboard");
                router.refresh();
            }
        } catch (err) {
            console.error(err);
            setError("Something went wrong");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex min-h-screen w-full bg-white font-sans">
            {/* Left Side: Login Form */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 md:px-16 lg:px-24 xl:px-32 relative z-10 bg-white">
                <div className="w-full max-w-sm mx-auto">
                    <div className="flex items-center gap-3 mb-12">
                        <img src="/logo-full.png" alt="CABAI" className="h-10 object-contain" />
                    </div>

                    <div className="mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">Welcome back</h1>
                        <p className="text-slate-500 font-medium">Log in to your operator console.</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                        {!showTwoFactor ? (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-slate-700">Email Address</label>
                                    <Input
                                        {...register("email")}
                                        placeholder="operator@fleet.com"
                                        className="h-12 bg-slate-50 border-slate-200 text-slate-900 focus:ring-slate-900 focus:border-slate-900"
                                    />
                                    {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-bold text-slate-700">Password</label>
                                        <a href="/forgot-password" className="text-xs font-semibold text-blue-600 hover:text-blue-700">Forgot password?</a>
                                    </div>
                                    <Input
                                        type="password"
                                        {...register("password")}
                                        placeholder="••••••••"
                                        className="h-12 bg-slate-50 border-slate-200 text-slate-900 focus:ring-slate-900 focus:border-slate-900"
                                    />
                                    {errors.password && <p className="text-xs text-red-500 font-medium">{errors.password.message}</p>}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 bg-blue-50 p-6 rounded-2xl border border-blue-100">
                                <label className="text-sm font-bold text-blue-900">Authenticator Code (2FA)</label>
                                <p className="text-xs text-blue-700 mb-2 font-medium">Please open your Authenticator app and enter the 6-digit code.</p>
                                <Input
                                    {...register("twoFactorToken")}
                                    placeholder="000111"
                                    maxLength={6}
                                    className="bg-white border-blue-200 text-blue-900 text-center text-3xl tracking-[0.5em] focus:ring-blue-600 focus:border-blue-600 h-16 font-mono font-bold shadow-sm"
                                />
                                {errors.twoFactorToken && <p className="text-xs text-red-500 font-medium">{errors.twoFactorToken.message}</p>}
                            </div>
                        )}

                        {error && <div className="text-sm text-red-600 text-center font-bold bg-red-50 p-3 rounded-xl border border-red-100">{error}</div>}

                        <Button
                            type="submit"
                            className="w-full h-12 bg-slate-900 hover:bg-slate-800 text-white font-bold text-base rounded-xl mt-4 shadow-md"
                            disabled={loading}
                        >
                            {loading ? "Authenticating..." : showTwoFactor ? "Verify Identity" : "Sign In"}
                        </Button>
                    </form>

                    <div className="mt-12 text-center text-xs font-medium text-slate-400">
                        Protected by CABAI System Security • v2.1.0
                    </div>
                </div>
            </div>

            {/* Right Side: Marketing / Details */}
            <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white relative overflow-hidden flex-col justify-between p-12">
                <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-20"></div>
                
                <div className="relative z-10 mt-12 max-w-lg">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold tracking-wide mb-6">
                        System Status: Operational
                    </div>
                    <h2 className="text-4xl font-black tracking-tight mb-6 leading-tight">
                        The Operating System for Modern Fleets.
                    </h2>
                    <p className="text-slate-400 text-lg leading-relaxed mb-12">
                        Welcome to CABAI Dispatch. Our secure, cloud-based platform connects you with your drivers and passengers in real-time.
                    </p>

                    <div className="space-y-6">
                        <div className="flex gap-4">
                            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                <Zap className="h-5 w-5 text-yellow-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white mb-1">AI-Powered Dispatch</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">Our advanced algorithm assigns bookings faster and more efficiently, minimizing dead mileage.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white mb-1">Enterprise Grade Security</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">Your data is fully encrypted and backed up across multiple data centers for 99.99% uptime.</p>
                            </div>
                        </div>
                        <div className="flex gap-4">
                            <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-bold text-white mb-1">Continuous Updates</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">We push new features and optimizations seamlessly without any disruption to your business.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="relative z-10 pt-12 border-t border-white/10 flex justify-between items-center text-sm text-slate-500 font-medium">
                    <p>© CABAI Ltd.</p>
                    <div className="flex gap-4">
                        <a href="mailto:support@cabai.co.uk" className="hover:text-white transition-colors">Support</a>
                        <a href="#" className="hover:text-white transition-colors">Documentation</a>
                    </div>
                </div>

                {/* Decorative circles */}
                <div className="absolute top-0 right-0 -translate-y-12 translate-x-1/3 w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 translate-y-1/3 translate-x-1/3 w-[600px] h-[600px] bg-yellow-500/10 rounded-full blur-[120px] pointer-events-none"></div>
            </div>
        </div>
    );
}
