
'use client';

import { useState, useEffect } from 'react';
import {
    useStripe,
    useElements,
    PaymentElement,
    Elements
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Lock, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

// Initialize Stripe outside of component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

interface CheckoutFormProps {
    amount: number;
    onSuccess: (paymentIntentId: string) => void;
    onError: (error: string) => void;
    onCancel: () => void;
}

function CheckoutForm({ amount, onSuccess, onError, onCancel }: CheckoutFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) return;

        setIsLoading(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                // Return URL is required but we handle success inline via redirect: 'if_required' usually
                // For this modal flow, we want to capture the status here without full redirect if possible,
                // or handle the redirect.
                // STRIPE BEST PRACTICE: Use a return_url.
                return_url: `${window.location.origin}/booking/confirmation`,
            },
            redirect: 'if_required'
        });

        if (error) {
            setMessage(error.message || "Payment failed");
            onError(error.message || "Payment failed");
            setIsLoading(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onSuccess(paymentIntent.id);
        } else {
            setMessage("Unexpected state");
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-zinc-900/50 p-4 rounded-lg border border-white/5">
                <div className="flex justify-between items-center mb-4 text-sm">
                    <span className="text-zinc-400">Total to Pay</span>
                    <span className="text-2xl font-bold text-white">£{amount.toFixed(2)}</span>
                </div>

                <PaymentElement
                    options={{
                        layout: 'tabs',
                        defaultValues: {
                            billingDetails: {
                                name: 'TBA' // Pre-fill if known
                            }
                        }
                    }}
                />
            </div>

            {message && <div className="text-red-400 text-sm bg-red-500/10 p-2 rounded border border-red-500/20">{message}</div>}

            <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading} className="flex-1">
                    Cancel
                </Button>
                <Button type="submit" disabled={isLoading || !stripe || !elements} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
                    Pay £{amount.toFixed(2)}
                </Button>
            </div>
        </form>
    );
}

interface PaymentModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    amount: number; // in pounds (e.g. 10.50)
    currency?: string;
    onPaymentSuccess: (paymentIntentId: string) => void;
    onPaymentError: (error: string) => void;
    bookingDetails?: any;
}

export function PaymentModal({ open, onOpenChange, amount, currency = 'gbp', onPaymentSuccess, onPaymentError, bookingDetails }: PaymentModalProps) {
    const [clientSecret, setClientSecret] = useState<string | null>(null);

    // Create PaymentIntent on open
    useEffect(() => {
        if (open && amount > 0) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setClientSecret(null); // Reset state to prevent stale payment intents
            fetch('/api/create-payment-intent', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount, currency, bookingDetails })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.clientSecret) {
                        setClientSecret(data.clientSecret);
                    } else {
                        console.error("Payment init failed:", data.error);
                        toast.error("Payment Initialization Failed", {
                            description: data.error || "Unknown server error",
                            duration: 5000
                        });
                        onOpenChange(false);
                    }
                })
                .catch(err => {
                    console.error("Payment init fetch error:", err);
                    toast.error("Network Error", {
                        description: "Failed to reach payment server. Please check your connection.",
                        duration: 5000
                    });
                    onOpenChange(false);
                });
        }
    }, [open, amount]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-white/10 text-white">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-emerald-400">
                        <CreditCard className="h-5 w-5" /> Secure Payment
                    </DialogTitle>
                </DialogHeader>

                {clientSecret && (
                    <Elements stripe={stripePromise} options={{
                        clientSecret,
                        appearance: {
                            theme: 'night',
                            variables: { colorPrimary: '#10b981', colorBackground: '#18181b', colorText: '#ffffff' }
                        }
                    }}>
                        <CheckoutForm
                            amount={amount}
                            onSuccess={onPaymentSuccess}
                            onError={onPaymentError}
                            onCancel={() => onOpenChange(false)}
                        />
                    </Elements>
                )}

                {!clientSecret && (
                    <div className="py-12 flex justify-center text-emerald-500">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
