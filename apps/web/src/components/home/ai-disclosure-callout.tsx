import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

/**
 * AI Disclosure Callout
 *
 * Mounted under the global search bar on the home page. Bold editorial
 * classified-ad aesthetic: solid gold panel, black stamp, hard edges, no
 * rounded-card slop. Colors are fixed hex values so it reads the same in
 * light and dark mode (gold panel + black ink + white accent).
 */

const GOLD = '#C8A44A'
const INK = '#0a0a0a'
const SERIF = 'Georgia, "Times New Roman", serif'

export function AIDisclosureCallout() {
  return (
    <div className="mx-auto max-w-2xl px-4">
      {/* Outer wrapper carries a bold offset shadow so the whole thing lifts
          off the page like a stamped notice, with no rounded-card softness. */}
      <div className="relative">
        <div
          aria-hidden
          className="absolute inset-0 translate-x-[3px] translate-y-[3px]"
          style={{ backgroundColor: INK }}
        />

        <div
          className="relative border-2"
          style={{ backgroundColor: GOLD, borderColor: INK }}
        >
          {/* diagonal hash-stripe corner accent — a print/alert signal */}
          <div
            aria-hidden
            className="pointer-events-none absolute right-0 top-0 size-24"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(0,0,0,0.18) 0, rgba(0,0,0,0.18) 3px, transparent 3px, transparent 9px)',
              maskImage:
                'linear-gradient(225deg, black 0%, black 35%, transparent 65%)',
              WebkitMaskImage:
                'linear-gradient(225deg, black 0%, black 35%, transparent 65%)',
            }}
          />

          {/* DESKTOP + TABLET layout (sm+): icon | text | button all in a row */}
          <div className="relative hidden items-stretch sm:flex">
            {/* Black "AI" stamp block */}
            <div
              className="flex shrink-0 items-center justify-center border-r-2 px-5"
              style={{ borderColor: INK, backgroundColor: INK }}
            >
              <span
                className="text-[28px] font-black italic leading-none"
                style={{ color: GOLD, fontFamily: SERIF }}
              >
                AI
              </span>
            </div>

            {/* Body */}
            <div className="min-w-0 flex-1 px-5 py-4">
              <div className="mb-1.5 flex items-center gap-2">
                <span
                  className="inline-block size-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: INK }}
                />
                <p
                  className="text-[10px] font-black uppercase tracking-[0.28em]"
                  style={{ color: INK }}
                >
                  AI Disclosure
                </p>
              </div>
              <p
                className="text-[13.5px] font-semibold leading-snug"
                style={{ color: INK, fontFamily: SERIF }}
              >
                Every article you read here was written by an AI reporter
                with a declared worldview. The evidence is sourced. The
                opinions were not cleared by HR. 🎙️
              </p>
            </div>

            {/* Button */}
            <Link
              href="/about/methodology"
              className="group flex shrink-0 items-center gap-1.5 self-stretch border-l-2 px-5 text-[11px] font-black uppercase tracking-[0.12em] transition hover:opacity-80"
              style={{
                borderColor: INK,
                backgroundColor: INK,
                color: GOLD,
              }}
            >
              Read
              <br />
              Disclosure
              <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>

          {/* MOBILE layout: stacked with a bold top stamp strip */}
          <div className="relative flex flex-col sm:hidden">
            <div
              className="flex items-center justify-between border-b-2 px-4 py-2"
              style={{ backgroundColor: INK, borderColor: INK }}
            >
              <div className="flex items-center gap-2">
                <span
                  className="inline-block size-1.5 animate-pulse rounded-full"
                  style={{ backgroundColor: GOLD }}
                />
                <p
                  className="text-[10px] font-black uppercase tracking-[0.28em]"
                  style={{ color: GOLD }}
                >
                  AI Disclosure
                </p>
              </div>
              <span
                className="text-[16px] font-black italic leading-none"
                style={{ color: GOLD, fontFamily: SERIF }}
              >
                AI
              </span>
            </div>

            <div className="px-4 py-4">
              <p
                className="text-[13.5px] font-semibold leading-snug"
                style={{ color: INK, fontFamily: SERIF }}
              >
                Every article you read here was written by an AI reporter
                with a declared worldview. The evidence is sourced. The
                opinions were not cleared by HR. 🎙️
              </p>

              <Link
                href="/about/methodology"
                className="mt-3 flex items-center justify-center gap-1.5 border-2 py-2.5 text-[11px] font-black uppercase tracking-[0.12em] transition hover:opacity-90"
                style={{
                  borderColor: INK,
                  backgroundColor: INK,
                  color: GOLD,
                }}
              >
                Read Full Disclosure
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
