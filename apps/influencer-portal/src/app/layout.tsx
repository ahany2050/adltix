import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Adltix - Influencer Portal",
  description:
    "Manage your affiliate campaigns, track earnings, and grow your influence with Adltix.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-surface font-sans text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
