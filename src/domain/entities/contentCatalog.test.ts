import { describe, expect, it, vi } from 'vitest'

import type { PreparedGame } from './gameConfiguration'
import {
  CONTENT_CATALOG_SCHEMA_VERSION,
  applyContentSelectionCommand,
  catalogComparisonKey,
  confirmContentSelection,
  createContentSelectionDraft,
  drawNextConcept,
  isContentCategory,
  isPreparedContentSelection,
  normalizeCatalogText,
  resolveEligibleCategories,
  validateCatalog,
  validateCustomCategory,
  type ContentCategory,
} from './contentCatalog'

function concepts(prefix: string, count = 10) {
  return Array.from({ length: count }, (_, index) => ({
    id: `${prefix}-${index + 1}`,
    text: `${prefix} ${index + 1}`,
  }))
}

function builtIn(id: string, adult = false, count = 10): ContentCategory {
  return {
    id,
    schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
    source: 'built-in',
    name: `Categoria ${id}`,
    adult,
    concepts: concepts(id, count),
    createdAt: null,
    updatedAt: null,
  }
}

function custom(id = 'custom-one', name = 'Mi categoria'): ContentCategory {
  return {
    id,
    schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
    source: 'custom',
    name,
    adult: false,
    concepts: [{ id: `${id}-1`, text: 'Concepto propio' }],
    createdAt: '2026-08-07T10:00:00.000Z',
    updatedAt: '2026-08-07T10:00:00.000Z',
  }
}

function game(rounds = 3, id = 'game-one'): PreparedGame {
  return {
    schemaVersion: 1,
    id,
    roster: {
      players: [
        { id: 'p1', name: 'Ana', position: 0 },
        { id: 'p2', name: 'Brais', position: 1 },
        { id: 'p3', name: 'Carla', position: 2 },
      ],
    },
    rules: {
      rounds,
      impostorCount: 1,
      conversation: { mode: 'free' },
      turnOrder: 'roster',
      voting: 'verbal',
      finalAttempt: false,
      allocation: 'random',
      impostorAwareness: 'unknown',
      elimination: 'single',
    },
    createdAt: '2026-08-07T10:00:00.000Z',
  }
}

describe('content catalog integrity', () => {
  it('normalizes whitespace and compares Spanish names without case folding accents', () => {
    expect(normalizeCatalogText('  Cine   y series ')).toBe('Cine y series')
    expect(catalogComparisonKey('MÚSICA')).toBe(catalogComparisonKey('música'))
    expect(catalogComparisonKey('música')).not.toBe(catalogComparisonKey('musica'))
  })

  it('accepts valid built-in and custom categories', () => {
    expect(isContentCategory(builtIn('animals'))).toBe(true)
    expect(isContentCategory(custom())).toBe(true)
    expect(validateCatalog([builtIn('animals'), custom()])).toEqual([])
  })

  it('requires at least ten concepts for packaged categories', () => {
    const invalid = builtIn('short', false, 9)
    expect(isContentCategory(invalid)).toBe(false)
    expect(validateCatalog([invalid])).toEqual(['insufficient-built-in-concepts'])
  })

  it('rejects duplicate category and globally ambiguous concept IDs', () => {
    const first = builtIn('first')
    const duplicateCategory = { ...builtIn('second'), id: first.id }
    const duplicateConcept = {
      ...builtIn('third'),
      concepts: [
        { ...concepts('third')[0]!, id: first.concepts[0]!.id },
        ...concepts('third').slice(1),
      ],
    }
    expect(validateCatalog([first, duplicateCategory, duplicateConcept])).toEqual([
      'duplicate-category-id',
      'duplicate-concept-id',
    ])
  })

  it('rejects malformed and duplicate normalized custom content', () => {
    const existing = custom('existing', 'Noche de cine')
    const duplicateName = custom('other', 'noche   de CINE')
    expect(validateCustomCategory(duplicateName, [existing])).toContain('invalid-category')

    const duplicateText = {
      ...custom(),
      concepts: [
        { id: 'one', text: 'Una palabra' },
        { id: 'two', text: 'una PALABRA' },
      ],
    }
    expect(validateCustomCategory(duplicateText)).toEqual(['invalid-category'])
  })

  it('allows equal concept text in different categories with distinct IDs', () => {
    const first = {
      ...custom('first', 'Primera'),
      concepts: [{ id: 'first-1', text: 'Compartido' }],
    }
    const second = {
      ...custom('second', 'Segunda'),
      concepts: [{ id: 'second-1', text: 'Compartido' }],
    }
    expect(validateCatalog([first, second])).toEqual([])
    expect(validateCustomCategory(second, [first])).toEqual([])
  })
})

