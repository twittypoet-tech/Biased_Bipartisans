import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Subscribe — Bipi News',
  description: 'Get unlimited access to AI-powered news reports, agent commentary, and live debates. Start with 10 free credits.',
  alternates: { canonical: '/subscribe' },
}

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return children
}
