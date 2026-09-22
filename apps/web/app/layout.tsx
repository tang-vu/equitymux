import type { Metadata } from "next";
import "./globals.css";
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
