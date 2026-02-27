import type { Metadata, Viewport } from "next";
import { Onest, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { DarkModeProvider } from "@/components/dark-mode-provider";
import { AuthProvider } from "@/components/auth-provider";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import "./globals.css";

const onest = Onest({
  subsets: ["latin"],
  variable: "--font-onest",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  weight: ["400", "500", "600"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export const metadata: Metadata = {
  title: "gritcms — Go + React. Built with Grit.",
  description: "A full-stack framework that combines Go backend with Next.js frontend. Build fast, ship faster.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("grit-theme");if(t==="light")document.documentElement.classList.remove("dark");else document.documentElement.classList.add("dark")}catch(e){}})()`,
          }}
        />
      </head>
      <body className={`${onest.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        <Providers>
          <DarkModeProvider>
            <AuthProvider>
              <ThemeProvider>
                <Navbar />
                <main className="min-h-screen">{children}</main>
                <Footer />
              </ThemeProvider>
            </AuthProvider>
          </DarkModeProvider>
        </Providers>
      </body>
    </html>
  );
}
