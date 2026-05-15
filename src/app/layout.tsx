import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { TRPCProvider } from "@/trpc/provider";
import { NavBreadcrumbStackProvider } from "@/components/navigation/NavBreadcrumbStack";
import { AuthSessionProvider } from "@/components/auth/session-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SiteFooter } from "@/components/SiteFooter";
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
        <div className="flex min-h-full flex-1 flex-col">
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
                    <div className="flex min-h-full flex-1 flex-col">
                      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
                      <SiteFooter />
                    </div>
                    <Toaster position="top-center" richColors />
                  </TooltipProvider>
                </NavBreadcrumbStackProvider>
              </TRPCProvider>
            </AuthSessionProvider>
          </ThemeProvider>
        </div>
      </body>
    </html>
  );
}
