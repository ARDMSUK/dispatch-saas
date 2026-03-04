"use client";

import { useState, Suspense } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Car, AlertTriangle, CheckCircle2 } from "lucide-react";

const formSchema = z.object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");

    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    const { register, handleSubmit, formState: { errors } } = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
    });

    if (!token) {
        return (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
                <AlertTriangle className="h-12 w-12 text-red-500" />
                <p className="text-red-400 font-bold">Invalid Reset Link</p>
                <p className="text-sm text-slate-500">The link you followed is missing a valid security token.</p>
                <a href="/forgot-password" className="text-yellow-400 hover:text-yellow-300 transition-colors mt-4 text-sm font-bold block">
                    Request a new link
                </a>
            </div>
        );
    }

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setLoading(true);
        setError("");

        try {
            const res = await fetch("/api/auth/reset-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, newPassword: values.password }),
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    router.push("/login");
                }, 3000);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to reset password");
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
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
                <CheckCircle2 className="h-12 w-12 text-green-500" />
                <p className="text-emerald-600 font-medium">Password Updated!</p>
                <p className="text-sm text-slate-500">Redirecting you to login...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
                <label className="text-sm font-medium">New Password</label>
                <Input
                    type="password"
                    {...register("password")}
                    placeholder="••••••••"
                    className="bg-slate-100 border-slate-200 text-slate-900 focus:ring-yellow-400 focus:border-yellow-400"
                />
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium">Confirm Password</label>
                <Input
                    type="password"
                    {...register("confirmPassword")}
                    placeholder="••••••••"
                    className="bg-slate-100 border-slate-200 text-slate-900 focus:ring-yellow-400 focus:border-yellow-400"
                />
                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
            </div>

            {error && <div className="text-sm text-red-500 text-center font-bold bg-red-900/20 p-2 rounded">{error}</div>}

            <Button
                type="submit"
                className="w-full bg-yellow-400 text-zinc-900 hover:bg-yellow-500 font-bold"
                disabled={loading}
            >
                {loading ? "Updating..." : "Reset Password"}
            </Button>
        </form>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-100">
            <Card className="w-full max-w-md border-slate-200 bg-white text-slate-900 shadow-xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 bg-yellow-400 rounded-full flex items-center justify-center text-zinc-900">
                            <Car className="h-8 w-8" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Secure Reset</CardTitle>
                    <CardDescription className="text-slate-500">
                        Create a strong, new password for your account.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Suspense fallback={<div className="text-center text-slate-400">Loading secure environment...</div>}>
                        <ResetPasswordForm />
                    </Suspense>
                </CardContent>
            </Card>
        </div>
    );
}
