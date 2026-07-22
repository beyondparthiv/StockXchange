import type { Metadata } from "next";
import { Poppins } from "next/font/google";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
