'use client'

import Link from 'next/link'

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-screen bg-t-bg flex flex-col items-center justify-center px-4 py-16">
      <h1 className="text-3xl font-bold text-t-text mb-3" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
        Something went wrong
      </h1>
      <p className="text-base text-t-text-2 mb-8 text-center max-w-sm">
        We hit an unexpected error. Try again, or head back to the homepage.
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="rounded-xl px-6 py-3 text-sm font-semibold text-white text-center transition hover:opacity-90"
          style={{ backgroundColor: '#C8A44A' }}
        >
          Try Again
        </button>
        <Link href="/" className="rounded-xl border border-t-edge bg-t-surface px-6 py-3 text-sm font-medium text-t-text text-center hover:bg-t-hover transition">
          Go Home
        </Link>
      </div>
    </div>
  )
}
