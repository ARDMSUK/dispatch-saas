
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { signIn } from "next-auth/react"; // Client-side signin (beta: import from next-auth/react)
// Note: In v5 beta, signIn is also server action, but for client form we use `next-auth/react` 
// or calling server action wrapping `signIn`. for now let's use client fetch to avoids issues.
// Wait, in v5, `import { signIn } from "next-auth/react"` is deprecated for `import { signIn } from "@/auth"` if server
// But this is a client component.
// Let's use standard form action approach if possible or simple fetch.
// Actually, standard approach in v5 is server actions.
// But we are in a client component.
// Let's stick to the classic `signIn` from `next-auth/react` which calls the API route.

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { Car } from "lucide-react";

// For client side usage in NextAuth v5, we often still install next-auth/react
// If not installed, we might get error. I'll rely on what's installed.
// If `signIn` is missing, I will have to use a Server Action.

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
            email: "digitaldmagency@gmail.com",
            password: "pasword123", // Pre-filled for development
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
                    setError(""); // Clear error to just show the new field
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
        <div className="flex h-screen w-full items-center justify-center bg-slate-100">
            <Card className="w-full max-w-md border-slate-200 bg-white text-slate-900 shadow-xl">
                <CardHeader className="space-y-1 text-center">
                    <div className="flex justify-center mb-4">
                        <div className="h-12 w-12 bg-yellow-400 rounded-full flex items-center justify-center text-zinc-900">
                            <Car className="h-8 w-8" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl font-bold">Dispatch SaaS</CardTitle>
                    <CardDescription className="text-slate-500">
                        Enter your credentials to access the console
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        {!showTwoFactor ? (
                            <>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Email</label>
                                    <Input
                                        {...register("email")}
                                        placeholder="dispatcher@example.com"
                                        className="bg-slate-100 border-slate-200 text-slate-900 focus:ring-yellow-400 focus:border-yellow-400"
                                    />
                                    {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
                                </div>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <label className="text-sm font-medium">Password</label>
                                        <a href="/forgot-password" className="text-xs text-yellow-500 hover:text-yellow-400">Forgot password?</a>
                                    </div>
                                    <Input
                                        type="password"
                                        {...register("password")}
                                        placeholder="••••••••"
                                        className="bg-slate-100 border-slate-200 text-slate-900 focus:ring-yellow-400 focus:border-yellow-400"
                                    />
                                    {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
                                </div>
                            </>
                        ) : (
                            <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4">
                                <label className="text-sm font-medium text-amber-500">Authenticator Code (2FA)</label>
                                <p className="text-xs text-slate-500 mb-2">Please open your Authenticator app and enter the 6-digit code.</p>
                                <Input
                                    {...register("twoFactorToken")}
                                    placeholder="000111"
                                    maxLength={6}
                                    className="bg-slate-100 border-slate-200 text-amber-500 text-center text-2xl tracking-[0.5em] focus:ring-amber-500 focus:border-amber-500 h-14 font-mono"
                                />
                                {errors.twoFactorToken && <p className="text-xs text-red-500">{errors.twoFactorToken.message}</p>}
                            </div>
                        )}

                        {error && <div className="text-sm text-red-500 text-center font-bold bg-red-900/20 p-2 rounded">{error}</div>}

                        <Button
                            type="submit"
                            className="w-full bg-yellow-400 text-zinc-900 hover:bg-yellow-500 font-bold"
                            disabled={loading}
                        >
                            {loading ? "Authenticating..." : showTwoFactor ? "Verify" : "Sign In"}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center text-xs text-slate-400">
                    Protected by Dispatch Authority System
                </CardFooter>
            </Card>

            {/* Quick Helper for Demo */}
            <div className="absolute bottom-4 left-4 text-slate-500 text-xs font-mono">
                <p>Dev Login:</p>
                <p>user: digitaldmagency@gmail.com</p>
                <p>pass: pasword123</p>
            </div>
        </div>
    );
}
