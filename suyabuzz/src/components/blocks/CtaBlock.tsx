export type CtaProps = { heading: string; body?: string; label: string; href: string }

export function CtaBlock({ heading, body, label, href }: CtaProps) {
  return (
    <section className="bg-yellow px-6 py-16 text-ink">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="font-display text-3xl md:text-4xl">{heading}</h2>
        {body ? <p className="mt-4 text-lg">{body}</p> : null}
        <a
          href={href}
          className="mt-8 inline-block rounded-full bg-ink px-8 py-4 font-body font-bold text-white"
        >
          {label}
        </a>
      </div>
    </section>
  )
}
