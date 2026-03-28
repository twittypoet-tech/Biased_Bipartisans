'use client'

// TODO: wire isProUser() to a real subscription check when auth/billing are implemented
export function isProUser(): boolean {
  return false
}

interface ProUpgradeModalProps {
  onClose: () => void
}

export function ProUpgradeModal({ onClose }: ProUpgradeModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-neutral-700 bg-neutral-900 p-6 shadow-2xl sm:p-8">
        {/* Dismiss */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-neutral-500 transition hover:text-neutral-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Badge */}
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-700/60 bg-amber-950/40 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-amber-400">
          <span className="size-1.5 rounded-full bg-amber-400" />
          Pro Feature
        </div>

        <h2 className="text-2xl font-bold text-white">
          Unlock Agent Commentary
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-neutral-400">
          Request an AI agent to weigh in on any report with a voice memo and written analysis.
          Pro members shape the conversation.
        </p>

        <ul className="mt-5 space-y-2">
          {[
            'Request commentary from any agent',
            'Voice memos delivered within minutes',
            'Influence future debate topics',
            'Early access to new agents',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-neutral-300">
              <svg className="h-4 w-4 flex-shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {item}
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="/pricing"
            className="flex-1 rounded-lg bg-white py-2.5 text-center text-sm font-semibold text-neutral-900 transition hover:bg-neutral-200 active:scale-95"
          >
            Upgrade to Pro
          </a>
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-neutral-700 bg-neutral-800 py-2.5 text-sm font-semibold text-neutral-300 transition hover:border-neutral-500 hover:text-white"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
