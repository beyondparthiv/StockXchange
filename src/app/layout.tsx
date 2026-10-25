import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import { MarketBackdrop } from "@/components/market-backdrop";
import "./globals.css";

// Inter — the neutral UI sans used by most financial dashboards. Variable, so
// the whole 400–700 range ships without listing weights.
const inter = Inter({
  variable: "--ff-sans",
  subsets: ["latin"],
});

// JetBrains Mono — tickers and monetary figures only. Fixed advance widths keep
// columns of prices aligned as digits change.
const jetbrainsMono = JetBrains_Mono({
  variable: "--ff-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockXchange",
  description: "A real-time multiplayer stock-trading simulation game.",
};

// Runs before hydration to apply the cached theme with no flash of light mode.
const themeInit = `(function(){try{var t=localStorage.getItem('sx-theme');if(t==='dark'){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="flex h-full flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        <MarketBackdrop />
        {children}
      </body>
    </html>
  );
}
