import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Car, Shield, Zap, MessageSquare, TrendingUp, Smartphone, CheckCircle2 } from 'lucide-react';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 relative flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black opacity-95"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-10 filter blur-sm"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 w-full p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-yellow-400 rounded-lg flex items-center justify-center font-bold text-black">C</div>
          <span className="text-xl font-bold text-white tracking-tight">CABAI Operator Portal</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
          <Link href="#core-features" className="hover:text-white transition-colors">Core Features</Link>
          <Link href="#premium-upgrades" className="hover:text-yellow-400 transition-colors">Premium Upgrades</Link>
        </nav>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="outline" className="bg-transparent border-slate-700 text-white hover:bg-slate-800">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <div className="relative z-10 flex flex-col items-center justify-center py-20 px-4">
        <div className="text-center mb-16 space-y-6 max-w-4xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-yellow-400 text-sm font-medium mb-4">
            <Zap className="h-4 w-4" /> Welcome to your Fleet Management Hub
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Manage your fleet.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">Automate your growth.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Access your operator console to dispatch drivers, manage vehicle compliance, handle settlements, and explore powerful AI upgrades to scale your operations.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/login">
              <Button size="lg" className="bg-yellow-400 text-zinc-900 hover:bg-yellow-500 font-bold text-lg px-8 h-14">
                Access Dashboard <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Core Features */}
        <div id="core-features" className="w-full max-w-6xl mt-10 scroll-mt-24">
          <h2 className="text-3xl font-bold text-white text-center mb-10">Your Included Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm hover:border-slate-700 transition-all">
              <div className="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
                <Car className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Live Dispatch</h3>
              <p className="text-slate-400">Track drivers in real-time, assign jobs manually or via basic auto-dispatch algorithms.</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm hover:border-slate-700 transition-all">
              <div className="h-12 w-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
                <Shield className="h-6 w-6 text-emerald-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Driver Compliance</h3>
              <p className="text-slate-400">Manage vehicle documents, MOTs, and driver licenses securely with automated expiry alerts.</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm hover:border-slate-700 transition-all">
              <div className="h-12 w-12 bg-indigo-500/10 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-indigo-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Driver Settlements</h3>
              <p className="text-slate-400">Calculate commissions, handle cash/card balancing, and manage payout analytics instantly.</p>
            </div>
          </div>
        </div>

        {/* Premium Upgrades Teaser */}
        <div id="premium-upgrades" className="w-full max-w-6xl mt-24 mb-10 scroll-mt-24">
          <div className="bg-gradient-to-r from-slate-900 to-black border border-yellow-500/30 rounded-3xl p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="inline-block bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm font-semibold mb-6 border border-yellow-500/30">
                Unlock More Power
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Ready to automate your booking flow?</h2>
              <p className="text-lg text-slate-300 max-w-2xl mb-8">
                Upgrade your tenant package to access cutting-edge AI tools that handle customer queries and take bookings 24/7 without human intervention.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <MessageSquare className="h-8 w-8 text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">WhatsApp AI Agent</h4>
                    <p className="text-slate-400">An autonomous AI bot that converses with customers on WhatsApp, gathers journey details, quotes prices, and inserts jobs directly into your dispatch system.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <Smartphone className="h-8 w-8 text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">White-label Passenger App</h4>
                    <p className="text-slate-400">Give your customers a branded mobile app experience to book rides, track their driver, and pay securely via Stripe.</p>
                  </div>
                </div>
              </div>
              
              <Link href="/login">
                <Button variant="outline" className="border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-black font-semibold">
                  Explore Upgrades in Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full p-6 text-center border-t border-slate-800 bg-black/50 backdrop-blur-md text-slate-500 text-sm mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} CABAI Platform. Tenant Portal.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-white transition-colors">Support</Link>
            <Link href="/login" className="hover:text-white transition-colors">Billing</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
