export function slugFromSegments(segments: string[] | undefined): string {
  if (!segments || segments.length === 0) return 'home'
  return segments.join('/')
}
