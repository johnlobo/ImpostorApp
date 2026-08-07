import { describe, expect, it } from 'vitest'
import {
  applyDraftCommand,
  createEmptyDraft,
  createGroup,
  loadGroup,
  MAX_PLAYERS,
  nameComparisonKey,
  prepareRoster,
} from './playerGroup'

function ids() {
  let value = 0
  return () => `player-${++value}`
}

function addNames(names: readonly string[]) {
  const createId = ids()
  return names.reduce((draft, name) => {
    const result = applyDraftCommand(draft, { type: 'add', name }, createId)
    if (!result.ok) throw new Error(result.issues.join(','))
    return result.value
  }, createEmptyDraft())
}

describe('player draft rules', () => {
  it('normalizes names, preserves order, and prepares a valid roster', () => {
    const draft = addNames(['  Ana  Maria ', 'Bruno', 'Carla'])
    expect(draft.players.map(({ name, position }) => [name, position])).toEqual([
      ['Ana Maria', 0],
      ['Bruno', 1],
      ['Carla', 2],
    ])
    expect(prepareRoster(draft)).toEqual({ ok: true, value: { players: draft.players } })
  })

  it.each(['ana', ' ANA ', 'aNa'])('rejects duplicate name %s without changing state', (name) => {
    const draft = addNames(['Ana'])
    const result = applyDraftCommand(draft, { type: 'add', name }, ids())
    expect(result).toEqual({ ok: false, issues: ['duplicate-name'] })
    expect(draft.players).toHaveLength(1)
  })

  it('keeps accents significant in comparison keys', () => {
    expect(nameComparisonKey('Jose')).not.toBe(nameComparisonKey('José'))
  })

  it('rejects empty and overlong names', () => {
    const draft = createEmptyDraft()
    expect(applyDraftCommand(draft, { type: 'add', name: '   ' }, ids())).toEqual({
      ok: false,
      issues: ['empty-name'],
    })
    expect(applyDraftCommand(draft, { type: 'add', name: 'a'.repeat(31) }, ids())).toEqual({
      ok: false,
      issues: ['name-too-long'],
    })
  })

  it('renames, removes, and reorders immutably', () => {
    const createId = ids()
    const original = addNames(['Ana', 'Bruno', 'Carla'])
    const moved = applyDraftCommand(
      original,
      { type: 'move', playerId: original.players[2]!.id, direction: 'up' },
      createId,
    )
    expect(moved.ok && moved.value.players.map(({ name }) => name)).toEqual([
      'Ana',
      'Carla',
      'Bruno',
    ])
    expect(original.players.map(({ name }) => name)).toEqual(['Ana', 'Bruno', 'Carla'])
  })

  it('enforces the maximum and minimum preparation range', () => {
    const draft = addNames(Array.from({ length: MAX_PLAYERS }, (_, index) => `P${index}`))
    expect(applyDraftCommand(draft, { type: 'add', name: 'Extra' }, ids())).toEqual({
      ok: false,
      issues: ['maximum-players'],
    })
    expect(prepareRoster(addNames(['Ana', 'Bruno']))).toEqual({
      ok: false,
      issues: ['minimum-players'],
    })
  })
})

describe('saved groups', () => {
  it('creates a group and loads fresh player identities in the same order', () => {
    const draft = addNames(['Ana', 'Bruno', 'Carla'])
    const created = createGroup({ id: 'friends', name: ' Amigos ', draft, now: '2026-08-07' })
    expect(created.ok).toBe(true)
    if (!created.ok) return
    let loadedId = 0
    const loaded = loadGroup(created.value, () => `loaded-${++loadedId}`)
    expect(loaded.players.map(({ name }) => name)).toEqual(['Ana', 'Bruno', 'Carla'])
    expect(loaded.players.map(({ id }) => id)).not.toEqual(draft.players.map(({ id }) => id))
    expect(loaded).toMatchObject({ dirty: false, sourceGroupId: 'friends' })
  })

  it('rejects duplicate group names', () => {
    const draft = addNames(['Ana', 'Bruno', 'Carla'])
    const existing = createGroup({ id: 'one', name: 'Amigos', draft, now: '2026-08-07' })
    if (!existing.ok) throw new Error('fixture failed')
    expect(
      createGroup({
        id: 'two',
        name: ' amigos ',
        draft,
        now: '2026-08-07',
        existingGroups: [existing.value],
      }),
    ).toEqual({ ok: false, issues: ['duplicate-group-name'] })
  })
})
