import type { Metadata } from "next";
import Image from "next/image";
import { Geist, Geist_Mono } from "next/font/google";
import NavBar from "@/components/NavBar";
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
  title: "Jordan Football",
  description: "Schedule, film, and opponent scouting for Jordan Beetdiggers football.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-steel-50 text-steel-900">
        <NavBar />
        <main className="flex-1">{children}</main>
        <footer className="mt-16 border-t border-steel-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-steel-500 sm:flex-row">
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="" width={32} height={25} aria-hidden />
              <p className="font-bold tracking-tight text-maroon-700">JORDAN BEETDIGGERS FOOTBALL</p>
            </div>
            <p>Schedule · Film · Scouting</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
