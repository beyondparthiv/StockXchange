import type { Metadata } from "next";
import { Fraunces, Nunito_Sans } from "next/font/google";
import "./globals.css";

// Display: Fraunces — a characterful high-contrast serif for a classic,
// board-game feel. Body: Nunito Sans — warm, friendly, and very readable.
const display = Fraunces({
  variable: "--ff-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const body = Nunito_Sans({
  variable: "--ff-body",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StockXchange",
  description: "A real-time multiplayer stock-trading simulation game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="relative min-h-full flex flex-col">
        <div className="paper-grain" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
