"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Car, CheckCircle2 } from "lucide-react";

const formSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

export default function ForgotPasswordPage() {
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
            const res = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: values.email }),
            });

            if (res.ok) {
                setSuccess(true);
            } else {
                const data = await res.json();
                setError(data.error || "Failed to process request");
            }
        } catch (err) {
            console.error(err);
            setError("An unexpected error occurred. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex h-screen w-full items-center justify-center bg-slate-100">
            <Card className="w-full max-w-md border-slate-200 bg-white text-slate-900 shadow-xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 bg-yellow-400 rounded-full flex items-center justify-center text-zinc-900">
                            <Car className="h-8 w-8" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Account Recovery</CardTitle>
                    <CardDescription className="text-slate-500">
                        Enter your email to receive a password reset link.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {success ? (
                        <div className="flex flex-col items-center justify-center text-center space-y-4 py-4">
                            <CheckCircle2 className="h-12 w-12 text-green-500" />
                            <p className="text-emerald-600 font-medium">Reset link sent!</p>
                            <p className="text-sm text-slate-500">If an account exists for that email, we have sent a password reset link.</p>
                            <a href="/login" className="text-yellow-400 hover:text-yellow-300 transition-colors mt-4 text-sm font-bold block">
                                Return to Login
                            </a>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Email Address</label>
                                <Input
                                    {...register("email")}
                                    placeholder="dispatcher@example.com"
                                    className="bg-slate-100 border-slate-200 text-slate-900 focus:ring-yellow-400 focus:border-yellow-400"
                                />
                                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                            </div>

                            {error && <div className="text-sm text-red-500 text-center font-bold bg-red-900/20 p-2 rounded">{error}</div>}

                            <Button
                                type="submit"
                                className="w-full bg-yellow-400 text-zinc-900 hover:bg-yellow-500 font-bold"
                                disabled={loading}
                            >
                                {loading ? "Sending..." : "Send Reset Link"}
                            </Button>

                            <div className="text-center mt-4">
                                <a href="/login" className="text-slate-500 hover:text-slate-900 transition-colors text-sm">
                                    &larr; Back to login
                                </a>
                            </div>
                        </form>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
