import type { Metadata } from "next";
import { Comfortaa, Manrope } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Ripple from "@/components/water/Ripple";

const comfortaa = Comfortaa({ variable: "--font-comfortaa", subsets: ["latin"], weight: "700" });
const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WaterMart — 20L drinking water at your door in Mumbai",
  description:
    "ISI-certified 20 litre water jars delivered in about 2 hours. Prepaid passes, no cash, no haggling. Serving Andheri West, Powai, Malad and Thane.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${manrope.variable} ${comfortaa.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <Ripple />
      </body>
    </html>
  );
}
