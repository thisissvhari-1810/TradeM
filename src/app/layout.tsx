import Script from "next/script";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, Manrope, Newsreader } from "next/font/google";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });
const newsreader = Newsreader({ variable: "--font-newsreader", subsets: ["latin"], style: ["normal", "italic"] });
const plex = IBM_Plex_Mono({ variable: "--font-plex", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "TradeLab",
  description: "Educational paper-trading simulator. Virtual money only. No brokerage connection.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="obsidian" className={`${manrope.variable} ${newsreader.variable} ${plex.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-text">
        <Script id="theme" strategy="beforeInteractive">{`try{var path=location.pathname;var pub=path==="/"||path==="/login"||path==="/forgot-password"||path==="/reset-password"||path==="/setup";if(pub){document.documentElement.dataset.theme="obsidian";}else{var ok=["terminal","obsidian","amber","navy","exchange"];var t=localStorage.getItem("tl-theme");if(ok.indexOf(t)>=0)document.documentElement.dataset.theme=t;else localStorage.setItem("tl-theme","obsidian");}}catch(e){}`}</Script>
        {children}
      </body>
    </html>
  );
}
