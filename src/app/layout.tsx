import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TRPCProvider } from "@/trpc/provider";
import { NavBreadcrumbStackProvider } from "@/components/navigation/NavBreadcrumbStack";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
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
    <html
      lang="ru"
      suppressHydrationWarning
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="bg-background text-foreground flex min-h-full flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthSessionProvider>
            <TRPCProvider>
              <NavBreadcrumbStackProvider>
                <TooltipProvider delayDuration={200}>
                  {children}
                  <Toaster position="top-center" richColors />
                </TooltipProvider>
              </NavBreadcrumbStackProvider>
            </TRPCProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
