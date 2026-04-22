import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Car, Shield, Zap, Globe } from 'lucide-react';

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
          <span className="text-xl font-bold text-white tracking-tight">CABAI</span>
        </div>
        <nav className="hidden md:flex gap-8 text-sm font-medium text-slate-300">
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#platform" className="hover:text-white transition-colors">Platform</a>
          <a href="#about" className="hover:text-white transition-colors">About Us</a>
        </nav>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="outline" className="bg-transparent border-slate-700 text-white hover:bg-slate-800">
              Operator Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-10 space-y-6 max-w-4xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700 text-yellow-400 text-sm font-medium mb-4">
            <Zap className="h-4 w-4" /> Next-Generation Dispatch Platform
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-tight">
            The intelligent engine for<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600">modern transport fleets.</span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            CABAI empowers operators with autonomous booking, AI-driven dispatch, and complete white-label tenant management.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
            <Link href="/login">
              <Button size="lg" className="bg-yellow-400 text-zinc-900 hover:bg-yellow-500 font-bold text-lg px-8 h-14">
                Access Operator Console <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl w-full px-4 mt-16 animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
            <div className="h-12 w-12 bg-yellow-400/10 rounded-xl flex items-center justify-center mb-4">
              <Car className="h-6 w-6 text-yellow-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Automated Dispatch</h3>
            <p className="text-slate-400">Intelligent routing and job assignment powered by real-time spatial algorithms.</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
            <div className="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-4">
              <Globe className="h-6 w-6 text-blue-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Multi-Tenant Scale</h3>
            <p className="text-slate-400">Launch and manage hundreds of localized fleets with fully white-labeled passenger apps.</p>
          </div>
          <div className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl backdrop-blur-sm">
            <div className="h-12 w-12 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-4">
              <Shield className="h-6 w-6 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Enterprise Security</h3>
            <p className="text-slate-400">Bank-grade security and role-based access controls for your entire operational staff.</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full p-6 text-center border-t border-slate-800 bg-black/50 backdrop-blur-md text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} CABAI Platform. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
