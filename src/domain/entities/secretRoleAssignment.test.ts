import { describe, expect, it } from 'vitest'

import {
  confirmContentSelection,
  type DrawnConcept,
  type PreparedContentSelection,
} from './contentCatalog'
import { confirmConfiguration, createConfigurationDraft } from './gameConfiguration'
import type { PreparedRoster } from './playerGroup'
import {
  assignRoles,
  completeRevealState,
  confirmHandoff,
  derivePublicProgress,
  resolvePrivateRoleView,
  type ImpostorAllocationHistory,
  type SecretRoundSnapshot,
} from './secretRoleAssignment'

const roster: PreparedRoster = {
  players: ['Ana', 'Beto', 'Cora', 'Dani', 'Eva', 'Fede'].map((name, position) => ({
    id: `p${position + 1}`,
    name,
    position,
  })),
}

function content(): PreparedContentSelection {
  const draft = createConfigurationDraft(roster)
  if (!draft.ok) throw new Error('invalid fixture')
  const game = confirmConfiguration(
    { ...draft.value, impostorCount: 2, allocation: 'balanced', impostorAwareness: 'known' },
    () => 'game-1',
    () => '2026-08-08T00:00:00.000Z',
  )
  if (!game.ok) throw new Error('invalid fixture')
  const prepared = confirmContentSelection(
    game.value,
    { mode: 'all' },
    [
      {
        id: 'places',
        schemaVersion: 1,
        source: 'custom',
        name: 'Lugares',
        adult: false,
        concepts: ['Playa', 'Bosque', 'Museo'].map((text, index) => ({
          id: `c${index + 1}`,
          text,
        })),
        createdAt: '2026-08-08T00:00:00.000Z',
        updatedAt: '2026-08-08T00:00:00.000Z',
      },
    ],
    false,
    () => '2026-08-08T00:01:00.000Z',
  )
  if (!prepared.ok) throw new Error('invalid fixture')
  return prepared.value
}

function snapshot(overrides: Partial<SecretRoundSnapshot> = {}): SecretRoundSnapshot {
  const prepared = content()
  const concept: DrawnConcept = {
    gameId: prepared.game.id,
    categoryId: 'places',
    conceptId: 'c1',
    text: 'Playa',
  }
  return {
    schemaVersion: 1,
    content: prepared,
    roundNumber: 1,
    assignments: prepared.game.roster.players.map(({ id }, index) => ({
      playerId: id,
      role: index < 2 ? 'impostor' : 'citizen',
    })),
    concept,
    impostorAwareness: 'known',
    reveals: prepared.game.roster.players.map(({ id }) => ({ playerId: id, status: 'pending' })),
    createdAt: '2026-08-08T00:02:00.000Z',
    ...overrides,
  }
}

describe('assignRoles', () => {
  it('samples random impostors without replacement and preserves roster order', () => {
    const values = [0.99, 0]
    const result = assignRoles(roster, 2, 'random', null, () => values.shift()!)
    expect(result).toEqual({
      ok: true,
      value: roster.players.map(({ id }) => ({
        playerId: id,
        role: id === 'p1' || id === 'p6' ? 'impostor' : 'citizen',
      })),
    })
  })

  it('prioritizes the least-used players and resolves balanced ties with the RNG', () => {
    const history: ImpostorAllocationHistory = {
      scopeId: 'game-1',
      schemaVersion: 1,
      impostorCounts: { p1: 3, p2: 0, p3: 0, p4: 2, p5: 1, p6: 1 },
      roundsPlayed: 4,
      updatedAt: '2026-08-08T00:00:00.000Z',
    }
    const values = [0.99, 0]
    const result = assignRoles(roster, 2, 'balanced', history, () => values.shift()!)
    expect(result.ok && result.value.filter(({ role }) => role === 'impostor')).toEqual([
      { playerId: 'p2', role: 'impostor' },
      { playerId: 'p3', role: 'impostor' },
    ])
  })

  it('does not consume RNG when a balanced choice has no tie', () => {
    const history: ImpostorAllocationHistory = {
      scopeId: 'game-1',
      schemaVersion: 1,
      impostorCounts: { p1: 0, p2: 2, p3: 2, p4: 2, p5: 2, p6: 2 },
      roundsPlayed: 2,
      updatedAt: '2026-08-08T00:00:00.000Z',
    }
    const result = assignRoles(roster, 1, 'balanced', history, () => Number.NaN)
    expect(result.ok && result.value.filter(({ role }) => role === 'impostor')).toEqual([
      { playerId: 'p1', role: 'impostor' },
    ])
  })

  it.each([NaN, -0.1, 1, Number.POSITIVE_INFINITY])('rejects invalid RNG value %s', (value) => {
    expect(assignRoles(roster, 1, 'random', null, () => value)).toEqual({
      ok: false,
      issues: ['invalid-random'],
    })
  })

  it('rejects invalid history and invalid allocation inputs', () => {
    const invalidHistory = {
      scopeId: 'game-1',
      schemaVersion: 1,
      impostorCounts: { stranger: 1 },
      roundsPlayed: 1,
      updatedAt: 'now',
    } as ImpostorAllocationHistory
    expect(assignRoles(roster, 2, 'balanced', invalidHistory, () => 0)).toEqual({
      ok: false,
      issues: ['invalid-history'],
    })
    expect(assignRoles(roster, roster.players.length, 'random', null, () => 0)).toEqual({
      ok: false,
      issues: ['invalid-content'],
    })
  })
})

