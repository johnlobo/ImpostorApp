import { describe, expect, it, vi } from 'vitest'
import type { RoundSessionRepository } from '../../../domain/ports/roundSession'
import { createRoundSessionContinuityAdapter } from './roundSessionContinuityAdapter'

describe('roundSessionContinuityAdapter', () => {
  it('rejects observer pause without reading private recovery', async () => {
    const load = vi.fn()
    const repository = { load } as unknown as RoundSessionRepository
    const adapter = createRoundSessionContinuityAdapter(repository, true)
    await expect(
      adapter.pauseForHome({
        gameId: 'game-1',
        expectedRevision: 2,
        confirmedAt: '2026-08-08T00:00:00.000Z',
      }),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'writer-unavailable', retryable: true },
    })
    expect(load).not.toHaveBeenCalled()
  })

  it('publishes a non-private capability', () => {
    const repository = {} as RoundSessionRepository
    expect(createRoundSessionContinuityAdapter(repository).capability()).toEqual({
      feature: 'clues',
      canPause: true,
      canAbandon: true,
      isPrivateSurface: false,
    })
  })
})
