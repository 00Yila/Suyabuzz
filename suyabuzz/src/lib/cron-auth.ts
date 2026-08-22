import { timingSafeEqual } from 'node:crypto'

export function isAuthorizedCronRequest(
  authorizationHeader: string | null,
  secret: string,
): boolean {
  if (!authorizationHeader) return false

  const received = Buffer.from(authorizationHeader)
  const expected = Buffer.from(`Bearer ${secret}`)

  // timingSafeEqual throws on length mismatch, so compare lengths first.
  // Length is not secret; the token contents are.
  if (received.length !== expected.length) return false

  return timingSafeEqual(received, expected)
}
