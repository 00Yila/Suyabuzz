import Image from 'next/image'
import Link from 'next/link'
import type { Setting } from '@/payload-types'
import { MobileNav, type NavLink } from './MobileNav'
import { OrderingNotice } from './OrderingNotice'

// Structural site navigation — not business data, so it has no Settings
// field to come from. Phase 1 ships no cart; there is no cart icon here.
const NAV_LINKS: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'Menu', href: '/menu' },
  { label: 'How to Order', href: '/how-to-order' },
  { label: 'Pickup', href: '/pickup' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

export function Header({ settings }: { settings: Setting }) {
  return (
    <header className="border-b border-ink/10 bg-cream">
      {settings.orderingNotice ? <OrderingNotice message={settings.orderingNotice} /> : null}

      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <Link href="/" className="shrink-0">
          <Image src="/logo.svg" alt={settings.businessName} width={160} height={45} className="h-10 w-auto" priority />
        </Link>

        <MobileNav links={NAV_LINKS} />

        {settings.phone ? (
          <a href={`tel:${settings.phone}`} className="shrink-0 font-body font-bold text-ink">
            {settings.phone}
          </a>
        ) : null}
      </div>
    </header>
  )
}
