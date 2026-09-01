'use client'

import { useRef, useState, type FormEvent } from 'react'
import { contactSchema } from '@/lib/contact-schema'

type FieldName = 'name' | 'email' | 'phone' | 'message'

type FieldErrors = Partial<Record<FieldName | 'website', string[] | undefined>>

type Status = 'idle' | 'submitting' | 'success' | 'error'

const FIELD_ORDER: FieldName[] = ['name', 'email', 'phone', 'message']

export function ContactForm({ phone, whatsappNumber }: { phone: string; whatsappNumber?: string }) {
  const [errors, setErrors] = useState<FieldErrors>({})
  const [status, setStatus] = useState<Status>('idle')
  const [statusMessage, setStatusMessage] = useState('')

  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)
  const phoneRef = useRef<HTMLInputElement>(null)
  const messageRef = useRef<HTMLTextAreaElement>(null)
  const fieldRefs = { name: nameRef, email: emailRef, phone: phoneRef, message: messageRef }

  function focusFirstInvalid(fieldErrors: FieldErrors) {
    const firstInvalid = FIELD_ORDER.find((field) => fieldErrors[field]?.length)
    if (firstInvalid) fieldRefs[firstInvalid].current?.focus()
  }

  // True only for the general/network/500 failure path: field-level errors
  // (bad email, empty name, ...) already render their own visible messages
  // next to each input, so this only needs to cover the case where
  // `status === 'error'` but no individual field is at fault.
  const hasFieldErrors = FIELD_ORDER.some((field) => errors[field]?.length)
  const showGeneralError = status === 'error' && !hasFieldErrors

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const raw = {
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      message: String(formData.get('message') ?? ''),
      website: String(formData.get('website') ?? ''),
    }

    const parsed = contactSchema.safeParse(raw)

    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors as FieldErrors
      setErrors(fieldErrors)
      setStatus('error')
      setStatusMessage('Please fix the highlighted fields and try again.')
      focusFirstInvalid(fieldErrors)
      return
    }

    setErrors({})
    setStatus('submitting')
    setStatusMessage('Sending your message…')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed.data),
      })

      if (response.ok) {
        setStatus('success')
        setStatusMessage('Thanks — your message is on its way!')
        return
      }

      if (response.status === 400) {
        const body = (await response.json().catch(() => null)) as { errors?: FieldErrors } | null
        const fieldErrors = body?.errors ?? {}
        setErrors(fieldErrors)
        setStatus('error')
        setStatusMessage('Please fix the highlighted fields and try again.')
        focusFirstInvalid(fieldErrors)
        return
      }

      throw new Error(`Unexpected response: ${response.status}`)
    } catch {
      setStatus('error')
      setStatusMessage(
        'Something went wrong sending your message. Please call or WhatsApp us instead.',
      )
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-charcoal/10 bg-surface p-8">
        <h2 className="font-display text-2xl">Message sent!</h2>
        <p className="mt-3 text-charcoal">
          Thanks for reaching out — we will reply to your email as soon as we can. Need a faster
          answer?
        </p>
        <ul className="mt-4 space-y-2 text-charcoal">
          <li>
            Call or text{' '}
            <a href={`tel:${phone}`} className="font-bold text-ink underline">
              {phone}
            </a>
          </li>
          {whatsappNumber ? (
            <li>
              Message us on{' '}
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold text-ink underline"
              >
                WhatsApp
              </a>
            </li>
          ) : null}
        </ul>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      <p role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </p>

      <div>
        <label htmlFor="contact-name" className="block font-body font-bold">
          Name
        </label>
        <input
          ref={nameRef}
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          required
          aria-invalid={errors.name?.length ? 'true' : undefined}
          aria-describedby={errors.name?.length ? 'contact-name-error' : undefined}
          className="mt-1 w-full rounded-lg border border-charcoal/20 bg-cream px-4 py-3"
        />
        {errors.name?.length ? (
          <p
            id="contact-name-error"
            aria-live="polite"
            className="mt-1 border-l-2 border-ember pl-2 text-sm font-semibold text-ink"
          >
            {errors.name[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="contact-email" className="block font-body font-bold">
          Email
        </label>
        <input
          ref={emailRef}
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={errors.email?.length ? 'true' : undefined}
          aria-describedby={errors.email?.length ? 'contact-email-error' : undefined}
          className="mt-1 w-full rounded-lg border border-charcoal/20 bg-cream px-4 py-3"
        />
        {errors.email?.length ? (
          <p
            id="contact-email-error"
            aria-live="polite"
            className="mt-1 border-l-2 border-ember pl-2 text-sm font-semibold text-ink"
          >
            {errors.email[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="contact-phone" className="block font-body font-bold">
          Phone <span className="font-normal text-charcoal/60">(optional)</span>
        </label>
        <input
          ref={phoneRef}
          id="contact-phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          aria-invalid={errors.phone?.length ? 'true' : undefined}
          aria-describedby={errors.phone?.length ? 'contact-phone-error' : undefined}
          className="mt-1 w-full rounded-lg border border-charcoal/20 bg-cream px-4 py-3"
        />
        {errors.phone?.length ? (
          <p
            id="contact-phone-error"
            aria-live="polite"
            className="mt-1 border-l-2 border-ember pl-2 text-sm font-semibold text-ink"
          >
            {errors.phone[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="contact-message" className="block font-body font-bold">
          Message
        </label>
        <textarea
          ref={messageRef}
          id="contact-message"
          name="message"
          rows={5}
          required
          aria-invalid={errors.message?.length ? 'true' : undefined}
          aria-describedby={errors.message?.length ? 'contact-message-error' : undefined}
          className="mt-1 w-full rounded-lg border border-charcoal/20 bg-cream px-4 py-3"
        />
        {errors.message?.length ? (
          <p
            id="contact-message-error"
            aria-live="polite"
            className="mt-1 border-l-2 border-ember pl-2 text-sm font-semibold text-ink"
          >
            {errors.message[0]}
          </p>
        ) : null}
      </div>

      {/*
        Honeypot: invisible to sighted and screen-reader users, but present
        in the DOM and in the accessibility tree's form-fill order the way a
        script scraping every <input> would see it. Hidden with CSS (never
        type="hidden", which many bots skip), pulled out of tab order, and
        excluded from autofill so a human never fills it by accident.
      */}
      <div
        aria-hidden="true"
        style={{ position: 'absolute', overflow: 'hidden', width: 1, height: 1, left: -9999 }}
      >
        <label htmlFor="contact-website">Leave this field blank</label>
        <input id="contact-website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {showGeneralError ? (
        <p className="border-l-2 border-ember pl-3 text-sm font-semibold text-ink">
          {statusMessage}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="rounded-full bg-ink px-8 py-4 font-body font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  )
}
