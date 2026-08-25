type Icon = 'clock' | 'pin' | 'flame' | 'bag'

const ICON_PATHS: Record<Icon, string> = {
  clock: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  pin: 'M12 21s-6-5.686-6-10a6 6 0 1112 0c0 4.314-6 10-6 10zm0-7a3 3 0 100-6 3 3 0 000 6z',
  flame: 'M12 2c1 4-4 5-4 9a4 4 0 108 0c0-2-1-3-1-3s2 1 2 4a6 6 0 11-12 0c0-5 4-6 7-10z',
  bag: 'M6 7h12l1 13H5L6 7zm3 0V5a3 3 0 016 0v2',
}

function IconGridIcon({ icon }: { icon: Icon }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-7 w-7"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d={ICON_PATHS[icon]} />
    </svg>
  )
}

export type IconGridItem = {
  icon: Icon
  title: string
  body: string
}

export type IconGridProps = {
  heading?: string
  items: IconGridItem[]
}

export function IconGridBlock({ heading, items }: IconGridProps) {
  return (
    <section className="bg-surface px-6 py-16 text-ink">
      <div className="mx-auto max-w-5xl">
        {heading ? (
          <h2 className="text-center font-display text-3xl md:text-4xl">{heading}</h2>
        ) : null}
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item) => (
            <div key={item.title} className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-yellow text-ink">
                <IconGridIcon icon={item.icon} />
              </div>
              <h3 className="mt-4 font-display text-xl">{item.title}</h3>
              <p className="mt-2 text-ink/80">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
