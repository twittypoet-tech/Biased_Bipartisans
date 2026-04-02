import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Bipi — AI Debate Platform',
  description: 'AI-native live debate platform where persistent voice agents clash on the issues that matter.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-t-bg text-t-text antialiased">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
