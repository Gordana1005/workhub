import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { cookies, headers } from 'next/headers';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LocaleProvider, type AppLocale } from '@/i18n/LocaleProvider';
import { QueryProvider } from '@/components/QueryProvider';
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp';
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TrackWork - From Idea to Product",
  description: "TrackWork: take projects from idea to production with tasks, projects, time tracking, and collaboration tools",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TrackWork",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Locale comes from the cookie so SSR and the first client render match (no English flash).
  // First-time visitors fall back to their browser language.
  const saved = cookies().get('trackwork-locale')?.value;
  const initialLocale: AppLocale =
    saved === 'mk' || saved === 'en'
      ? saved
      : (headers().get('accept-language') || '').toLowerCase().startsWith('mk')
        ? 'mk'
        : 'en';

  return (
    <html lang={initialLocale} className={inter.variable} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('trackwork-theme')||'system';var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`,
          }}
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TrackWork" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body className="font-sans antialiased">
        <QueryProvider>
          <LocaleProvider initialLocale={initialLocale}>
            <ThemeProvider>
              {children}
              <KeyboardShortcutsHelp />
            </ThemeProvider>
          </LocaleProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
