import type { Metadata } from "next";
import { Space_Grotesk, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { StatusPill } from "@/components/StatusPill";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plexSans = IBM_Plex_Sans({
  variable: "--font-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "FraudShield AI — Customer Risk Intelligence",
  description: "Customer-level fraud-risk prediction — single and batch scoring.",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="flex h-full min-h-screen flex-col bg-ink text-ink-foreground md:flex-row">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="hidden items-center justify-end border-b border-ink-border bg-ink px-8 py-4 md:flex">
            <StatusPill />
          </header>
          <div className="flex items-center justify-end border-b border-ink-border bg-ink px-4 py-2 md:hidden">
            <StatusPill />
          </div>
          <main className="flex-1 overflow-y-auto bg-ink px-4 py-6 md:px-8 md:py-8">
            <div className="mx-auto w-full max-w-6xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
