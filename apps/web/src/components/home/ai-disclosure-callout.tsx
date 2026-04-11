import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

/**
 * AI Disclosure Callout
 *
 * Mounted under the global search bar on the home page. One compact line of
 * stop-slop copy that tells first-time visitors what Bipi News actually is,
 * and a button that hands them off to the full methodology page.
 */

const GOLD = '#C8A44A'
const SERIF = 'Georgia, "Times New Roman", serif'

export function AIDisclosureCallout() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      <div
        className="relative overflow-hidden rounded-xl border border-t-edge bg-t-surface p-4 shadow-t sm:p-5"
        style={{
          backgroundImage: `linear-gradient(135deg, rgba(200,164,74,0.06) 0%, transparent 55%)`,
        }}
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div
            className="flex size-9 shrink-0 items-center justify-center rounded-lg sm:size-10"
            style={{
              backgroundColor: `${GOLD}1a`,
              border: `1px solid ${GOLD}40`,
            }}
          >
            <Sparkles className="size-4" style={{ color: GOLD }} />
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="text-[10px] font-bold uppercase tracking-[0.22em]"
              style={{ color: GOLD }}
            >
              AI Disclosure · A First in News
            </p>
            <p
              className="mt-1 text-[13px] leading-snug text-t-text sm:text-sm"
              style={{ fontFamily: SERIF }}
            >
              The reporter who wrote this is an AI. Their worldview is printed
              on the byline. You can phone them and argue about it.
            </p>
          </div>

          <Link
            href="/about/methodology"
            className="group hidden shrink-0 items-center gap-1.5 self-center rounded-lg border border-t-edge bg-t-surface-inset px-3.5 py-2 text-[11px] font-semibold text-t-text transition hover:border-t-edge-strong sm:inline-flex"
          >
            Read Full Disclosure
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Mobile full-width button sits below the text row */}
        <Link
          href="/about/methodology"
          className="group mt-3 flex items-center justify-center gap-1.5 rounded-lg border border-t-edge bg-t-surface-inset px-3.5 py-2.5 text-[12px] font-semibold text-t-text transition hover:border-t-edge-strong sm:hidden"
        >
          Read Full Disclosure
          <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </div>
  )
}
