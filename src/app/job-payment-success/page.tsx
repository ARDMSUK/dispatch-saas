import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

export default async function JobPaymentSuccessPage({
    searchParams
}: {
    searchParams: Promise<{ jobId?: string }>
}) {
    // Await searchParams as required by Next.js 15+ Server Components
    const { jobId } = await searchParams;

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
                <div className="flex justify-center">
                    <CheckCircle2 className="h-16 w-16 text-green-500" />
                </div>
                
                <h1 className="text-2xl font-bold text-gray-900">Payment Received</h1>
                
                <div className="space-y-2 text-gray-600">
                    <p>Thank you. Your booking/payment has been confirmed.</p>
                    {jobId && (
                        <p className="text-sm font-medium mt-2">
                            Payment reference: Booking #{jobId}
                        </p>
                    )}
                </div>

                <div className="pt-6">
                    <Link 
                        href="/dashboard"
                        className="inline-block bg-blue-600 text-white hover:bg-blue-700 px-6 py-2.5 rounded-lg font-medium transition-colors"
                    >
                        Close / Return to Dashboard
                    </Link>
                </div>
            </div>
        </div>
    );
}
