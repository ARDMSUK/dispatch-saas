"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { useSession } from "next-auth/react";

const formSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

export default function ForceResetPage() {
    const router = useRouter();
    const { update } = useSession(); // Used to trigger session refresh
    
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/force-reset", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword: values.password }),
            });

            if (res.ok) {
                setSuccess(true);
                // Refresh NextAuth session to drop the forcePasswordReset flag
                await update();
                setTimeout(() => {
                    router.push("/dashboard");
                }, 2000);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to update password");
            }
        } catch (err) {
            console.error(err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    if (success) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-100">
                <Card className="w-full max-w-md border-slate-200 bg-white text-slate-900 shadow-xl p-8">
                    <div className="flex flex-col items-center justify-center text-center space-y-4">
                        <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                        <p className="text-xl font-bold text-slate-900">Password Updated</p>
                        <p className="text-sm text-slate-500">Redirecting to your dashboard...</p>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-100 p-4">
            <Card className="w-full max-w-md border-slate-200 bg-white text-slate-900 shadow-xl">
                <CardHeader className="space-y-2 text-center">
                    <div className="flex justify-center mb-2">
                        <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                            <ShieldAlert className="h-7 w-7" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Action Required</CardTitle>
                    <CardDescription className="text-slate-500">
                        You are using a temporary password. For security reasons, please change your password to continue to the dashboard.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium">New Password</label>
                            <Input
                                type="password"
                                {...register("password")}
                                placeholder="••••••••"
                                className="bg-slate-100 border-slate-200 text-slate-900 focus:ring-blue-600 focus:border-blue-600"
                            />
                            {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium">Confirm New Password</label>
                            <Input
                                type="password"
                                {...register("confirmPassword")}
                                placeholder="••••••••"
                                className="bg-slate-100 border-slate-200 text-slate-900 focus:ring-blue-600 focus:border-blue-600"
                            />
                            {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
                        </div>

                        {error && <div className="text-sm text-red-500 text-center font-bold bg-red-50 p-2 rounded">{error}</div>}

                        <Button
                            type="submit"
                            className="w-full bg-blue-700 text-white hover:bg-blue-800 font-bold"
                            disabled={loading}
                        >
                            {loading ? "Updating..." : "Update Password"}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
