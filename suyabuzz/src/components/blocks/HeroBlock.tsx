type Action = { label: string; href: string; style?: 'primary' | 'secondary' }

export type HeroProps = {
  eyebrow?: string
  heading: string
  body?: string
  actions?: Action[]
}

export function HeroBlock({ eyebrow, heading, body, actions }: HeroProps) {
  return (
    <section className="bg-charcoal px-6 py-20 text-white">
      <div className="mx-auto max-w-3xl">
        {eyebrow ? (
          <p className="mb-3 font-body text-sm tracking-widest text-yellow uppercase">{eyebrow}</p>
        ) : null}
        <h1 className="font-display text-4xl leading-tight md:text-6xl">{heading}</h1>
        {body ? <p className="mt-5 max-w-prose text-lg text-white/90">{body}</p> : null}
        {actions?.length ? (
          <div className="mt-8 flex flex-wrap gap-4">
            {actions.map((action) => (
              <a
                key={`${action.label}-${action.href}`}
                href={action.href}
                className={
                  action.style === 'secondary'
                    ? 'rounded-full border-2 border-yellow px-6 py-3 font-body font-bold text-yellow'
                    : 'rounded-full bg-yellow px-6 py-3 font-body font-bold text-ink'
                }
              >
                {action.label}
              </a>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}
