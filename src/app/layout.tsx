import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from 'sonner';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CABAI | Operator Console",
  description: "Premium Dispatch Platform",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-900`}
        suppressHydrationWarning
      >
        <SessionProvider session={session}>
          {children}
          <ServiceWorkerRegister />
        </SessionProvider>
        <Toaster position="top-right" theme="dark" richColors />
      </body>
    </html>
  );
}
