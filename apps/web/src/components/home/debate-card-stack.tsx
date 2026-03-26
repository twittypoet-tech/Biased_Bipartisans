'use client'

import { useState, useCallback } from 'react'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { PastDebateCard } from '@/components/public/past-debate-card'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Participant {
  id: string
  name: string
  archetype: string
  avatarUrl: string | null
  expertise?: string[]
}

export interface DebateCardData {
  id: string
  title: string
  slug: string
  headline: string
  endedAt: string | null
  startedAt: string | null
  recordingUrl: string | null
  participants: Participant[]
}

interface DebateCardStackProps {
  debates: DebateCardData[]
}

// ── Inline SVG icons ──────────────────────────────────────────────────────────

function ChevronUpIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
      <path fillRule="evenodd" d="M9.47 6.47a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 1 1-1.06 1.06L10 8.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06l4.25-4.25Z" clipRule="evenodd" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5">
      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
    </svg>
  )
}

function ShuffleIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 3h5m0 0v5m0-5-8 8M16 21h5m0 0v-5m0 5-8-8M4 3l4 4m0 0L4 11M8 7l4 4m-8 6 4-4m0 0 4 4" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="size-4">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

// ── Configuration ─────────────────────────────────────────────────────────────

const VISIBLE_CARDS = 4   // max cards rendered in stack
const OFFSET_PX    = 10   // vertical peek offset (px) per layer
const SCALE_STEP   = 0.05 // scale reduction per layer
const DIM_STEP     = 0.18 // brightness reduction per layer
const SPRING       = { type: 'spring' as const, stiffness: 170, damping: 26 }
const SWIPE_THRESHOLD = 50

// ── Component ─────────────────────────────────────────────────────────────────

