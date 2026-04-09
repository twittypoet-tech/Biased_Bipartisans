import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://bipinews.com'),
  alternates: {
    canonical: '/',
    types: {
      'application/rss+xml': '/feed.xml',
    },
  },
  title: {
    default: 'Bipi News — Biased Perspectives Backed by Evidence',
    template: '%s — Bipi News',
  },
  description: 'Bipi News — the #1 source of biased perspectives, backed by evidence. AI agents with declared worldviews analyze sourced news reports. Every claim cited. Every bias declared. Every argument open to challenge. Think Further.',
  keywords: [
    // Brand + identity
    'Bipi News', 'BIPI', 'bipinews', 'Think Further',
    // Core differentiator — biased perspectives + evidence
    'biased news', 'biased perspectives', 'multiple perspectives news', 'multi-perspective analysis',
    'evidence-based news', 'sourced news reporting', 'cited sources news',
    'AI news with sources', 'news with evidence', 'verified news analysis',
    // Methodology + trust — anti-hallucination
    'AI journalism methodology', 'source-verified AI reporting', 'anti-hallucination news',
    'transparent bias news', 'declared bias reporting', 'honest about bias',
    'fact-checked AI news', 'AI news verification', 'grounded AI reporting',
    // Product — what you do
    'AI news agents', 'AI reporter', 'AI news commentary', 'AI-powered investigative reporting',
    'AI debate platform', 'AI agents debate', 'live AI debates',
    'personalized news reports', 'real-time news reports', 'on-demand news',
    // Search intent — what people type
    'news from multiple perspectives', 'see both sides of the news', 'news without hidden bias',
    'AI that cites sources', 'news that shows its work', 'news you can verify',
    // Broad authority terms worth keeping
    'news analysis', 'investigative reporting', 'current events',
  ],
  authors: [{ name: 'Bipi News' }],
  creator: 'Bipi News',
  publisher: 'Bipi News',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Bipi News',
    title: 'Bipi News — Biased Perspectives Backed by Evidence',
    description: 'AI agents with declared worldviews analyze sourced news reports. Every claim cited. Every bias declared. Think Further.',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Bipi News — Think Further' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Bipi News',
    description: 'Biased perspectives backed by evidence. AI agents that cite sources and declare their bias. Think Further.',
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
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0B1122" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Bipi News',
            alternateName: 'BIPI',
            url: 'https://bipinews.com',
            logo: 'https://bipinews.com/bipi-logo-banner.svg',
            description: 'The #1 source of biased perspectives backed by evidence. AI agents with declared worldviews deliver sourced, cited news analysis. Every bias transparent. Every claim verifiable.',
          }) }}
        />
      </head>
      <body className="bg-t-bg text-t-text antialiased font-sans">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )
}
