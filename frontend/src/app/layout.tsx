import type { Metadata } from "next";
import { Inter, Sora, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Paraflow AI - Writing Intelligence Platform",
  description: "From First Draft to Final Form — Intelligently. The unified writing platform with AI-powered paraphrasing, humanization, detection, and more.",
  keywords: ["AI writing", "paraphrasing", "humanizer", "grammar", "SEO", "writing tools"],
  icons: {
    icon: [
      {
        url: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect fill='%237C3AED' rx='20' width='100' height='100'/><text x='50' y='68' font-size='50' text-anchor='middle' fill='white' font-family='system-ui'>P</text></svg>",
        type: "image/svg+xml",
      },
    ],
  },
};

function ApiDiagnostic() {
  if (typeof window === "undefined") return null;
  const apiUrl = (window as unknown as { __API_URL__?: string }).__API_URL__;
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 8,
        right: 8,
        zIndex: 9999,
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        padding: "6px 10px",
        borderRadius: 6,
        fontFamily: "monospace",
        fontSize: 11,
        maxWidth: 420,
        pointerEvents: "none",
        opacity: 0.85,
      }}
    >
      <div>API_BASE: {apiUrl || "(undefined)"}</div>
      <div>origin: {protocol}//{hostname}</div>
    </div>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${sora.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased min-h-screen font-sans`}
      >
        <Providers>{children}</Providers>
        <ApiDiagnostic />
      </body>
    </html>
  );
}