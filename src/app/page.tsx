
import { BookingWizard } from '@/components/booking/booking-wizard';
import { GoogleMapsLoader } from '@/components/dashboard/google-maps-loader';

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black relative flex flex-col">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black opacity-90"></div>
        {/* We could add a background image here in future */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-20 filter blur-sm"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 w-full p-6 flex justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-amber-500 rounded-lg flex items-center justify-center font-bold text-black">Z</div>
          <span className="text-xl font-bold text-white tracking-tight">ZerCabs</span>
        </div>
        <nav className="hidden md:flex gap-6 text-sm font-medium text-zinc-300">
          <a href="#" className="hover:text-white transition-colors">Services</a>
          <a href="#" className="hover:text-white transition-colors">Fleet</a>
          <a href="#" className="hover:text-white transition-colors">Business</a>
          <a href="#" className="hover:text-white transition-colors">Contact</a>
        </nav>
        <a href="/login" className="text-sm font-bold text-amber-500 hover:text-amber-400">Driver Login</a>
      </header>

      {/* Hero Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        <div className="text-center mb-10 space-y-4 max-w-2xl px-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
          <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight leading-tight">
            Premium Travel,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">Redefined.</span>
          </h1>
          <p className="text-lg text-zinc-400">
            Experience the ultimate in comfort and reliability. Book your chauffeur service in seconds.
          </p>
        </div>

        {/* Booking Wizard Container */}
        <div className="w-full animate-in fade-in slide-in-from-bottom-10 duration-1000 delay-200">
          <GoogleMapsLoader>
            <BookingWizard />
          </GoogleMapsLoader>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 w-full p-6 text-center text-zinc-600 text-xs">
        &copy; 2026 ZerCabs. All rights reserved.
      </footer>
    </main>
  );
}
