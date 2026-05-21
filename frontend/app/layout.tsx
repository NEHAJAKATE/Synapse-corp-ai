import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synapse Corp AI — Autonomous Hiring Intelligence",
  description:
    "The world's first AI-powered company that autonomously interviews, evaluates, and hires candidates using 4 specialised AI agents. Milan AI Week Hackathon 2026.",
  keywords: ["AI hiring", "multi-agent", "voice interview", "Synapse Corp", "AI agents"],
  openGraph: {
    title: "Synapse Corp AI",
    description: "4 autonomous AI agents. Real-time voice interviews. Intelligent decisions.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=Inter:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#0A0A0F] text-[#F8FAFC] font-body antialiased">
        {children}
      </body>
    </html>
  );
}
