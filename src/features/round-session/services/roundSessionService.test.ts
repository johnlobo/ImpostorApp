import { describe, expect, it, vi } from 'vitest'
import type { PublicRoundSession } from '../../../domain/entities/roundSession'
import type { RoundSessionRepository } from '../../../domain/ports/roundSession'
import { createRoundSessionService } from './roundSessionService'

function session(state: PublicRoundSession['activePhase']['state'] = 'ready'): PublicRoundSession {
  return {
    schemaVersion: 1,
    preparedRound: {
      schemaVersion: 1,
      identity: { gameId: 'game-1', roundNumber: 1 },
      totalRounds: 3,
      roster: {
        players: [
          { id: 'p1', name: 'Ana', position: 0 },
          { id: 'p2', name: 'Bruno', position: 1 },
          { id: 'p3', name: 'Carla', position: 2 },
        ],
      },
      conversation: { mode: 'timer', seconds: 60 },
      turnOrder: 'roster',
      voting: 'verbal',
      elimination: 'single',
      preparedAt: '2026-08-08T00:00:00.000Z',
    },
    activePhase: {
      schemaVersion: 1,
      identity: { gameId: 'game-1', roundNumber: 1, phaseNumber: 1 },
      participantIds: ['p1', 'p2', 'p3'],
      turnSequence: {
        mode: 'roster',
        playerIds: ['p1', 'p2', 'p3'],
        startingPlayerId: 'p1',
      },
      clock:
        state === 'ready'
          ? { status: 'ready', mode: 'timed', durationSeconds: 60 }
          : {
              status: 'running',
              durationSeconds: 60,
              deadlineAt: '2026-08-08T00:01:00.000Z',
              confirmedAt: '2026-08-08T00:00:00.000Z',
              maximumRemainingSeconds: 60,
            },
      stage: 'clues',
      currentTurnIndex: 0,
      completedCluePlayerIds: [],
      state,
      createdAt: '2026-08-08T00:00:00.000Z',
      updatedAt: '2026-08-08T00:00:00.000Z',
      closure: null,
    },
    closedPhaseHandoffs: [],
  }
}

function repository(value = session()) {
  const load = vi.fn().mockResolvedValue({ ok: true, value: { session: value, revision: 2 } })
  const begin = vi.fn().mockResolvedValue({
    ok: true,
    value: { session: session('active'), revision: 3 },
  })
  const valueRepository = {
    load,
    prepareInitial: vi.fn(),
    prepareNext: vi.fn(),
    begin,
    advanceClueTurn: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    close: vi.fn(),
  } as unknown as RoundSessionRepository
  return { value: valueRepository, load, begin }
}

describe('roundSessionService', () => {
  it('loads ready and begins with the confirmed revision', async () => {
    const repo = repository()
    const service = createRoundSessionService({
      repository: repo.value,
      now: () => Date.parse('2026-08-08T00:00:10.000Z'),
    })
    await service.initialize()
    expect(service.getState().status).toBe('ready')
    await service.begin()
    expect(repo.begin).toHaveBeenCalledWith(2)
    expect(service.getState()).toMatchObject({ status: 'clues', revision: 3 })
  })

  it('retries a transient command with the captured intention after public error state', async () => {
    const repo = repository()
    repo.begin
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'storage-full', retryable: true },
      })
      .mockResolvedValueOnce({
        ok: true,
        value: { session: session('active'), revision: 3 },
      })
    const service = createRoundSessionService({
      repository: repo.value,
      now: () => Date.parse('2026-08-08T00:00:10.000Z'),
    })
    await service.initialize()
    await service.begin()
    expect(service.getState().status).toBe('error')
    await service.retry()
    expect(repo.begin).toHaveBeenCalledTimes(2)
    expect(service.getState().status).toBe('clues')
  })

  it('reloads a revision conflict without replaying the stale command', async () => {
    const repo = repository()
    repo.begin.mockResolvedValueOnce({
      ok: false,
      error: { code: 'revision-conflict', retryable: true },
    })
    const service = createRoundSessionService({ repository: repo.value })
    await service.initialize()
    await service.begin()
    await service.retry()
    expect(repo.load).toHaveBeenCalledTimes(2)
    expect(repo.begin).toHaveBeenCalledOnce()
  })
})