describe('content selection', () => {
  it('creates a defensive default draft and preserves it after invalid commands', () => {
    const source = game()
    const result = createContentSelectionDraft(source)
    expect(result).toMatchObject({
      ok: true,
      value: { selection: { mode: 'all' }, adultContentEnabled: false },
    })
    if (!result.ok) return
    source.roster.players[0]!.name = 'Changed'
    expect(result.value.game.roster.players[0]!.name).toBe('Ana')
    expect(
      applyContentSelectionCommand(result.value, {
        type: 'set-selection',
        selection: { mode: 'selected', categoryIds: [] },
      }),
    ).toEqual({ ok: false, issues: ['invalid-selection'] })
  })

  it('resolves explicit categories in requested order', () => {
    const catalog = [builtIn('one'), builtIn('two')]
    const result = resolveEligibleCategories(
      catalog,
      { mode: 'selected', categoryIds: ['two', 'one'] },
      false,
    )
    expect(result.ok && result.value.map(({ id }) => id)).toEqual(['two', 'one'])
  })

  it.each([{ mode: 'all' as const }, { mode: 'random-category' as const }])(
    'filters adult categories in $mode mode',
    (selection) => {
      const catalog = [builtIn('general'), builtIn('adult', true)]
      const disabled = resolveEligibleCategories(catalog, selection, false)
      const enabled = resolveEligibleCategories(catalog, selection, true)
      expect(disabled.ok && disabled.value.map(({ id }) => id)).toEqual(['general'])
      expect(enabled.ok && enabled.value.map(({ id }) => id)).toEqual(['general', 'adult'])
    },
  )

  it('rejects explicit adult and missing categories', () => {
    const catalog = [builtIn('general'), builtIn('adult', true)]
    expect(
      resolveEligibleCategories(catalog, { mode: 'selected', categoryIds: ['adult'] }, false),
    ).toEqual({ ok: false, issues: ['adult-content-disabled'] })
    expect(
      resolveEligibleCategories(catalog, { mode: 'selected', categoryIds: ['missing'] }, true),
    ).toEqual({ ok: false, issues: ['invalid-selection'] })
  })

  it('requires at least as many concepts as configured rounds', () => {
    const category = custom()
    expect(
      confirmContentSelection(
        game(2),
        { mode: 'selected', categoryIds: [category.id] },
        [category],
        false,
        () => '2026-08-07T11:00:00.000Z',
      ),
    ).toEqual({ ok: false, issues: ['insufficient-concepts'] })
  })

  it('confirms a defensive immutable pool associated with the game ID', () => {
    const category = builtIn('one')
    const sourceGame = game()
    const result = confirmContentSelection(
      sourceGame,
      { mode: 'selected', categoryIds: ['one'] },
      [category],
      false,
      () => '2026-08-07T11:00:00.000Z',
    )
    expect(result.ok).toBe(true)
    if (!result.ok) return
    ;(category.concepts[0] as { text: string }).text = 'Changed'
    sourceGame.roster.players[0]!.name = 'Changed'
    expect(result.value.game.id).toBe('game-one')
    expect(result.value.game.roster.players[0]!.name).toBe('Ana')
    expect(result.value.categories[0]!.concepts[0]!.text).toBe('one 1')
    expect(isPreparedContentSelection(result.value)).toBe(true)
  })
})

describe('deterministic no-repeat draw', () => {
  function prepared(mode: 'all' | 'random-category' = 'all') {
    const result = confirmContentSelection(
      game(),
      { mode },
      [builtIn('one'), builtIn('two')],
      false,
      () => '2026-08-07T11:00:00.000Z',
    )
    if (!result.ok) throw new Error('fixture must be valid')
    return result.value
  }

  it('uses RNG boundaries over the combined pool', () => {
    expect(drawNextConcept(prepared(), [], () => 0)).toMatchObject({
      ok: true,
      value: { categoryId: 'one', conceptId: 'one-1' },
    })
    expect(drawNextConcept(prepared(), [], () => 0.999999)).toMatchObject({
      ok: true,
      value: { categoryId: 'two', conceptId: 'two-10' },
    })
  })

  it('chooses a fresh category and then a concept in random-category mode', () => {
    const random = vi.fn().mockReturnValueOnce(0.75).mockReturnValueOnce(0)
    expect(drawNextConcept(prepared('random-category'), [], random)).toMatchObject({
      ok: true,
      value: { categoryId: 'two', conceptId: 'two-1' },
    })
    expect(random).toHaveBeenCalledTimes(2)
  })

  it('excludes used concepts and categories with no unused concepts', () => {
    const usedOne = concepts('one').map(({ id }) => id)
    expect(drawNextConcept(prepared('random-category'), usedOne, () => 0)).toMatchObject({
      ok: true,
      value: { categoryId: 'two', conceptId: 'two-1', gameId: 'game-one' },
    })
  })

  it('blocks on exhaustion without resetting or repeating', () => {
    const allUsed = [...concepts('one'), ...concepts('two')].map(({ id }) => id)
    expect(drawNextConcept(prepared(), allUsed, () => 0)).toEqual({
      ok: false,
      issues: ['content-exhausted'],
    })
  })

  it.each([-0.01, 1, Number.NaN, Number.POSITIVE_INFINITY])(
    'rejects an invalid random value %s',
    (value) => {
      expect(drawNextConcept(prepared(), [], () => value)).toEqual({
        ok: false,
        issues: ['invalid-random'],
      })
    },
  )

  it('keeps histories isolated because the drawn result carries PreparedGame.id', () => {
    const first = prepared()
    const secondResult = confirmContentSelection(
      game(3, 'game-two'),
      { mode: 'all' },
      first.categories,
      false,
      () => '2026-08-07T11:00:00.000Z',
    )
    if (!secondResult.ok) throw new Error('fixture must be valid')
    expect(drawNextConcept(first, [], () => 0)).toMatchObject({ value: { gameId: 'game-one' } })
    expect(drawNextConcept(secondResult.value, [], () => 0)).toMatchObject({
      value: { gameId: 'game-two' },
    })
  })
})
