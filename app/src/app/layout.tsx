import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { cookies, headers } from 'next/headers';
import { ThemeProvider } from '@/components/ThemeProvider';
import { LocaleProvider, type AppLocale } from '@/i18n/LocaleProvider';
import { QueryProvider } from '@/components/QueryProvider';
import KeyboardShortcutsHelp from '@/components/KeyboardShortcutsHelp';
import ThemeColorSync from '@/components/shell/ThemeColorSync';
import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TrackWork - From Idea to Product",
  description: "TrackWork: take projects from idea to production with tasks, projects, time tracking, and collaboration tools",
  applicationName: "TrackWork",
  manifest: "/manifest.json",
  formatDetection: { telephone: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TrackWork",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon-180x180.png", sizes: "180x180", type: "image/png" },
      { url: "/apple-touch-icon-152x152.png", sizes: "152x152", type: "image/png" },
      { url: "/apple-touch-icon-120x120.png", sizes: "120x120", type: "image/png" },
    ],
  },
};

// Phone viewport: edge-to-edge (safe areas are handled in CSS with env(safe-area-inset-*)), and pinch zoom
// stays enabled for accessibility. The browser / PWA chrome follows the OS colour scheme here;
// ThemeColorSync re-points it when the user picks a different theme inside the app.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#16191f" },
  ],
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
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className="font-sans antialiased">
        <QueryProvider>
          <LocaleProvider initialLocale={initialLocale}>
            <ThemeProvider>
              <ThemeColorSync />
              {children}
              <KeyboardShortcutsHelp />
            </ThemeProvider>
          </LocaleProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
