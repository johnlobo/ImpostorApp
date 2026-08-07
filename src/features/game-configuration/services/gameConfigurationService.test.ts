import { describe, expect, it, vi } from 'vitest'
import type { PreparedGame } from '../../../domain/entities/gameConfiguration'
import type { PreparedGameRepository } from '../../../domain/ports/gameConfiguration'
import { createGameConfigurationService } from './gameConfigurationService'

const roster = {
  players: [
    { id: 'ana', name: 'Ana', position: 0 },
    { id: 'bruno', name: 'Bruno', position: 1 },
    { id: 'carla', name: 'Carla', position: 2 },
  ],
}
const successRepository = (): {
  repository: PreparedGameRepository
  save: ReturnType<typeof vi.fn>
} => {
  const save = vi.fn((game: PreparedGame) =>
    Promise.resolve({ ok: true as const, value: { game, revision: 1 } }),
  )
  return { repository: { load: vi.fn().mockResolvedValue({ ok: true, value: null }), save }, save }
}
const build = (repository = successRepository().repository) =>
  createGameConfigurationService({
    roster,
    repository,
    createId: () => 'game-1',
    nowIso: () => '2026-08-07T00:00:00.000Z',
  })

describe('gameConfigurationService', () => {
  it('preserves the last valid draft after an invalid command', async () => {
    const service = build()
    await service.initialize()
    service.apply({ type: 'set-rounds', value: 11 })
    expect(service.getState().draft.rounds).toBe(3)
    expect(service.getState().issues).toContain('rounds-out-of-range')
  })

  it('reviews and confirms one immutable snapshot', async () => {
    const { repository, save } = successRepository()
    const service = build(repository)
    await service.initialize()
    service.review()
    await service.confirm()
    await service.confirm()
    expect(save).toHaveBeenCalledOnce()
    expect(service.getState().status).toBe('confirmed')
  })

  it('preserves the draft and retries the same snapshot after storage failure', async () => {
    const save = vi
      .fn<PreparedGameRepository['save']>()
      .mockResolvedValueOnce({ ok: false, error: { code: 'storage-full', retryable: true } })
      .mockImplementation((game) => Promise.resolve({ ok: true, value: { game, revision: 1 } }))
    const repository: PreparedGameRepository = {
      load: vi.fn().mockResolvedValue({ ok: true, value: null }),
      save,
    }
    const service = build(repository)
    await service.initialize()
    service.review()
    await service.confirm()
    expect(service.getState().draft.rounds).toBe(3)
    await service.retry()
    expect(service.getState().status).toBe('confirmed')
    const calls = save.mock.calls
    expect(calls[0]?.[0].id).toBe(calls[1]?.[0].id)
  })
})
