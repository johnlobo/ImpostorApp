/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/unbound-method */
import { describe, expect, it, vi } from 'vitest'
import type { PreparedContentSelection } from '../../../domain/entities/contentCatalog'
import type { SecretRoundSnapshot } from '../../../domain/entities/secretRoleAssignment'
import type { SecretRoundRepository } from '../../../domain/ports/secretRoleAssignment'
import { createSecretRoleAssignmentService } from './secretRoleAssignmentService'

const content: PreparedContentSelection = {
  schemaVersion: 1,
  createdAt: '2026-08-08T00:00:00Z',
  game: {
    schemaVersion: 1,
    id: 'game-1',
    createdAt: '2026-08-08T00:00:00Z',
    roster: {
      players: ['Ana', 'Bruno', 'Carla'].map((name, position) => ({
        id: `p${position + 1}`,
        name,
        position,
      })),
    },
    rules: {
      rounds: 3,
      impostorCount: 1,
      conversation: { mode: 'free' },
      turnOrder: 'roster',
      voting: 'verbal',
      finalAttempt: false,
      allocation: 'random',
      impostorAwareness: 'unknown',
      elimination: 'single',
    },
  },
  selection: { mode: 'all' },
  eligibleCategoryIds: ['cat-1'],
  categories: [
    {
      id: 'cat-1',
      schemaVersion: 1,
      source: 'built-in',
      name: 'Lugares',
      adult: false,
      concepts: Array.from({ length: 10 }, (_, index) => ({
        id: `concept-${index}`,
        text: `Lugar ${index}`,
      })),
      createdAt: null,
      updatedAt: null,
    },
  ],
  adultContentEnabled: false,
}

function round(reveals: readonly ('pending' | 'completed')[] = ['pending', 'pending', 'pending']) {
  return {
    schemaVersion: 1,
    content,
    roundNumber: 1,
    assignments: [
      { playerId: 'p1', role: 'impostor' },
      { playerId: 'p2', role: 'citizen' },
      { playerId: 'p3', role: 'citizen' },
    ],
    concept: { gameId: 'game-1', categoryId: 'cat-1', conceptId: 'concept-0', text: 'Lugar 0' },
    impostorAwareness: 'unknown',
    reveals: reveals.map((status, index) => ({ playerId: `p${index + 1}`, status })),
    createdAt: '2026-08-08T00:01:00Z',
  } satisfies SecretRoundSnapshot
}

function setup(stored: SecretRoundSnapshot | null = null, readOnly = false) {
  const prepared = round()
  const resetHistory = vi.fn(async () => ({ ok: true as const, value: undefined }))
  const repository: SecretRoundRepository = {
    load: vi.fn(async () => ({
      ok: true as const,
      value: stored ? { snapshot: stored, revision: 4 } : { snapshot: null, revision: 2 },
    })),
    prepare: vi.fn(async () => ({
      ok: true as const,
      value: { snapshot: prepared, revision: 3 },
    })),
    completeReveal: vi.fn(async (playerId: string, revision: number) => ({
      ok: true as const,
      value: {
        snapshot: {
          ...prepared,
          reveals: prepared.reveals.map((entry) =>
            entry.playerId === playerId ? { ...entry, status: 'completed' as const } : entry,
          ),
        },
        revision: revision + 1,
      },
    })),
  }
  return {
    repository,
    resetHistory,
    service: createSecretRoleAssignmentService({
      content,
      repository,
      random: () => 0,
      resetHistory,
      readOnly,
    }),
  }
}