export function DebateCardStack({ debates }: DebateCardStackProps) {
  const [cards, setCards] = useState(debates)
  const [frontId, setFrontId] = useState(debates[0]?.id ?? null)
  const [dragDirection, setDragDirection] = useState<'up' | 'down' | null>(null)

  const dragY   = useMotionValue(0)
  const rotateX = useTransform(dragY, [-200, 0, 200], [12, 0, -12])

  // ── Navigation ──────────────────────────────────────────────────────────────

  const moveToEnd = useCallback(() => {
    setCards(prev => {
      if (prev.length < 2) return prev
      const next: DebateCardData[] = [...prev.slice(1), prev[0]!]
      setFrontId(next[0]?.id ?? null)
      return next
    })
  }, [])

  const moveToPrev = useCallback(() => {
    setCards(prev => {
      if (prev.length < 2) return prev
      const next: DebateCardData[] = [prev[prev.length - 1]!, ...prev.slice(0, -1)]
      setFrontId(next[0]?.id ?? null)
      return next
    })
  }, [])

  const shuffleCards = useCallback(() => {
    setCards(prev => {
      const shuffled = [...prev].sort(() => Math.random() - 0.5)
      setFrontId(shuffled[0]?.id ?? null)
      return shuffled
    })
  }, [])

  const resetCards = useCallback(() => {
    setCards(debates)
    setFrontId(debates[0]?.id ?? null)
  }, [debates])

  // ── Drag end ─────────────────────────────────────────────────────────────────

  const handleDragEnd = useCallback((_: unknown, info: { velocity: { y: number }; offset: { y: number } }) => {
    const { velocity, offset } = info
    if (Math.abs(offset.y) > SWIPE_THRESHOLD || Math.abs(velocity.y) > 500) {
      if (offset.y < 0 || velocity.y < -500) {
        setDragDirection('up')
        setTimeout(() => { moveToEnd(); setDragDirection(null) }, 150)
      } else {
        setDragDirection('down')
        setTimeout(() => { moveToPrev(); setDragDirection(null) }, 150)
      }
    }
    dragY.set(0)
  }, [moveToEnd, moveToPrev, dragY])

  // ── Render ───────────────────────────────────────────────────────────────────

  if (debates.length === 0) return null

  const visible = cards.slice(0, VISIBLE_CARDS)
  const frontCard    = cards[0]
  const rawIdx       = frontCard ? debates.indexOf(frontCard) : -1
  const currentIndex = rawIdx >= 0 ? rawIdx : 0

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Controls row */}
      <div className="flex items-center gap-3 z-10">
        <motion.button
          onClick={resetCards}
          className="flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-xs font-medium text-neutral-400 backdrop-blur-sm transition hover:border-neutral-600 hover:text-neutral-200"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          title="Reset order"
        >
          <ResetIcon />
          <span className="hidden sm:inline">Reset</span>
        </motion.button>

        <motion.button
          onClick={shuffleCards}
          className="flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800/80 px-3 py-2 text-xs font-medium text-neutral-400 backdrop-blur-sm transition hover:border-neutral-600 hover:text-neutral-200"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          title="Shuffle"
        >
          <ShuffleIcon />
          <span className="hidden sm:inline">Shuffle</span>
        </motion.button>

        <span className="text-xs text-neutral-600 px-1">
          {currentIndex + 1} / {debates.length}
        </span>
      </div>

      {/* Stack + nav buttons row */}
      <div className="relative w-full max-w-lg mx-auto flex items-center gap-2 sm:gap-4">
        {/* Prev button */}
        <motion.button
          onClick={moveToPrev}
          className="shrink-0 flex size-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800/80 text-neutral-400 backdrop-blur-sm transition hover:border-neutral-500 hover:text-neutral-200 z-20"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Previous debate"
        >
          <ChevronUpIcon />
        </motion.button>

        {/* Card stack */}
        <div
          className="relative flex-1"
          style={{ height: 'auto', minHeight: 320 }}
        >
          {/* The absolute-positioned stack lives inside a relative spacer that
              we size to the front card's natural height via a hidden clone */}
          <div className="relative" style={{ paddingTop: `${(VISIBLE_CARDS - 1) * OFFSET_PX}px` }}>
            <AnimatePresence initial={false}>
              {visible.map((debate, i) => {
                const isFront   = i === 0
                const brightness = Math.max(0.35, 1 - i * DIM_STEP)
                const zIndex     = visible.length - i

                return (
                  <motion.div
                    key={debate.id}
                    className="w-full overflow-hidden rounded-xl border border-neutral-800"
                    style={{
                      position: i === 0 ? 'relative' : 'absolute',
                      top: i === 0 ? 0 : `${-i * OFFSET_PX}px`,
                      left: 0,
                      right: 0,
                      cursor: isFront ? 'grab' : 'default',
                      touchAction: isFront ? 'none' : 'auto',
                      zIndex,
                      transformPerspective: 1000,
                      boxShadow: isFront
                        ? '0 25px 50px rgba(0,0,0,0.7)'
                        : '0 12px 24px rgba(0,0,0,0.4)',
                    }}
                    animate={{
                      top: i === 0 ? 0 : `${-i * OFFSET_PX}px`,
                      scale: 1 - i * SCALE_STEP,
                      filter: `brightness(${brightness})`,
                      opacity: dragDirection && isFront ? 0 : 1,
                      rotateX: 0,
                    }}
                    exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.18 } }}
                    transition={SPRING}
                    drag={isFront ? 'y' : false}
                    dragConstraints={{ top: 0, bottom: 0 }}
                    dragElastic={0.65}
                    onDrag={(_, info) => { if (isFront) dragY.set(info.offset.y) }}
                    onDragEnd={handleDragEnd}
                    whileDrag={isFront ? { scale: 1.02, cursor: 'grabbing' } : {}}
                  >
                    <PastDebateCard
                      title={debate.title}
                      slug={debate.slug}
                      headline={debate.headline}
                      endedAt={debate.endedAt}
                      startedAt={debate.startedAt}
                      recordingUrl={debate.recordingUrl}
                      participants={debate.participants}
                      isActive={debate.id === frontId}
                    />
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* Next button */}
        <motion.button
          onClick={moveToEnd}
          className="shrink-0 flex size-9 items-center justify-center rounded-full border border-neutral-700 bg-neutral-800/80 text-neutral-400 backdrop-blur-sm transition hover:border-neutral-500 hover:text-neutral-200 z-20"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          aria-label="Next debate"
        >
          <ChevronDownIcon />
        </motion.button>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5 z-10">
        {debates.map((d, i) => (
          <motion.button
            key={d.id}
            onClick={() => {
              // Rotate until this debate is front
              const idx = cards.findIndex(c => c.id === d.id)
              if (idx > 0) {
                const next = [...cards.slice(idx), ...cards.slice(0, idx)]
                setCards(next)
                setFrontId(next[0]?.id ?? null)
              }
            }}
            className={`rounded-full transition-all duration-300 ${
              i === currentIndex
                ? 'bg-white w-6 h-1.5'
                : 'bg-neutral-700 w-1.5 h-1.5'
            }`}
            whileHover={{ scale: 1.3 }}
            aria-label={`Go to debate ${i + 1}`}
          />
        ))}
      </div>

      {/* Hint */}
      <p className="text-xs text-neutral-700 text-center">
        Drag up / down to browse &nbsp;·&nbsp; click card to open debate room
      </p>
    </div>
  )
}
