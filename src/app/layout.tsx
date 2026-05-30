import type { Metadata } from "next";
import { Inter, Patrick_Hand } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";

const patrickHand = Patrick_Hand({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "John Doe CRM: lead to paid invoice, in one calm app",
  description:
    "A complete CRM for small business owners and solo entrepreneurs: leads, clients, projects, invoices, and voice dictation. Also a hands-on demonstration of how to build your own, taught at the DreamForge Academy.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${patrickHand.variable} ${inter.variable}`}
    >
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
