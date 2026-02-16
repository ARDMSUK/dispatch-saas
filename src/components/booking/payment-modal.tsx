
'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Initialize Stripe outside component
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

type PaymentModalProps = {
    amount: number; // in pounds
    currency?: string;
    bookingId?: number;
    onSuccess: (paymentIntentId: string) => void;
    onCancel: () => void;
};

function PaymentForm({ amount, onSuccess }: { amount: number, onSuccess: (pid: string) => void }) {
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
                // Return URL is required, but we can handle redirect via redirect: 'if_required' usually
                return_url: `${window.location.origin}/payment-success`,
            },
            redirect: 'if_required'
        });

        if (error) {
            setMessage(error.message || "Payment Failed");
            setIsLoading(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            toast.success("Payment Successful!");
            onSuccess(paymentIntent.id);
        } else {
            setMessage("Unexpected state.");
            setIsLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <PaymentElement />
            {message && <div className="text-red-500 text-sm">{message}</div>}
            <Button
                disabled={isLoading || !stripe || !elements}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold h-12 rounded-xl"
            >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : `Pay £${amount.toFixed(2)}`}
            </Button>
        </form>
    );
}

export function PaymentModal({ amount, bookingId, onSuccess, onCancel }: PaymentModalProps) {
    const [clientSecret, setClientSecret] = useState<string | null>(null);

    useEffect(() => {
        // Create PaymentIntent on mount
        fetch('/api/create-payment-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount, bookingId })
        })
            .then(res => res.json())
            .then(data => setClientSecret(data.clientSecret))
            .catch(err => console.error("Stripe Init Failed", err));
    }, [amount, bookingId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">Secure Payment</h3>
                    <button onClick={onCancel} className="text-zinc-400 hover:text-white">Close</button>
                </div>

                {clientSecret ? (
                    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'night' } }}>
                        <PaymentForm amount={amount} onSuccess={onSuccess} />
                    </Elements>
                ) : (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
                    </div>
                )}
            </div>
        </div>
    );
}
