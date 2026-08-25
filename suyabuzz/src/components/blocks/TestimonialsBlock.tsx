export type TestimonialItem = {
  quote: string
  attribution: string
}

export type TestimonialsProps = {
  heading?: string
  items: TestimonialItem[]
}

export function TestimonialsBlock({ heading, items }: TestimonialsProps) {
  return (
    <section className="bg-charcoal px-6 py-16 text-white">
      <div className="mx-auto max-w-4xl">
        {heading ? (
          <h2 className="text-center font-display text-3xl md:text-4xl">{heading}</h2>
        ) : null}
        <div className="mt-10 grid gap-8 md:grid-cols-2">
          {items.map((item) => (
            <blockquote key={item.attribution} className="border-l-4 border-yellow pl-4">
              <p className="text-lg text-white/90 italic">&ldquo;{item.quote}&rdquo;</p>
              <cite className="mt-3 block font-body text-sm text-yellow not-italic">
                {item.attribution}
              </cite>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}
