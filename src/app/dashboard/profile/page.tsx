"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { QrCode, ShieldCheck, ShieldAlert, Loader2 } from "lucide-react";
import Image from "next/image";

export default function ProfileSecurityPage() {
    const [loadingSetup, setLoadingSetup] = useState(false);
    const [qrCodeData, setQrCodeData] = useState<{ secret: string; qrCode: string } | null>(null);
    const [verifyToken, setVerifyToken] = useState("");
    const [verifying, setVerifying] = useState(false);
    const [twoFactorActive, setTwoFactorActive] = useState<{ isActive: boolean, checked: boolean }>({ isActive: false, checked: false });

    // Note: In a real app we'd fetch the user's current 2FA status from the server on load.
    // For this demonstration, we'll assume they are setting it up newly, 
    // or we can just rely on the UI state after verifying.

    const initiate2FASetup = async () => {
        setLoadingSetup(true);
        try {
            const res = await fetch('/api/auth/2fa/setup', { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                setQrCodeData({ secret: data.secret, qrCode: data.qrCode });
            } else {
                toast.error(data.error || "Failed to initiate 2FA setup");
            }
        } catch (error) {
            console.error(error);
            toast.error("An unexpected error occurred");
        } finally {
            setLoadingSetup(false);
        }
    };

    const confirm2FASetup = async () => {
        if (!verifyToken || verifyToken.length !== 6) {
            toast.error("Please enter a valid 6-digit code");
            return;
        }

        setVerifying(true);
        try {
            const res = await fetch('/api/auth/2fa/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: verifyToken })
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message);
                setTwoFactorActive({ isActive: true, checked: true });
                setQrCodeData(null); // Clear setup UI
            } else {
                toast.error(data.error || "Invalid code, please try again");
            }
        } catch (error) {
            console.error(error);
            toast.error("Verification failed");
        } finally {
            setVerifying(false);
        }
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-white min-h-screen text-slate-900">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">My Profile & Security</h2>
            </div>
            <p className="text-slate-500 mb-8">Manage your personal account settings and security preferences.</p>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                {/* 2FA Card */}
                <Card className="bg-slate-100 border-slate-200 text-slate-900">
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-blue-700" />
                            <CardTitle>Two-Factor Authentication (2FA)</CardTitle>
                        </div>
                        <CardDescription className="text-slate-500">
                            Add an extra layer of security to your account using an Authenticator app (like Google Authenticator or Authy).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {twoFactorActive.isActive ? (
                            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-md">
                                <ShieldCheck className="h-6 w-6 text-emerald-600" />
                                <div>
                                    <h4 className="font-medium text-emerald-600">2FA is Enabled</h4>
                                    <p className="text-sm text-emerald-500/80">Your account is secured with two-factor authentication.</p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {!qrCodeData ? (
                                    <div className="flex flex-col items-start gap-4">
                                        <div className="flex items-center gap-3 bg-blue-700/10 border border-blue-700/20 p-4 rounded-md w-full">
                                            <ShieldAlert className="h-6 w-6 text-blue-600 shrink-0" />
                                            <div>
                                                <h4 className="font-medium text-blue-600">2FA is Not Enabled</h4>
                                                <p className="text-sm text-blue-700/80">We highly recommend enabling 2FA to protect your account from unauthorized access.</p>
                                            </div>
                                        </div>
                                        <Button
                                            onClick={initiate2FASetup}
                                            disabled={loadingSetup}
                                            className="bg-slate-200 hover:bg-zinc-700 text-slate-900"
                                        >
                                            {loadingSetup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <QrCode className="mr-2 h-4 w-4" />}
                                            Setup Authenticator App
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-6">
                                        <div className="bg-white p-4 inline-block justify-center rounded-lg">
                                            <img src={qrCodeData.qrCode} alt="2FA QR Code" className="w-48 h-48" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium mb-1">Manual Entry Code:</p>
                                            <code className="bg-white border border-slate-200 p-2 rounded block font-mono text-blue-600 tracking-wider text-center text-lg">
                                                {qrCodeData.secret}
                                            </code>
                                        </div>

                                        <div className="space-y-3 pt-4 border-t border-slate-200">
                                            <label className="text-sm font-medium">Verify Code from App</label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={verifyToken}
                                                    onChange={(e) => setVerifyToken(e.target.value)}
                                                    placeholder="Enter 6-digit code"
                                                    maxLength={6}
                                                    className="bg-white border-slate-200 text-center text-lg tracking-widest focus:ring-blue-700 font-mono"
                                                />
                                                <Button
                                                    onClick={confirm2FASetup}
                                                    disabled={verifying || verifyToken.length !== 6}
                                                    className="bg-blue-700 text-black hover:bg-blue-800 font-bold"
                                                >
                                                    {verifying ? "..." : "Verify"}
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
