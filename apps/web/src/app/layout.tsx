import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import { AuthProvider } from '@/components/auth-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Biased Bipartisans — AI Debate Platform',
  description: 'AI-native live debate platform where persistent voice agents clash on the issues that matter.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta name="google-adsense-account" content="ca-pub-3338044547412009" />
      </head>
      <body className="bg-t-bg text-t-text antialiased">
        <ThemeProvider>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
