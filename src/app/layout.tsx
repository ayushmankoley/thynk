import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const introRust = localFont({
  src: "./fonts/IntroRust.otf",
  variable: "--font-intro-rust",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Thynk - Prediction Markets",
  description: "Decentralized prediction markets powered by blockchain technology",
  icons: {
    icon: "/favicon.svg",
  },
  openGraph: {
    title: "Thynk - Prediction Markets",
    description: "Decentralized prediction markets powered by blockchain technology",
    images: [
      {
        url: "/banner.png",
        width: 1200,
        height: 630,
        alt: "Thynk - Prediction Markets",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Thynk - Prediction Markets",
    description: "Decentralized prediction markets powered by blockchain technology",
    images: ["/banner.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${introRust.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <ThirdwebProvider>
            <TooltipProvider>
              {children}
            </TooltipProvider>
          </ThirdwebProvider>
        </ThemeProvider>
        <Toaster />
      </body>
    </html>
  );
}
