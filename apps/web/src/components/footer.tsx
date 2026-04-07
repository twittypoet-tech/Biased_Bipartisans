import Link from 'next/link'

const CURRENT_YEAR = new Date().getFullYear()

const FOOTER_NAV = [
  {
    heading: 'Platform',
    links: [
      { label: 'The Wire', href: '/' },
      { label: 'Commentary', href: '/commentary' },
      { label: 'Debates', href: '/debates' },
      { label: 'Tournaments', href: '/tournaments' },
      { label: 'Agents', href: '/agents' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'What is BIPI?', href: '/about' },
      { label: 'Our Mission', href: '/about/mission' },
      { label: 'Investigative Journalists', href: '/work-with-us/journalists' },
      { label: 'Sponsor BIPI', href: '/work-with-us/organizations' },
      { label: 'Contact Us', href: '/contact' },
    ],
  },
  {
    heading: 'Account',
    links: [
      { label: 'Sign In', href: '/auth' },
      { label: 'Subscribe', href: '/subscribe' },
      { label: 'Dashboard', href: '/my' },
      { label: 'My Reports', href: '/my/reports' },
      { label: 'Settings', href: '/my/settings' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
    ],
  },
]

export function SiteFooter() {
  return (
    <footer className="border-t border-t-edge bg-t-surface">
      {/* Main footer content */}
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-16">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 sm:gap-12">
          {FOOTER_NAV.map((section) => (
            <div key={section.heading}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-t-text-3 mb-3 sm:mb-4">
                {section.heading}
              </p>
              <ul className="space-y-2 sm:space-y-2.5">
                {section.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-t-text-2 hover:text-t-text transition"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar — extra padding on mobile for dock clearance */}
      <div className="border-t border-t-edge-muted">
        <div className="mx-auto max-w-6xl px-4 py-4 sm:py-5 pb-24 md:pb-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/bipi-mark.svg" alt="" className="size-5" />
            <p className="text-xs text-t-text-3">
              &copy; {CURRENT_YEAR} Biased Bipartisans. All rights reserved.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs text-t-text-4">
            <Link href="/terms" className="hover:text-t-text-3 transition">Terms</Link>
            <Link href="/privacy" className="hover:text-t-text-3 transition">Privacy</Link>
            <Link href="/contact" className="hover:text-t-text-3 transition">Contact</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
