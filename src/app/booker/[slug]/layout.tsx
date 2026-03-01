import "@/app/globals.css";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
    title: "Book a Taxi",
    description: "Book your ride instantly.",
};

export default function BookerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark h-full">
            <body className={`${inter.className} min-h-screen bg-transparent antialiased m-0 p-0`}>
                <main className="w-full h-full bg-zinc-950/80 sm:bg-transparent">
                    {children}
                </main>
                <Toaster />
            </body>
        </html>
    );
}
