import { describe, expect, it } from 'vitest'
import { projectName } from '@/lib/project'

describe('test harness', () => {
  it('resolves the @/ path alias', () => {
    expect(projectName).toBe('suyabuzz')
  })
})
