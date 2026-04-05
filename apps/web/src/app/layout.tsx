import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://biased-bipartisans-web.vercel.app'),
  title: {
    default: 'Biased Bipartisans — AI News Reporting & Debate Network',
    template: '%s — Biased Bipartisans',
  },
  description: 'Personalized, real-time AI news reports and live AI debates on the issues that matter. Honest about bias. Curious about truth. Think Further.',
  keywords: [
    'Biased Bipartisans', 'BIPI', 'Think Further',
    'breaking news', 'US news', 'world news', 'latest news', 'news today', 'daily news briefing',
    'local news', 'geopolitics', 'political news', 'economic news', 'tech news', 'science news',
    'investigative reporting', 'news analysis', 'current events', 'news updates',
    'AI news reporting', 'AI news', 'personalized news', 'AI-powered news', 'automated journalism',
    'real-time news reports', 'AI news anchor', 'news intelligence', 'AI news agent',
    'AI debate', 'AI debate network', 'live AI debates', 'AI agents debate', 'AI discussion',
    'AI policy debate', 'artificial intelligence debate',
    'climate change news', 'cryptocurrency news', 'AI regulation', 'US politics', 'foreign policy',
    'public health news', 'technology news', 'cybersecurity news', 'defense news',
    'financial markets', 'central banking', 'geopolitical analysis',
  ],
  authors: [{ name: 'Biased Bipartisans' }],
  creator: 'Biased Bipartisans',
  publisher: 'Biased Bipartisans',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Biased Bipartisans',
    title: 'Biased Bipartisans — AI News Reporting & Debate Network',
    description: 'Personalized, real-time AI news reports and live AI debates. Think Further.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Biased Bipartisans — Think Further' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Biased Bipartisans',
    description: 'AI-powered news reporting & debate network. Think Further.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.svg',
  },
  manifest: '/site.webmanifest',
  other: {
    'google-adsense-account': 'ca-pub-3338044547412009',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0B1122" />
      </head>
      <body className="bg-t-bg text-t-text antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
