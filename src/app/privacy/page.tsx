import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <Link href="/" className="inline-flex items-center text-slate-500 hover:text-slate-900 mb-8 transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
        </Link>
        
        <h1 className="text-3xl font-black mb-6">Privacy Policy</h1>
        <div className="prose prose-slate max-w-none text-slate-600">
          <p className="mb-4">Last updated: {new Date().toLocaleDateString()}</p>
          
          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">1. Information We Collect</h2>
          <p className="mb-4">
            We collect information that you provide directly to us, including account details, payment information, and configuration data for your dispatch operations. We also collect data automatically concerning your usage of the CABAI platform.
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">2. How We Use Information</h2>
          <p className="mb-4">
            We use the collected information to operate, maintain, and provide the features of the Service. This includes processing transactions, sending administrative notices, and offering customer support.
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">3. Data Sharing and Disclosure</h2>
          <p className="mb-4">
            We do not sell your personal information. We may share information with third-party vendors and service providers who perform services on our behalf (such as payment processing via Stripe or AI integrations via OpenAI).
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">4. Data Security</h2>
          <p className="mb-4">
            We implement commercially reasonable security measures to protect your data. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
          </p>

          <h2 className="text-xl font-bold text-slate-900 mt-8 mb-4">5. Your Rights</h2>
          <p className="mb-4">
            You may update or correct your account information at any time through your dashboard settings. You may also request deletion of your account and associated data by contacting our support team.
          </p>
        </div>
      </div>
    </div>
  );
}
