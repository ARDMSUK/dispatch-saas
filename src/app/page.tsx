import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ComingSoonPage() {
  return (
    <main className="min-h-screen bg-black relative flex flex-col">
      {/* Background with abstract gradient */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute -top-[40%] -right-[10%] w-[70%] h-[70%] rounded-full bg-yellow-500/10 blur-[120px]"></div>
        <div className="absolute -bottom-[40%] -left-[10%] w-[70%] h-[70%] rounded-full bg-slate-800/40 blur-[120px]"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 w-full p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl flex items-center justify-center font-black text-black text-xl shadow-lg shadow-yellow-500/20">C</div>
          <span className="text-2xl font-black text-white tracking-tight">CABAI</span>
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="outline" className="bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white backdrop-blur-sm transition-all rounded-full px-6">
              Operator Login
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-20 px-4">
        <div className="text-center space-y-8 max-w-3xl px-4 animate-in fade-in slide-in-from-bottom-8 duration-1000">
          
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-semibold tracking-wide uppercase">
            <span>Launching Soon</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight leading-[1.1]">
            The Future of <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-200 to-yellow-500">
              Mobility
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto font-light leading-relaxed">
            We are building something extraordinary. The smartest dispatch network and booking experience is arriving shortly on iOS and Android.
          </p>

          <div className="pt-8 flex flex-col items-center gap-4">
            <div className="flex gap-4 opacity-70">
              <div className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-3">
                <span className="text-2xl">🍎</span>
                <span className="text-white font-medium">App Store</span>
              </div>
              <div className="px-6 py-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md flex items-center gap-3">
                <span className="text-2xl">🤖</span>
                <span className="text-white font-medium">Google Play</span>
              </div>
            </div>
            <p className="text-sm text-slate-500 mt-4">Apps currently under review by Apple and Google.</p>
          </div>

        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full p-8 border-t border-white/5 bg-black/50 backdrop-blur-xl text-slate-500 text-sm mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="font-semibold text-slate-300 mb-1">CABAI Ltd</p>
            <p>71-75 Shelton Street, Covent Garden, London, WC2H 9JQ</p>
            <p className="mt-2">Phone: <a href="tel:02034321381" className="text-yellow-500/80 hover:text-yellow-400">0203 432 1381</a> | Email: <a href="mailto:hello@cabai.co.uk" className="text-yellow-500/80 hover:text-yellow-400">hello@cabai.co.uk</a></p>
          </div>
          
          <div className="flex gap-6 font-medium">
            <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
