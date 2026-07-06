import { Geist_Mono, Inter } from "next/font/google"
import type { Metadata } from "next"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { cn } from "@/lib/utils";

const PRODUCTION_URL = "https://boooards.vercel.app/"

export const metadata: Metadata = {
  title: "Boooards — Storyboard Manager",
  description:
    "A storyboard manager for filmmakers, directors, animators, and visual designers. Plan, organize, and visualize scenes dynamically in a grid workspace.",
  metadataBase: new URL(PRODUCTION_URL),
  openGraph: {
    description:
      "A storyboard manager for filmmakers, directors, animators, and visual designers. Plan, organize, and visualize scenes dynamically in a grid workspace.",
    images: [
      {
        alt: "Boooards — Storyboard Manager",
        height: 630,
        url: "/images/boooards-og-image.png",
        width: 1200,
      },
    ],
    locale: "en_US",
    siteName: "Boooards",
    title: "Boooards — Storyboard Manager",
    type: "website",
    url: PRODUCTION_URL,
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: [
      { sizes: "any", type: "image/x-icon", url: "/favicon.ico" },
      { sizes: "256x256", type: "image/png", url: "/favicon-256.png" },
    ],
    shortcut: "/favicon-256.png",
  },
  twitter: {
    card: "summary_large_image",
    description:
      "A storyboard manager for filmmakers, directors, animators, and visual designers. Plan, organize, and visualize scenes dynamically in a grid workspace.",
    images: ["/images/boooards-og-image.png"],
    title: "Boooards — Storyboard Manager",
  },
};

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", inter.variable)}
    >
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
