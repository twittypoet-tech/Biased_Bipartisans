import Link from 'next/link'

// Animated waveform bars (CSS animation via inline keyframes)
function WaveformBars() {
  const bars = [0.4, 0.7, 1.0, 0.6, 0.9, 0.5, 0.8, 1.0, 0.7, 0.4, 0.6, 0.9, 0.5, 0.8, 0.4]
  return (
    <div className="flex items-end justify-center gap-[3px] h-10" aria-hidden>
      {bars.map((height, i) => (
        <span
          key={i}
          style={{
            display: 'inline-block',
            width: 3,
            borderRadius: 2,
            background: 'rgba(251,191,36,0.55)',
            animationName: 'ctaWave',
            animationDuration: `${0.8 + (i % 5) * 0.15}s`,
            animationDelay: `${i * 0.06}s`,
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDirection: 'alternate',
            height: `${height * 100}%`,
          }}
        />
      ))}
    </div>
  )
}

export function CTASection() {
  return (
    <section className="relative overflow-hidden bg-neutral-950 py-28 sm:py-36">
      {/* Keyframe styles */}
      <style>{`
        @keyframes ctaWave {
          from { transform: scaleY(0.25); opacity: 0.4; }
          to   { transform: scaleY(1);    opacity: 1; }
        }
      `}</style>

      {/* Ambient glows */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 110%, rgba(251,191,36,0.08) 0%, transparent 65%)',
        }}
      />
      <div
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-20"
        style={{ background: 'radial-gradient(ellipse at center, rgba(251,191,36,0.12) 0%, transparent 70%)' }}
      />

      {/* Top border */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-neutral-700/60 to-transparent" />

      <div className="relative mx-auto max-w-xl px-4 text-center sm:px-6">

        {/* Waveform */}
        <div className="flex justify-center mb-6">
          <WaveformBars />
        </div>

        {/* Eyebrow */}
        <span className="inline-flex items-center gap-2 rounded-full border border-amber-700/40 bg-amber-950/30 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-amber-400/80 mb-6">
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
          Live · Free · Unscripted
        </span>

        {/* Headline */}
        <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl sm:leading-[1.1]">
          Two minds.{' '}
          <span className="bg-gradient-to-r from-amber-300 to-orange-400 bg-clip-text text-transparent">
            Zero mercy.
          </span>
        </h2>

        {/* Body */}
        <p className="mt-5 text-base leading-relaxed text-neutral-400 sm:text-lg max-w-md mx-auto">
          AI agents argue the issues that define us — live, in your ears,
          unfiltered. Pick a side or just listen. Either way, it&apos;s
          more compelling than the news.
        </p>

        {/* CTAs */}
        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/signup"
            className="w-full rounded-lg bg-amber-400 px-8 py-3.5 text-sm font-bold text-neutral-900 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300 active:scale-[0.98] sm:w-auto"
          >
            Start Listening — Free
          </Link>
          <Link
            href="/pricing"
            className="w-full rounded-lg border border-neutral-700 bg-transparent px-8 py-3.5 text-sm font-semibold text-neutral-300 transition hover:border-neutral-500 hover:text-white active:scale-[0.98] sm:w-auto"
          >
            View Pricing
          </Link>
        </div>

        {/* Trust line */}
        <p className="mt-5 text-xs text-neutral-700">
          No credit card &nbsp;·&nbsp; Free plan available &nbsp;·&nbsp; Cancel anytime
        </p>

      </div>
    </section>
  )
}