describe('secret role assignment service', () => {
  it('prepares a missing round from the inherited recovery revision', async () => {
    const { repository, service } = setup()
    await service.initialize()
    expect(repository.prepare).toHaveBeenCalledWith(content, 2, expect.any(Function))
    expect(service.getState()).toMatchObject({ status: 'shared', revision: 3 })
    expect(service.getState().progress?.completed).toBe(0)
  })

  it('reloads after a preparation revision conflict', async () => {
    const { repository, service } = setup()
    vi.mocked(repository.prepare).mockResolvedValueOnce({
      ok: false,
      error: { code: 'revision-conflict', retryable: true },
    })
    vi.mocked(repository.load)
      .mockResolvedValueOnce({ ok: true, value: { snapshot: null, revision: 2 } })
      .mockResolvedValueOnce({ ok: true, value: { snapshot: round(), revision: 3 } })

    await service.initialize()
    expect(service.getState().status).toBe('error')
    await service.retry()
    expect(repository.load).toHaveBeenCalledTimes(2)
    expect(repository.prepare).toHaveBeenCalledOnce()
    expect(service.getState()).toMatchObject({ status: 'shared', revision: 3 })
  })

  it('resets exhausted concept history only after the explicit command', async () => {
    const { repository, resetHistory, service } = setup()
    vi.mocked(repository.prepare)
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'content-exhausted', retryable: false },
      })
      .mockResolvedValueOnce({
        ok: true,
        value: { snapshot: round(), revision: 3 },
      })

    await service.initialize()
    expect(service.getState().storageError?.code).toBe('content-exhausted')
    expect(resetHistory).not.toHaveBeenCalled()
    await service.resetHistory()
    expect(resetHistory).toHaveBeenCalledOnce()
    expect(service.getState()).toMatchObject({ status: 'shared', revision: 3 })
  })

  it('persists completion before projecting the private role', async () => {
    const { repository, service } = setup(round())
    await service.initialize()
    service.selectPlayer('p2')
    expect(service.getState().privateRole).toBeNull()
    await service.reveal()
    expect(repository.completeReveal).toHaveBeenCalledWith('p2', 4)
    expect(service.getState()).toMatchObject({
      status: 'private-revealed',
      privateRole: { kind: 'citizen', category: 'Lugares', concept: 'Lugar 0' },
    })
    service.conceal()
    expect(service.getState()).toMatchObject({ status: 'shared', privateRole: null })
  })

  it('retries a transient storage failure without exposing the private role early', async () => {
    const { repository, service } = setup(round())
    vi.mocked(repository.completeReveal)
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'storage-full', retryable: true },
      })
      .mockResolvedValueOnce({
        ok: true,
        value: {
          snapshot: round(['pending', 'completed', 'pending']),
          revision: 5,
        },
      })
    await service.initialize()
    service.selectPlayer('p2')
    await service.reveal()
    expect(service.getState()).toMatchObject({
      status: 'error',
      privateRole: null,
      storageError: { code: 'storage-full' },
    })

    await service.retry()
    expect(repository.completeReveal).toHaveBeenCalledTimes(2)
    expect(repository.completeReveal).toHaveBeenLastCalledWith('p2', 4)
    expect(service.getState()).toMatchObject({
      status: 'private-revealed',
      revision: 5,
      privateRole: { kind: 'citizen', concept: 'Lugar 0' },
    })
  })

  it('reloads after a revision conflict instead of retrying a stale revision', async () => {
    const { repository, service } = setup(round())
    vi.mocked(repository.completeReveal).mockResolvedValueOnce({
      ok: false,
      error: { code: 'revision-conflict', retryable: true },
    })
    vi.mocked(repository.load)
      .mockResolvedValueOnce({ ok: true, value: { snapshot: round(), revision: 4 } })
      .mockResolvedValueOnce({
        ok: true,
        value: { snapshot: round(['pending', 'completed', 'pending']), revision: 5 },
      })
    await service.initialize()
    service.selectPlayer('p2')
    await service.reveal()

    await service.retry()
    expect(repository.load).toHaveBeenCalledTimes(2)
    expect(repository.completeReveal).toHaveBeenCalledTimes(1)
    expect(service.getState()).toMatchObject({ status: 'shared', revision: 5 })
    expect(service.getState().progress?.players[1]?.status).toBe('completed')
  })

  it('ignores a second reveal while the first persistence call is pending', async () => {
    const { repository, service } = setup(round())
    let resolveReveal!: (
      value: Awaited<ReturnType<SecretRoundRepository['completeReveal']>>,
    ) => void
    vi.mocked(repository.completeReveal).mockImplementationOnce(
      () => new Promise((resolve) => (resolveReveal = resolve)),
    )
    await service.initialize()
    service.selectPlayer('p2')
    const first = service.reveal()
    const second = service.reveal()
    expect(repository.completeReveal).toHaveBeenCalledOnce()
    expect(service.getState()).toMatchObject({ status: 'revealing', privateRole: null })
    resolveReveal({
      ok: true,
      value: { snapshot: round(['pending', 'completed', 'pending']), revision: 5 },
    })
    await Promise.all([first, second])
    expect(repository.completeReveal).toHaveBeenCalledOnce()
  })

  it('only returns a public handoff after every reveal is complete', async () => {
    const { service } = setup(round(['completed', 'completed', 'completed']))
    await service.initialize()
    expect(service.getState().status).toBe('ready')
    expect(service.startRound()).toEqual({
      gameId: 'game-1',
      roundNumber: 1,
      preparedAt: '2026-08-08T00:01:00Z',
    })
  })

  it('keeps start blocked below N/N', async () => {
    const { service } = setup(round(['completed', 'completed', 'pending']))
    await service.initialize()
    expect(service.getState()).toMatchObject({ status: 'shared' })
    expect(service.startRound()).toBeNull()
  })

  it('does not prepare or reveal in observer mode', async () => {
    const { repository, service } = setup(null, true)
    await service.initialize()
    expect(repository.prepare).not.toHaveBeenCalled()
    expect(service.getState().storageError?.code).toBe('writer-unavailable')
    service.selectPlayer('p1')
    await service.reveal()
    expect(repository.completeReveal).not.toHaveBeenCalled()
  })

  it('projects an existing secret snapshot to public-only observer state', async () => {
    const secret = round(['completed', 'pending', 'pending'])
    const { repository, service } = setup(secret, true)
    await service.initialize()
    expect(service.getState()).toMatchObject({
      status: 'shared',
      readOnly: true,
      privateRole: null,
      progress: { completed: 1, total: 3 },
    })
    const serialized = JSON.stringify(service.getState())
    expect(serialized).not.toContain(secret.concept.text)
    expect(serialized).not.toContain('impostor')
    service.selectPlayer('p2')
    await service.reveal()
    expect(repository.completeReveal).not.toHaveBeenCalled()
  })

  it.each([
    ['known', ['Bruno']],
    ['unknown', []],
  ] as const)(
    'applies %s awareness only in the private projection',
    async (awareness, companions) => {
      const multiContent: PreparedContentSelection = {
        ...content,
        game: {
          ...content.game,
          roster: {
            players: ['Ana', 'Bruno', 'Carla', 'Dani', 'Eva', 'Fede'].map((name, position) => ({
              id: `p${position + 1}`,
              name,
              position,
            })),
          },
          rules: {
            ...content.game.rules,
            impostorCount: 2,
            allocation: 'balanced',
            impostorAwareness: awareness,
            elimination: 'successive',
          },
        },
      }
      const multiRound: SecretRoundSnapshot = {
        ...round(),
        content: multiContent,
        assignments: multiContent.game.roster.players.map(({ id }, index) => ({
          playerId: id,
          role: index < 2 ? 'impostor' : 'citizen',
        })),
        impostorAwareness: awareness,
        reveals: multiContent.game.roster.players.map(({ id }, index) => ({
          playerId: id,
          status: index === 0 ? 'completed' : 'pending',
        })),
      }
      const pendingRound: SecretRoundSnapshot = {
        ...multiRound,
        reveals: multiRound.reveals.map((entry) => ({ ...entry, status: 'pending' })),
      }
      const repository: SecretRoundRepository = {
        load: vi.fn(async () => ({
          ok: true as const,
          value: { snapshot: pendingRound, revision: 5 },
        })),
        prepare: vi.fn(),
        completeReveal: vi.fn(async () => ({
          ok: true as const,
          value: { snapshot: multiRound, revision: 6 },
        })),
      }
      const service = createSecretRoleAssignmentService({
        content: multiContent,
        repository,
        random: () => 0,
      })
      await service.initialize()
      service.selectPlayer('p1')
      await service.reveal()
      expect(service.getState().privateRole).toEqual({
        kind: 'impostor',
        category: 'Lugares',
        companions,
      })
      expect(JSON.stringify(service.getState().progress)).not.toMatch(/Lugar 0|impostor/)
    },
  )
})
