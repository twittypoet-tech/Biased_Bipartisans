import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Page Not Found',
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-t-bg flex flex-col items-center justify-center px-4 py-16">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/bipi-mark.svg" alt="BIPI" className="size-12 mb-6 opacity-30" />
      <h1 className="text-4xl sm:text-5xl font-bold text-t-text mb-3" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
        404
      </h1>
      <p className="text-base text-t-text-2 mb-8 text-center max-w-sm">
        This page does not exist. It may have been moved, deleted, or you followed a broken link.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/" className="rounded-xl px-6 py-3 text-sm font-semibold text-white text-center transition hover:opacity-90" style={{ backgroundColor: '#C8A44A' }}>
          Go to The Wire
        </Link>
        <Link href="/debates" className="rounded-xl border border-t-edge bg-t-surface px-6 py-3 text-sm font-medium text-t-text text-center hover:bg-t-hover transition">
          Watch Debates
        </Link>
      </div>
    </div>
  )
}
