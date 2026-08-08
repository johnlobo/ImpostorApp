import { describe, expect, it, vi } from 'vitest'

import type { PreparedRoster } from './playerGroup'
import {
  advanceClueTurn,
  beginClues,
  closeCluePhase,
  deriveClock,
  isCluePhaseSnapshot,
  isOpaqueResolutionLedgerEnvelope,
  isPreparedRound,
  isPublicRoundSession,
  pauseClock,
  prepareInitialPhase,
  prepareSuccessivePhase,
  resumeClock,
  type CluePhaseSnapshot,
  type PreparedRound,
} from './roundSession'

const at = (seconds: number) => `2026-08-08T00:00:${String(seconds).padStart(2, '0')}.000Z`
const roster: PreparedRoster = {
  players: ['Ana', 'Beto', 'Cora', 'Dani'].map((name, position) => ({
    id: `p${position + 1}`,
    name,
    position,
  })),
}

function round(overrides: Partial<PreparedRound> = {}): PreparedRound {
  return {
    schemaVersion: 1,
    identity: { gameId: 'game-1', roundNumber: 1 },
    totalRounds: 3,
    roster,
    conversation: { mode: 'timer', seconds: 60 },
    turnOrder: 'roster',
    voting: 'secret',
    elimination: 'successive',
    preparedAt: at(0),
    ...overrides,
  }
}

function active(source = round()): CluePhaseSnapshot {
  const prepared = prepareInitialPhase(source, () => 0, at(1))
  if (!prepared.ok) throw new Error('invalid fixture')
  const begun = beginClues(prepared.value, source, at(2))
  if (!begun.ok) throw new Error('invalid fixture')
  return begun.value
}

describe('round preparation', () => {
  it('prepares roster order defensively with round progress', () => {
    const source = round()
    const result = prepareInitialPhase(source, () => Number.NaN, at(1))
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.identity).toEqual({ gameId: 'game-1', roundNumber: 1, phaseNumber: 1 })
    expect(result.value.turnSequence).toEqual({
      mode: 'roster',
      playerIds: ['p1', 'p2', 'p3', 'p4'],
      startingPlayerId: 'p1',
    })
    expect(result.value.currentTurnIndex).toBe(0)
    source.roster.players[0]!.name = 'Changed'
    expect(result.value.participantIds).toEqual(['p1', 'p2', 'p3', 'p4'])
  })

  it('uses a complete deterministic Fisher-Yates permutation and validates every sample', () => {
    const random = vi.fn().mockReturnValueOnce(0).mockReturnValueOnce(0.5).mockReturnValueOnce(0)
    const result = prepareInitialPhase(round({ turnOrder: 'random' }), random, at(1))
    expect(result.ok && result.value.turnSequence).toEqual({
      mode: 'random',
      playerIds: ['p3', 'p4', 'p2', 'p1'],
      startingPlayerId: 'p3',
    })
    expect(random).toHaveBeenCalledTimes(3)
    expect(prepareInitialPhase(round({ turnOrder: 'random' }), () => 1, at(1))).toEqual({
      ok: false,
      issues: ['invalid-random'],
    })
  })

  it('keeps free mode neutral and creates only strict canonical successive subsets', () => {
    const free = prepareInitialPhase(round({ turnOrder: 'free' }), () => 0, at(1))
    expect(free.ok && free.value).toMatchObject({
      turnSequence: { mode: 'free' },
      stage: 'discussion',
      currentTurnIndex: null,
      completedCluePlayerIds: [],
    })
    const previous = {
      gameId: 'game-1',
      roundNumber: 1,
      phaseNumber: 1,
      participantIds: ['p1', 'p2', 'p3', 'p4'],
      closedAt: at(3),
      reason: 'manual' as const,
    }
    const next = prepareSuccessivePhase(
      round(),
      previous,
      {
        gameId: 'game-1',
        roundNumber: 1,
        phaseNumber: 2,
        eligiblePlayerIds: ['p3', 'p1'],
        issuedAt: at(4),
      },
      () => 0,
      at(5),
    )
    expect(next.ok && next.value.participantIds).toEqual(['p1', 'p3'])
    expect(
      prepareSuccessivePhase(
        round(),
        previous,
        {
          gameId: 'game-1',
          roundNumber: 1,
          phaseNumber: 2,
          eligiblePlayerIds: previous.participantIds,
          issuedAt: at(4),
        },
        () => 0,
        at(5),
      ),
    ).toEqual({ ok: false, issues: ['invalid-participants'] })
  })
})

