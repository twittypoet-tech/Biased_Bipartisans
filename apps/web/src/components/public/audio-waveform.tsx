'use client'

/**
 * Animated audio waveform bars that respond to speaking state.
 * When active, bars animate with staggered bouncing. When idle, they flatten.
 */

interface AudioWaveformProps {
  active: boolean
  color?: string
  barCount?: number
}

export function AudioWaveform({ active, color = 'bg-white', barCount = 5 }: AudioWaveformProps) {
  return (
    <div className="flex items-end gap-[3px] h-5" aria-hidden="true">
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full transition-all duration-150 ${color} ${
            active ? 'animate-waveform' : 'h-1 opacity-30'
          }`}
          style={
            active
              ? {
                  animationDelay: `${i * 120}ms`,
                  animationDuration: `${600 + (i % 3) * 200}ms`,
                }
              : undefined
          }
        />
      ))}
    </div>
  )
}
