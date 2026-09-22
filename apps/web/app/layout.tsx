import type { Metadata } from "next";
import "./globals.css";
import "./instrument.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "EquityMux — intent & execution router for tokenized stocks",
  description:
    "Compare tokenized stock exposure across BSC issuers, test explicit risk policies, and export replayable decision evidence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          rel="preload"
          href="/fonts/SourceSans3.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers>
          <a className="skip-link" href="#main-content">
            Skip to workspace
          </a>
          <Nav />
          <main id="main-content" className="app-shell">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
