import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { TooltipProvider } from "@/components/ui/tooltip";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Mongo Quest — Master the MongoDB Aggregation Pipeline",
    template: "%s · Mongo Quest",
  },
  description:
    "A visual, interactive, hands-on platform for mastering the MongoDB Aggregation Pipeline. Solve challenges against your own backend, visualize every stage, and level up.",
};

export const viewport: Viewport = {
  themeColor: "#0a0c0b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full">
        <Providers>
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
