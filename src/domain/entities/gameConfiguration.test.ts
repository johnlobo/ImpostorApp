import { describe, expect, it } from 'vitest'

import type { PreparedRoster } from './playerGroup'
import {
  applyConfigurationCommand,
  confirmConfiguration,
  createConfigurationDraft,
  isPreparedGame,
  maximumImpostors,
  validateConfiguration,
} from './gameConfiguration'

function roster(size: number): PreparedRoster {
  return {
    players: Array.from({ length: size }, (_, position) => ({
      id: `player-${position}`,
      name: `Jugador ${position + 1}`,
      position,
    })),
  }
}

function draftFor(size = 6) {
  const result = createConfigurationDraft(roster(size))
  if (!result.ok) throw new Error('expected valid draft')
  return result.value
}

describe('game configuration', () => {
  it('creates defaults and copies the roster defensively', () => {
    const input = roster(6)
    const result = createConfigurationDraft(input)
    expect(result).toMatchObject({
      ok: true,
      value: {
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
    })
    if (result.ok) {
      expect(result.value.roster).not.toBe(input)
      expect(result.value.roster.players).not.toBe(input.players)
      expect(result.value.roster.players[0]).not.toBe(input.players[0])
    }
  })

  it('rejects malformed rosters', () => {
    expect(createConfigurationDraft(roster(2))).toEqual({ ok: false, issues: ['invalid-roster'] })
    const input = roster(3)
    const duplicate = {
      players: input.players.map((player, index) =>
        index === 1 ? { ...player, id: input.players[0]!.id } : player,
      ),
    }
    expect(createConfigurationDraft(duplicate)).toEqual({ ok: false, issues: ['invalid-roster'] })
  })

  it.each([
    [3, 1],
    [5, 1],
    [6, 2],
    [8, 2],
    [9, 3],
    [20, 3],
  ])('derives %i players as at most %i impostors', (players, expected) => {
    expect(maximumImpostors(players)).toBe(expected)
  })

  it('accepts numeric boundaries', () => {
    const draft = draftFor(9)
    expect(applyConfigurationCommand(draft, { type: 'set-rounds', value: 1 })).toMatchObject({
      ok: true,
      value: { rounds: 1 },
    })
    expect(applyConfigurationCommand(draft, { type: 'set-rounds', value: 10 })).toMatchObject({
      ok: true,
      value: { rounds: 10 },
    })
    expect(applyConfigurationCommand(draft, { type: 'set-impostors', value: 3 })).toMatchObject({
      ok: true,
      value: { impostorCount: 3 },
    })
  })

  it.each([
    { type: 'set-rounds', value: 0 } as const,
    { type: 'set-rounds', value: 11 } as const,
    { type: 'set-rounds', value: 1.5 } as const,
    { type: 'set-impostors', value: 0 } as const,
    { type: 'set-impostors', value: 3 } as const,
  ])('rejects invalid numbers without mutating the draft', (command) => {
    const draft = draftFor(6)
    const before = structuredClone(draft)
    expect(applyConfigurationCommand(draft, command).ok).toBe(false)
    expect(draft).toEqual(before)
  })

  it.each([30, 60, 90, 120, 600])('accepts a %i second timer', (seconds) => {
    expect(
      applyConfigurationCommand(draftFor(), {
        type: 'set-conversation',
        value: { mode: 'timer', seconds },
      }),
    ).toMatchObject({
      ok: true,
      value: { conversation: { mode: 'timer', seconds } },
    })
  })

  it.each([0, 29, 31, 601, 60.5])('rejects an invalid %i second timer', (seconds) => {
    const draft = draftFor()
    expect(
      applyConfigurationCommand(draft, {
        type: 'set-conversation',
        value: { mode: 'timer', seconds },
      }),
    ).toEqual({ ok: false, issues: ['timer-out-of-range'] })
    expect(draft.conversation).toEqual({ mode: 'free' })
  })

  it('applies order, voting and final attempt', () => {
    let draft = draftFor()
    for (const command of [
      { type: 'set-turn-order', value: 'random' },
      { type: 'set-voting', value: 'secret' },
      { type: 'set-final-attempt', value: true },
    ] as const) {
      const result = applyConfigurationCommand(draft, command)
      expect(result.ok).toBe(true)
      if (result.ok) draft = result.value
    }
    expect(draft).toMatchObject({ turnOrder: 'random', voting: 'secret', finalAttempt: true })
  })

  it('rejects multi rules for one impostor', () => {
    const draft = draftFor()
    expect(applyConfigurationCommand(draft, { type: 'set-allocation', value: 'balanced' })).toEqual(
      { ok: false, issues: ['multi-impostor-required'] },
    )
    expect(applyConfigurationCommand(draft, { type: 'set-awareness', value: 'known' })).toEqual({
      ok: false,
      issues: ['multi-impostor-required'],
    })
    expect(
      applyConfigurationCommand(draft, { type: 'set-elimination', value: 'successive' }),
    ).toEqual({ ok: false, issues: ['multi-impostor-required'] })
  })

  it('supports multi rules and normalizes when returning to one', () => {
    let draft = draftFor(9)
    for (const command of [
      { type: 'set-impostors', value: 3 },
      { type: 'set-allocation', value: 'balanced' },
      { type: 'set-awareness', value: 'known' },
      { type: 'set-elimination', value: 'successive' },
    ] as const) {
      const result = applyConfigurationCommand(draft, command)
      expect(result.ok).toBe(true)
      if (result.ok) draft = result.value
    }
    expect(applyConfigurationCommand(draft, { type: 'set-impostors', value: 1 })).toMatchObject({
      ok: true,
      value: {
        impostorCount: 1,
        allocation: 'random',
        impostorAwareness: 'unknown',
        elimination: 'single',
      },
    })
    expect(validateConfiguration({ ...draftFor(), impostorAwareness: 'known' })).toContain(
      'multi-impostor-required',
    )
  })

  it('confirms and recognizes a versioned defensive snapshot', () => {
    const draft = draftFor()
    const result = confirmConfiguration(
      draft,
      () => 'game-1',
      () => '2026-08-07T12:00:00Z',
    )
    expect(result).toMatchObject({
      ok: true,
      value: {
        schemaVersion: 1,
        id: 'game-1',
        createdAt: '2026-08-07T12:00:00Z',
        rules: { rounds: 3 },
      },
    })
    if (result.ok) {
      expect(result.value.roster).not.toBe(draft.roster)
      expect(result.value.rules.conversation).not.toBe(draft.conversation)
      expect(isPreparedGame(result.value)).toBe(true)
      expect(isPreparedGame({ ...result.value, schemaVersion: 2 })).toBe(false)
      expect(isPreparedGame({ ...result.value, rules: { ...result.value.rules, rounds: 0 } })).toBe(
        false,
      )
    }
  })

  it('does not call confirmation dependencies for invalid drafts', () => {
    let calls = 0
    const result = confirmConfiguration(
      { ...draftFor(), rounds: 0 },
      () => {
        calls += 1
        return 'id'
      },
      () => {
        calls += 1
        return 'now'
      },
    )
    expect(result).toEqual({ ok: false, issues: ['rounds-out-of-range'] })
    expect(calls).toBe(0)
  })
})
