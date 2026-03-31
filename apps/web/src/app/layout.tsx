import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: {
    default: "Duck — AI Image Generation for Brands",
    template: "%s | Duck",
  },
  description:
    "Generate brand-consistent images at scale with AI. Upload reference images, build your brand's visual DNA, and generate on-brand content instantly.",
  keywords: ["AI image generation", "brand consistency", "image AI", "brand guidelines"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
