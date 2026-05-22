import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgenticBuilder",
  description: "Lean Next.js + Better-Auth + Drizzle quickstart.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
