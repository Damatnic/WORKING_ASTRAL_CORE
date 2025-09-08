import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClientProviders } from "@/components/providers/ClientProviders";

const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Astral Core - Mental Health Support Platform",
  description: "We built Astral Core to be the voice people find when they've lost their own. Anonymous, immediate mental health support when you need it most.",
  keywords: ["mental health", "crisis support", "therapy", "wellness", "peer support", "anonymous help", "accessible mental health", "WCAG compliant"],
  authors: [{ name: "Astral Core Team" }],
  creator: "Astral Core",
  publisher: "Astral Core",
  robots: "index, follow",
  openGraph: {
    title: "Astral Core - Mental Health Support Platform",
    description: "Anonymous, immediate mental health support when you need it most.",
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary_large_image",
    title: "Astral Core - Mental Health Support Platform",
    description: "Anonymous, immediate mental health support when you need it most."
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [{
    media: '(prefers-color-scheme: light)',
    color: '#ffffff'
  }, {
    media: '(prefers-color-scheme: dark)',
    color: '#0a0a0a'
  }]
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={inter.variable}
      dir="ltr"
      suppressHydrationWarning
    >
      <head>
        {/* Accessibility and Performance */}
        <meta name="color-scheme" content="light dark" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        
        {/* Accessibility improvements */}
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
      </head>
      <body 
        className="font-sans antialiased bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100 min-h-screen"
        suppressHydrationWarning
      >
        {/* Global live region for screen reader announcements */}
        <div 
          id="live-region-polite" 
          aria-live="polite" 
          aria-atomic="true" 
          className="sr-only"
        ></div>
        <div 
          id="live-region-assertive" 
          aria-live="assertive" 
          aria-atomic="true" 
          className="sr-only"
        ></div>
        
        {/* Skip navigation for keyboard users */}
        <div className="sr-only focus-within:not-sr-only">
          <a 
            href="#main-content" 
            className="absolute top-4 left-4 bg-primary-600 text-white px-4 py-2 rounded-lg z-[9999] focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 font-medium"
          >
            Skip to main content
          </a>
          <a 
            href="#navigation" 
            className="absolute top-4 left-40 bg-primary-600 text-white px-4 py-2 rounded-lg z-[9999] focus:outline-none focus:ring-2 focus:ring-primary-300 focus:ring-offset-2 font-medium"
          >
            Skip to navigation
          </a>
        </div>

        {/* Main application with providers */}
        <ClientProviders>
          <div className="min-h-screen flex flex-col">
            {children}
          </div>
        </ClientProviders>
        
        {/* Screen reader only status messages */}
        <div 
          role="status" 
          aria-live="polite" 
          className="sr-only" 
          id="status-message"
        ></div>
      </body>
    </html>
  );
}
