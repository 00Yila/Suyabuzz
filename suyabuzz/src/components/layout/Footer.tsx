import Link from 'next/link'
import type { Setting } from '@/payload-types'
import { formatHours } from '@/lib/hours'

// Legal page paths — structural site links, not business data, so (like the
// header's nav) they have no Settings field to come from.
const LEGAL_LINKS = [
  { label: 'Terms', href: '/legal/terms' },
  { label: 'Privacy', href: '/legal/privacy' },
  { label: 'Refund & Cancellation', href: '/legal/refund-and-cancellation' },
  { label: 'Order & Pickup Policy', href: '/legal/order-pickup-policy' },
]

function addressLine(address: Setting['address']): string {
  return [address.street, [address.city, address.state, address.postalCode].filter(Boolean).join(' ')]
    .filter(Boolean)
    .join(', ')
}

type SocialLink = { label: string; href: string }

function socialLinks(social: Setting['social']): SocialLink[] {
  const links: Array<SocialLink | null> = [
    social?.instagram ? { label: 'Instagram', href: `https://instagram.com/${social.instagram}` } : null,
    social?.facebook ? { label: 'Facebook', href: `https://facebook.com/${social.facebook}` } : null,
    social?.tiktok ? { label: 'TikTok', href: `https://www.tiktok.com/@${social.tiktok}` } : null,
  ]
  return links.filter((link): link is SocialLink => link !== null)
}

export function Footer({ settings }: { settings: Setting }) {
  const hours = formatHours(settings.openingHours ?? [])
  const social = socialLinks(settings.social)

  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <p className="font-display text-2xl text-yellow">{settings.businessName}</p>
          {settings.tagline ? <p className="mt-2 text-white/80">{settings.tagline}</p> : null}
        </div>

        <div>
          <h2 className="font-body text-sm font-bold tracking-widest text-yellow uppercase">Visit</h2>
          <address className="mt-3 not-italic text-white/80">{addressLine(settings.address)}</address>
          {settings.phone ? (
            <a href={`tel:${settings.phone}`} className="mt-2 block text-white/80 hover:text-white">
              {settings.phone}
            </a>
          ) : null}
          {settings.email ? (
            <a href={`mailto:${settings.email}`} className="mt-1 block text-white/80 hover:text-white">
              {settings.email}
            </a>
          ) : null}
        </div>

        {hours.length ? (
          <div>
            <h2 className="font-body text-sm font-bold tracking-widest text-yellow uppercase">
              Pickup hours
            </h2>
            <ul className="mt-3 space-y-1 text-white/80">
              {hours.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <div>
          {social.length ? (
            <>
              <h2 className="font-body text-sm font-bold tracking-widest text-yellow uppercase">Follow</h2>
              <ul className="mt-3 space-y-2">
                {social.map((entry) => (
                  <li key={entry.label}>
                    <a
                      href={entry.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${settings.businessName} on ${entry.label}`}
                      className="text-white/80 hover:text-white"
                    >
                      {entry.label}
                    </a>
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          <ul className="mt-6 space-y-1">
            {LEGAL_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-sm text-white/70 hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-6 py-6 text-center text-sm text-white/60">
        © {new Date().getFullYear()} {settings.businessName}. All rights reserved.
      </div>
    </footer>
  )
}
