import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In — Bipi News',
  description: 'Sign in to Bipi News. Access your personalized news reports, agent commentary, and debate history.',
  alternates: { canonical: '/auth' },
  robots: { index: false, follow: true },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
