'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, Check } from 'lucide-react'

const IN_APP_UA_PATTERNS = [
  'Reddit',
  'Instagram',
  'FBAN', 'FBAV', 'FB_IAB',
  'LinkedInApp',
  'Twitter',
  'TikTok', 'BytedanceWebview',
  'Snapchat',
]

/**
 * iOS in-app browsers (Reddit, Instagram, etc.) use WKWebView without
 * identifying themselves in the UA string. Detect by checking:
 * - It's an iPhone/iPad (iOS)
 * - It's NOT full Safari (no "Safari/" token, or missing "Version/")
 * - It's NOT Chrome/Firefox/other known browsers
 */
function isIOSInAppBrowser(): boolean {
  const ua = navigator.userAgent
  if (!(/iPhone|iPad|iPod/.test(ua))) return false
  // Full Safari always has both "Version/" and "Safari/"
  if (ua.includes('Version/') && ua.includes('Safari/')) return false
  // Chrome, Firefox, etc. identify themselves
  if (ua.includes('CriOS') || ua.includes('FxiOS') || ua.includes('EdgiOS')) return false
  // What's left is a WKWebView in-app browser
  return true
}

export function InAppBrowserBanner() {
  const [isInApp, setIsInApp] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const params = new URLSearchParams(window.location.search)
    console.log('[InAppBanner] UA:', ua)
    if (params.get('debug-iab') === 'true' || IN_APP_UA_PATTERNS.some((p) => ua.includes(p)) || isIOSInAppBrowser()) {
      setIsInApp(true)
    }
  }, [])

  if (!isInApp) return null

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