describe('secret round projections and transitions', () => {
  it('derives only public progress in roster order', () => {
    const source = snapshot({
      reveals: roster.players.map(({ id }, index) => ({
        playerId: id,
        status: index === 1 ? 'completed' : 'pending',
      })),
    })
    expect(derivePublicProgress(source)).toEqual({
      total: 6,
      completed: 1,
      players: roster.players.map((player, index) => ({
        ...player,
        status: index === 1 ? 'completed' : 'pending',
      })),
    })
    expect(JSON.stringify(derivePublicProgress(source))).not.toMatch(/Playa|impostor|companions/)
  })

  it('completes one reveal with a defensive copy and rejects repeated or unknown players', () => {
    const source = snapshot()
    const result = completeRevealState(source, 'p3')
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.reveals[2]).toEqual({ playerId: 'p3', status: 'completed' })
    expect(source.reveals[2]).toEqual({ playerId: 'p3', status: 'pending' })
    expect(result.value.content).not.toBe(source.content)
    expect(result.value.content.categories[0]).not.toBe(source.content.categories[0])
    expect(result.value.assignments).not.toBe(source.assignments)
    expect(completeRevealState(result.value, 'p3')).toEqual({
      ok: false,
      issues: ['already-completed'],
    })
    expect(completeRevealState(source, 'missing')).toEqual({
      ok: false,
      issues: ['invalid-player'],
    })
  })

  it('does not resolve a private view until completion', () => {
    expect(resolvePrivateRoleView(snapshot(), 'p3')).toEqual({
      ok: false,
      issues: ['round-not-ready'],
    })
  })

  it('shows citizens the concept and known impostors only their companions', () => {
    const source = snapshot({
      reveals: roster.players.map(({ id }) => ({ playerId: id, status: 'completed' })),
    })
    expect(resolvePrivateRoleView(source, 'p3')).toEqual({
      ok: true,
      value: { kind: 'citizen', category: 'Lugares', concept: 'Playa' },
    })
    expect(resolvePrivateRoleView(source, 'p1')).toEqual({
      ok: true,
      value: { kind: 'impostor', category: 'Lugares', companions: ['Beto'] },
    })
    const unknown = {
      ...source,
      content: {
        ...source.content,
        game: {
          ...source.content.game,
          rules: { ...source.content.game.rules, impostorAwareness: 'unknown' as const },
        },
      },
      impostorAwareness: 'unknown' as const,
    }
    expect(resolvePrivateRoleView(unknown, 'p1')).toEqual({
      ok: true,
      value: { kind: 'impostor', category: 'Lugares', companions: [] },
    })
  })

  it('validates snapshot consistency before exposing private data', () => {
    const source = snapshot({
      reveals: roster.players.map(({ id }) => ({ playerId: id, status: 'completed' })),
    })
    const corrupt = { ...source, concept: { ...source.concept, text: 'Secreto alterado' } }
    expect(resolvePrivateRoleView(corrupt, 'p3')).toEqual({
      ok: false,
      issues: ['invalid-content'],
    })
    expect(completeRevealState(corrupt, 'p3')).toEqual({
      ok: false,
      issues: ['invalid-content'],
    })
    expect(resolvePrivateRoleView({ ...source, impostorAwareness: 'unknown' }, 'p1')).toEqual({
      ok: false,
      issues: ['invalid-content'],
    })
  })

  it('only confirms a complete, valid round with a secret-free handoff', () => {
    const pending = snapshot()
    expect(confirmHandoff(pending)).toBeNull()
    const completed = snapshot({
      reveals: roster.players.map(({ id }) => ({ playerId: id, status: 'completed' })),
    })
    expect(confirmHandoff(completed)).toEqual({
      gameId: 'game-1',
      roundNumber: 1,
      preparedAt: '2026-08-08T00:02:00.000Z',
    })
    expect(JSON.stringify(confirmHandoff(completed))).not.toMatch(/Playa|impostor|Ana|Beto/)
  })
})
