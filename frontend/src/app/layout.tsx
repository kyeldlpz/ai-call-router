import type { Metadata } from "next";
import { Inter, IBM_Plex_Mono } from "next/font/google";
import { CallProvider } from "@/context/call-context";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
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
      className={`${inter.variable} ${ibmPlexMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <CallProvider>{children}</CallProvider>
      </body>
    </html>
  );
}
