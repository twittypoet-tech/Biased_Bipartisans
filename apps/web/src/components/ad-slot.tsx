'use client'

import { useEffect, useRef } from 'react'

interface AdSlotProps {
  format?: 'auto' | 'fluid' | 'rectangle' | 'horizontal'
  className?: string
}

export function AdSlot({ format = 'auto', className }: AdSlotProps) {
  const adRef = useRef<HTMLModElement>(null)
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    try {
      const adsbygoogle = (window as any).adsbygoogle ?? []
      adsbygoogle.push({})
      pushed.current = true
    } catch {}
  }, [])

  return (
    <div className={className}>
      <ins
        ref={adRef}
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client="ca-pub-3338044547412009"
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
