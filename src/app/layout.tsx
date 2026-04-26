import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TRPCProvider } from "@/trpc/provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-embed",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "Referi — реферальный найм разработчиков",
  description:
    "Платформа для безопасного реферального найма: эскроу-защита вознаграждения, прозрачный процесс, честные рефералы.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <TRPCProvider>{children}</TRPCProvider>
      </body>
    </html>
  );
}