describe('turn progress and clock', () => {
  it('begins once, advances only the expected current token, and makes repeats no-ops', () => {
    const phase = active()
    expect(beginClues(phase, round(), at(3))).toEqual({ ok: true, value: phase })
    expect(advanceClueTurn(phase, 1, at(3))).toEqual({ ok: false, issues: ['invalid-transition'] })
    const first = advanceClueTurn(phase, 0, at(3))
    expect(first.ok && first.value).toMatchObject({
      currentTurnIndex: 1,
      completedCluePlayerIds: ['p1'],
    })
    if (!first.ok) return
    expect(advanceClueTurn(first.value, 0, at(4))).toEqual({ ok: true, value: first.value })
    let current = first.value
    for (let index = 1; index < 4; index += 1) {
      const result = advanceClueTurn(current, index, at(index + 4))
      if (!result.ok) throw new Error('unexpected transition')
      current = result.value
    }
    expect(current).toMatchObject({
      stage: 'discussion',
      currentTurnIndex: null,
      completedCluePlayerIds: ['p1', 'p2', 'p3', 'p4'],
    })
  })

  it('caps backwards clock movement, expires forwards, and rejects nonfinite clocks', () => {
    const running = active().clock
    expect(deriveClock(running, at(1))).toMatchObject({ ok: true, value: { remainingSeconds: 60 } })
    expect(deriveClock(running, at(32))).toMatchObject({
      ok: true,
      value: { remainingSeconds: 30 },
    })
    expect(deriveClock(running, '2026-08-08T00:02:00.000Z')).toMatchObject({
      ok: true,
      value: { clock: { status: 'expired' }, remainingSeconds: 0 },
    })
    expect(
      deriveClock(
        {
          status: 'running',
          durationSeconds: 60,
          deadlineAt: 'bad',
          confirmedAt: at(2),
          maximumRemainingSeconds: 60,
        },
        at(3),
      ),
    ).toEqual({ ok: false, issues: ['invalid-clock'] })
  })

  it('pauses and resumes from durable remaining without resetting duration', () => {
    const paused = pauseClock(active(), at(32))
    expect(paused.ok && paused.value.clock).toEqual({
      status: 'paused',
      durationSeconds: 60,
      remainingSeconds: 30,
      pausedAt: at(32),
    })
    if (!paused.ok) return
    expect(pauseClock(paused.value, at(40))).toEqual({ ok: true, value: paused.value })
    const resumed = resumeClock(paused.value, at(40))
    expect(resumed.ok && resumed.value.clock).toEqual({
      status: 'running',
      durationSeconds: 60,
      deadlineAt: '2026-08-08T00:01:10.000Z',
      confirmedAt: at(40),
      maximumRemainingSeconds: 30,
    })
    if (!resumed.ok) return
    expect(resumeClock(resumed.value, at(41))).toEqual({ ok: true, value: resumed.value })
  })
})

describe('closure and guards', () => {
  it('closes manually or by effective expiry with canonical public handoffs', () => {
    const manual = closeCluePhase(active(), at(20), { confirmed: true })
    expect(manual.ok && manual.value.handoff).toEqual({
      gameId: 'game-1',
      roundNumber: 1,
      phaseNumber: 1,
      participantIds: ['p1', 'p2', 'p3', 'p4'],
      closedAt: at(20),
      reason: 'manual',
    })
    const expired = closeCluePhase(active(), '2026-08-08T00:02:00.000Z', { confirmed: true })
    expect(expired.ok && expired.value.handoff.reason).toBe('timer-expired')
    if (!expired.ok) return
    expect(closeCluePhase(expired.value.phase, at(30), { confirmed: true })).toEqual(expired)
    expect(JSON.stringify(expired.value.handoff)).not.toMatch(/role|concept|vote|clock/i)
  })

  it('validates snapshots and opaque ledger headers without inspecting payload', () => {
    expect(isPreparedRound(round())).toBe(true)
    expect(isCluePhaseSnapshot(active())).toBe(true)
    const payload = { future: { secret: 'opaque' } }
    expect(
      isOpaqueResolutionLedgerEnvelope({
        schemaVersion: 1,
        gameId: 'game-1',
        roundNumber: 1,
        payload,
      }),
    ).toBe(true)
  })

  it('rejects mismatched phase clocks and inconsistent public-session identities', () => {
    const prepared = prepareInitialPhase(round(), () => 0, at(1))
    if (!prepared.ok) throw new Error('invalid fixture')
    const runningClock = active().clock
    expect(isCluePhaseSnapshot({ ...prepared.value, clock: runningClock })).toBe(false)
    expect(
      isCluePhaseSnapshot({
        ...active(),
        clock: { status: 'ready', mode: 'timed', durationSeconds: 60 },
      }),
    ).toBe(false)

    const session = {
      schemaVersion: 1,
      preparedRound: round(),
      activePhase: active(),
      closedPhaseHandoffs: [],
    }
    expect(isPublicRoundSession(session)).toBe(true)
    expect(
      isPublicRoundSession({
        ...session,
        activePhase: {
          ...session.activePhase,
          identity: { ...session.activePhase.identity, gameId: 'another-game' },
        },
      }),
    ).toBe(false)
    expect(isPreparedRound(round({ conversation: { mode: 'timer', seconds: 45 } }))).toBe(false)
  })
})
