'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Check } from 'lucide-react'

const SOCIAL_REFERRERS = [
  'reddit.com',
  'instagram.com',
  'facebook.com',
  'fb.com',
  'linkedin.com',
  'twitter.com',
  'x.com',
  't.co',
  'tiktok.com',
  'snapchat.com',
]

const IN_APP_UA_PATTERNS = [
  'Reddit',
  'Instagram',
  'FBAN', 'FBAV', 'FB_IAB',
  'LinkedInApp',
  'Twitter',
  'TikTok', 'BytedanceWebview',
  'Snapchat',
]

function isMobile(): boolean {
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
}

function fromSocialApp(): boolean {
  const ref = document.referrer.toLowerCase()
  if (SOCIAL_REFERRERS.some((d) => ref.includes(d))) return true
  // Also check UTM source for links tagged with ?utm_source=reddit etc
  const params = new URLSearchParams(window.location.search)
  const source = (params.get('utm_source') ?? '').toLowerCase()
  return SOCIAL_REFERRERS.some((d) => source.includes(d.replace('.com', '')))
}

export function InAppBrowserBanner() {
  const [show, setShow] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const params = new URLSearchParams(window.location.search)

    // Debug override
    if (params.get('debug-iab') === 'true') { setShow(true); return }

    // Android: UA string detection (they include app name)
    if (IN_APP_UA_PATTERNS.some((p) => ua.includes(p))) { setShow(true); return }

    // All platforms: mobile + came from a social app referrer
    if (isMobile() && fromSocialApp()) { setShow(true); return }
  }, [])

  if (!show) return null

  function handleCopy() {
    navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    setTimeout(() => setCopied(false), 4000)
  }

  return (
    <div className="px-4 py-3" style={{ backgroundColor: '#C8A44A' }}>
      <div className="mx-auto max-w-3xl flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-black leading-snug">
          {copied
            ? 'Link copied — paste in your browser for the full experience'
            : 'You\'re in a limited browser. Open in your browser for the full experience.'
          }
        </p>
        <button
          onClick={handleCopy}
          className="shrink-0 flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-white transition active:scale-95"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          {copied ? (
            <>
              <Check className="size-3.5" />
              Copied
            </>
          ) : (
            <>
              <ExternalLink className="size-3.5" />
              Open in Browser
            </>
          )}
        </button>
      </div>
    </div>
  )
}
