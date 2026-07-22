import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";

// Poppins — a friendly, geometric sans that matches the game's clean UI.
const poppins = Poppins({
  variable: "--ff-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
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
      className={`${poppins.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInit}
        </Script>
        {children}
      </body>
    </html>
  );
}
