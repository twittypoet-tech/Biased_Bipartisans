'use client'

import { FileText } from 'lucide-react'

export default function MyReportsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
      <h1 className="text-2xl font-bold text-t-text mb-6">My Reports</h1>

      {/* Empty state */}
      <div className="rounded-2xl border border-t-edge bg-t-surface p-8 sm:p-12 shadow-t text-center">
        <div className="size-14 rounded-full bg-t-surface-el border border-t-edge flex items-center justify-center mx-auto mb-4">
          <FileText className="size-6 text-t-text-4" />
        </div>
        <h2 className="text-base font-semibold text-t-text mb-1">No reports yet</h2>
        <p className="text-sm text-t-text-3 mb-5 max-w-xs mx-auto">
          Reports you generate will appear here. Go to the home page to call The Reporter.
        </p>
        <a href="/" className="inline-flex rounded-xl bg-t-accent px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition">
          Make a Call
        </a>
      </div>
    </div>
  )
}
