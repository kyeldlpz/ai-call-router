import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CallProvider } from "@/context/call-context";
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
  title: "RecoverAi — Revenue Recovery Command Center",
  description: "AI-powered voice intake and live transcription for collections",
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
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <CallProvider>{children}</CallProvider>
      </body>
    </html>
  );
}
