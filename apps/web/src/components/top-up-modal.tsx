'use client'

import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Coins, Zap, ArrowRight, X } from 'lucide-react'
import { useAuth } from './auth-provider'

interface TopUpModalProps {
  creditsNeeded: number
  onClose: () => void
}

export function TopUpModal({ creditsNeeded, onClose }: TopUpModalProps) {
  const { profile } = useAuth()
  const currentCredits = profile?.credits ?? 0
  const isPro = profile?.tier === 'pro'
  const deficit = Math.max(0, creditsNeeded - currentCredits)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        {/* Modal */}
        <motion.div
          initial={{ y: 40, opacity: 0, scale: 0.97 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 40, opacity: 0, scale: 0.97 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-sm rounded-t-2xl sm:rounded-2xl bg-t-surface border border-t-edge shadow-t-lg p-6 mx-0 sm:mx-4"
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 size-8 rounded-full bg-t-surface-el flex items-center justify-center text-t-text-3 hover:text-t-text-2 transition"
          >
            <X className="size-4" />
          </button>

          {/* Icon */}
          <div className="flex justify-center mb-4">
            <div className="size-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Coins className="size-7 text-amber-500" />
            </div>
          </div>

          {/* Content */}
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-t-text mb-2">You need more credits</h2>
            <p className="text-sm text-t-text-2 leading-relaxed">
              This report costs <span className="font-semibold text-t-text">{creditsNeeded} credits</span>.
              You currently have <span className="font-semibold text-t-accent-text">{currentCredits}</span>.
              {deficit > 0 && (
                <> Top up at least <span className="font-semibold text-t-text">{deficit} more</span> to continue.</>
              )}
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex items-center justify-center gap-6 mb-6 py-3 rounded-xl bg-t-surface-el border border-t-edge-muted">
            <div className="text-center">
              <p className="text-xl font-bold text-t-accent-text">{currentCredits}</p>
              <p className="text-[10px] text-t-text-3 uppercase tracking-wider">Balance</p>
            </div>
            <div className="w-px h-8 bg-t-edge" />
            <div className="text-center">
              <p className="text-xl font-bold text-t-text">{creditsNeeded}</p>
              <p className="text-[10px] text-t-text-3 uppercase tracking-wider">Needed</p>
            </div>
            <div className="w-px h-8 bg-t-edge" />
            <div className="text-center">
              <p className="text-xl font-bold text-red-400">{deficit}</p>
              <p className="text-[10px] text-t-text-3 uppercase tracking-wider">Short</p>
            </div>
          </div>

          {/* CTA */}
          <Link
            href="/subscribe"
            onClick={onClose}
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-t-accent py-3.5 text-sm font-semibold text-white hover:opacity-90 active:scale-[0.98] transition"
          >
            <Coins className="size-4" />
            {isPro ? 'Buy More Credits' : 'Get Credits'}
            <ArrowRight className="size-4" />
          </Link>

          {/* Pro upsell for free users */}
          {!isPro && (
            <div className="mt-4 rounded-xl border border-t-accent/20 bg-t-accent-soft p-3">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="size-4 text-t-accent-text" />
                <p className="text-xs font-semibold text-t-accent-text">Pro: 100 credits/month for $25</p>
              </div>
              <p className="text-[11px] text-t-text-3 leading-relaxed">
                That&apos;s 20 reports, multi-lingual support, and agent calls — all included.
              </p>
            </div>
          )}

          <button onClick={onClose} className="w-full mt-3 text-center text-xs text-t-text-4 hover:text-t-text-3 transition py-1">
            Maybe later
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
