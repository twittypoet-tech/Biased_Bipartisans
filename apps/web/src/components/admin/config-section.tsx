'use client'

import { useState } from 'react'

interface ConfigSectionProps {
  title: string
  version?: number
  status?: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export function ConfigSection({ title, version, status, children, defaultOpen = false }: ConfigSectionProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900/30">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left hover:bg-neutral-800/30"
      >
        <div className="flex items-center gap-3">
          <h3 className="font-semibold">{title}</h3>
          {version != null && (
            <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
              v{version}
            </span>
          )}
          {status && (
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                status === 'active'
                  ? 'bg-emerald-900 text-emerald-200'
                  : status === 'draft'
                    ? 'bg-yellow-900 text-yellow-200'
                    : 'bg-neutral-700 text-neutral-300'
              }`}
            >
              {status}
            </span>
          )}
        </div>
        <span className="text-neutral-500">{open ? '−' : '+'}</span>
      </button>
      {open && <div className="border-t border-neutral-800 p-4">{children}</div>}
    </div>
  )
}

export function DataList({ items }: { items: Array<{ label: string; value: React.ReactNode }> }) {
  return (
    <dl className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-3">
          <dt className="w-40 shrink-0 text-sm text-neutral-500">{item.label}</dt>
          <dd className="text-sm">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function TagList({ tags, color = 'neutral' }: { tags: string[]; color?: string }) {
  const colorClasses: Record<string, string> = {
    neutral: 'bg-neutral-800 text-neutral-300',
    red: 'bg-red-950 text-red-300',
    blue: 'bg-blue-950 text-blue-300',
    green: 'bg-emerald-950 text-emerald-300',
    amber: 'bg-amber-950 text-amber-300',
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span key={i} className={`rounded px-2 py-0.5 text-xs ${colorClasses[color] ?? colorClasses.neutral}`}>
          {tag}
        </span>
      ))}
    </div>
  )
}

export function MeterBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 100)
  return (
    <div className="flex items-center gap-3">
      <span className="w-36 shrink-0 text-sm text-neutral-500">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-neutral-800">
        <div
          className="h-2 rounded-full bg-neutral-400"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 text-right text-xs text-neutral-500">{pct}%</span>
    </div>
  )
}
