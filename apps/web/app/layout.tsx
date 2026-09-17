import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "EquityMux — intent & execution router for tokenized stocks",
  description:
    "Choose the economic exposure. EquityMux chooses, verifies, simulates and executes the safest valid onchain representation on BSC.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Nav />
          <main className="mx-auto max-w-7xl px-5 pb-16">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
