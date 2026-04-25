import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Link>
        
        <h1 className="text-3xl font-black mb-6">Terms and Conditions</h1>
        <div className="prose prose-slate max-w-none text-slate-600">
          <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Acceptance of Terms</h2>
          <p className="mb-4">
            By accessing and using the CABAI platform ("Service"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you may not use our Service.
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. Description of Service</h2>
          <p className="mb-4">
            CABAI provides a dispatch and fleet management platform for transport operators. Features vary by subscription tier and may include automated dispatch, driver settlements, AI agents, and passenger applications.
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. Operator Responsibilities</h2>
          <p className="mb-4">
            Operators are fully responsible for managing their drivers, ensuring all vehicles and drivers meet legal compliance requirements, and handling any disputes arising directly with their passengers.
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">4. Payment and Billing</h2>
          <p className="mb-4">
            Subscription fees are billed in advance on a recurring basis. Operators must maintain valid payment information. Failure to pay may result in suspension or termination of access to the platform.
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">5. Limitation of Liability</h2>
          <p className="mb-4">
            CABAI acts solely as a technology provider and is not liable for indirect, incidental, or consequential damages resulting from the use or inability to use the platform, including but not limited to lost profits or data.
          </p>
        </div>
      </div>
    </div>
  );
}
