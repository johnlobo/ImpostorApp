import { isPreparedGame, type PreparedGame } from './gameConfiguration'

export const CONTENT_CATALOG_SCHEMA_VERSION = 1
export const MIN_BUILT_IN_CONCEPTS = 10
export const MAX_CATEGORY_NAME_LENGTH = 40
export const MAX_CONCEPT_TEXT_LENGTH = 80
export const MAX_CUSTOM_CONCEPTS = 100

export interface Concept {
  readonly id: string
  readonly text: string
}

export interface ContentCategory {
  readonly id: string
  readonly schemaVersion: typeof CONTENT_CATALOG_SCHEMA_VERSION
  readonly source: 'built-in' | 'custom'
  readonly name: string
  readonly adult: boolean
  readonly concepts: readonly Concept[]
  readonly createdAt: string | null
  readonly updatedAt: string | null
}

export type CategorySelection =
  | { readonly mode: 'selected'; readonly categoryIds: readonly string[] }
  | { readonly mode: 'all' }
  | { readonly mode: 'random-category' }

export interface ContentSelectionDraft {
  readonly game: PreparedGame
  readonly selection: CategorySelection
  readonly adultContentEnabled: boolean
}

export type ContentSelectionCommand =
  | { readonly type: 'set-selection'; readonly selection: CategorySelection }
  | { readonly type: 'set-adult-content'; readonly enabled: boolean }

export interface PreparedContentSelection {
  readonly schemaVersion: typeof CONTENT_CATALOG_SCHEMA_VERSION
  readonly game: PreparedGame
  readonly selection: CategorySelection
  readonly eligibleCategoryIds: readonly string[]
  readonly categories: readonly ContentCategory[]
  readonly adultContentEnabled: boolean
  readonly createdAt: string
}

export interface DrawnConcept {
  readonly gameId: string
  readonly categoryId: string
  readonly conceptId: string
  readonly text: string
}

export type CatalogIssue =
  | 'invalid-game'
  | 'invalid-category'
  | 'duplicate-category-id'
  | 'duplicate-category-name'
  | 'duplicate-concept-id'
  | 'duplicate-concept-text'
  | 'insufficient-built-in-concepts'
  | 'invalid-selection'
  | 'adult-content-disabled'
  | 'insufficient-concepts'
  | 'invalid-random'
  | 'content-exhausted'
  | 'invalid-confirmation'

export type CatalogResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly CatalogIssue[] }

type Clock = () => string

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function visibleLength(value: string): number {
  return Array.from(value).length
}

export function normalizeCatalogText(value: string): string {
  return value.trim().replace(/\s+/gu, ' ')
}

export function catalogComparisonKey(value: string): string {
  return normalizeCatalogText(value).toLocaleLowerCase('es')
}

function validText(value: unknown, maximumLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    normalizeCatalogText(value) === value &&
    visibleLength(value) <= maximumLength
  )
}

function copyCategory(category: ContentCategory): ContentCategory {
  return { ...category, concepts: category.concepts.map((concept) => ({ ...concept })) }
}

function copySelection(selection: CategorySelection): CategorySelection {
  return selection.mode === 'selected'
    ? { mode: 'selected', categoryIds: [...selection.categoryIds] }
    : { mode: selection.mode }
}

function copyGame(game: PreparedGame): PreparedGame {
  return {
    ...game,
    roster: { players: game.roster.players.map((player) => ({ ...player })) },
    rules: {
      ...game.rules,
      conversation:
        game.rules.conversation.mode === 'timer'
          ? { ...game.rules.conversation }
          : { mode: 'free' },
    },
  }
}

export function isContentCategory(value: unknown): value is ContentCategory {
  if (!isRecord(value) || !Array.isArray(value.concepts)) return false
  if (
    value.schemaVersion !== CONTENT_CATALOG_SCHEMA_VERSION ||
    !validText(value.id, 100) ||
    !validText(value.name, MAX_CATEGORY_NAME_LENGTH) ||
    !['built-in', 'custom'].includes(value.source as string) ||
    typeof value.adult !== 'boolean' ||
    !(
      (value.createdAt === null && value.updatedAt === null) ||
      (typeof value.createdAt === 'string' &&
        value.createdAt.length > 0 &&
        typeof value.updatedAt === 'string' &&
        value.updatedAt.length > 0)
    )
  ) {
    return false
  }
  if (value.source === 'built-in') {
    if (value.createdAt !== null || value.updatedAt !== null) return false
    if (value.concepts.length < MIN_BUILT_IN_CONCEPTS) return false
  } else {
    if (typeof value.createdAt !== 'string' || typeof value.updatedAt !== 'string') return false
    if (value.concepts.length < 1 || value.concepts.length > MAX_CUSTOM_CONCEPTS) return false
  }
  const ids = new Set<string>()
  const texts = new Set<string>()
  return value.concepts.every((candidate) => {
    if (!isRecord(candidate)) return false
    const { id, text } = candidate
    if (!validText(id, 100) || !validText(text, MAX_CONCEPT_TEXT_LENGTH)) return false
    const textKey = catalogComparisonKey(text)
    if (ids.has(id) || texts.has(textKey)) return false
    ids.add(id)
    texts.add(textKey)
    return true
  })
}

export function validateCatalog(categories: readonly unknown[]): readonly CatalogIssue[] {
  const issues: CatalogIssue[] = []
  const categoryIds = new Set<string>()
  const conceptIds = new Set<string>()
  for (const category of categories) {
    if (!isContentCategory(category)) {
      issues.push(
        isRecord(category) &&
          category.source === 'built-in' &&
          Array.isArray(category.concepts) &&
          category.concepts.length < MIN_BUILT_IN_CONCEPTS
          ? 'insufficient-built-in-concepts'
          : 'invalid-category',
      )
      continue
    }
    if (categoryIds.has(category.id)) issues.push('duplicate-category-id')
    categoryIds.add(category.id)
    for (const concept of category.concepts) {
      if (conceptIds.has(concept.id)) issues.push('duplicate-concept-id')
      conceptIds.add(concept.id)
    }
  }
  return [...new Set(issues)]
}

export function validateCustomCategory(
  category: ContentCategory,
  existing: readonly ContentCategory[] = [],
): readonly CatalogIssue[] {
  if (!isContentCategory(category) || category.source !== 'custom') return ['invalid-category']
  const issues: CatalogIssue[] = []
  if (existing.some((item) => item.id !== category.id && item.id === category.id)) {
    issues.push('duplicate-category-id')
  }
  const nameKey = catalogComparisonKey(category.name)
  if (
    existing.some(
      (item) =>
        item.source === 'custom' &&
        item.id !== category.id &&
        catalogComparisonKey(item.name) === nameKey,
    )
  ) {
    issues.push('duplicate-category-name')
  }
  const otherConceptIds = new Set(
    existing
      .filter((item) => item.id !== category.id)
      .flatMap((item) => item.concepts.map((concept) => concept.id)),
  )
  if (category.concepts.some((concept) => otherConceptIds.has(concept.id))) {
    issues.push('duplicate-concept-id')
  }
  return issues
}

export function createContentSelectionDraft(
  game: PreparedGame,
): CatalogResult<ContentSelectionDraft> {
  if (!isPreparedGame(game)) return { ok: false, issues: ['invalid-game'] }
  return {
    ok: true,
    value: {
      game: copyGame(game),
      selection: { mode: 'all' },
      adultContentEnabled: false,
    },
  }
}

export function applyContentSelectionCommand(
  draft: ContentSelectionDraft,
  command: ContentSelectionCommand,
): CatalogResult<ContentSelectionDraft> {
  if (command.type === 'set-adult-content') {
    return { ok: true, value: { ...draft, adultContentEnabled: command.enabled } }
  }
  if (
    command.selection.mode === 'selected' &&
    (command.selection.categoryIds.length === 0 ||
      new Set(command.selection.categoryIds).size !== command.selection.categoryIds.length)
  ) {
    return { ok: false, issues: ['invalid-selection'] }
  }
  return {
    ok: true,
    value: { ...draft, selection: copySelection(command.selection) },
  }
}

export function resolveEligibleCategories(
  categories: readonly ContentCategory[],
  selection: CategorySelection,
  adultContentEnabled: boolean,
): CatalogResult<readonly ContentCategory[]> {
  const catalogIssues = validateCatalog(categories)
  if (catalogIssues.length) return { ok: false, issues: catalogIssues }
  const available = categories.filter((category) => adultContentEnabled || !category.adult)
  if (selection.mode !== 'selected') {
    return available.length
      ? { ok: true, value: available.map(copyCategory) }
      : { ok: false, issues: ['invalid-selection'] }
  }
  if (
    selection.categoryIds.length === 0 ||
    new Set(selection.categoryIds).size !== selection.categoryIds.length
  ) {
    return { ok: false, issues: ['invalid-selection'] }
  }
  const byId = new Map(categories.map((category) => [category.id, category]))
  const selected: ContentCategory[] = []
  for (const id of selection.categoryIds) {
    const category = byId.get(id)
    if (!category) return { ok: false, issues: ['invalid-selection'] }
    if (category.adult && !adultContentEnabled) {
      return { ok: false, issues: ['adult-content-disabled'] }
    }
    selected.push(copyCategory(category))
  }
  return { ok: true, value: selected }
}

export function confirmContentSelection(
  game: PreparedGame,
  selection: CategorySelection,
  catalog: readonly ContentCategory[],
  adultContentEnabled: boolean,
  clock: Clock,
): CatalogResult<PreparedContentSelection> {
  if (!isPreparedGame(game)) return { ok: false, issues: ['invalid-game'] }
  const eligible = resolveEligibleCategories(catalog, selection, adultContentEnabled)
  if (!eligible.ok) return eligible
  const conceptCount = eligible.value.reduce(
    (total, category) => total + category.concepts.length,
    0,
  )
  if (conceptCount < game.rules.rounds) return { ok: false, issues: ['insufficient-concepts'] }
  const createdAt = clock()
  if (!createdAt) return { ok: false, issues: ['invalid-confirmation'] }
  const categories = eligible.value.map(copyCategory)
  return {
    ok: true,
    value: {
      schemaVersion: CONTENT_CATALOG_SCHEMA_VERSION,
      game: copyGame(game),
      selection: copySelection(selection),
      eligibleCategoryIds: categories.map((category) => category.id),
      categories,
      adultContentEnabled,
      createdAt,
    },
  }
}

export function isPreparedContentSelection(value: unknown): value is PreparedContentSelection {
  if (
    !isRecord(value) ||
    !Array.isArray(value.categories) ||
    !Array.isArray(value.eligibleCategoryIds)
  ) {
    return false
  }
  if (
    value.schemaVersion !== CONTENT_CATALOG_SCHEMA_VERSION ||
    !isPreparedGame(value.game) ||
    !isRecord(value.selection) ||
    !['selected', 'all', 'random-category'].includes(value.selection.mode as string) ||
    typeof value.adultContentEnabled !== 'boolean' ||
    typeof value.createdAt !== 'string' ||
    !value.createdAt
  )
    return false
  const categories = value.categories as unknown[]
  const eligibleCategoryIds = value.eligibleCategoryIds as unknown[]
  if (!categories.every(isContentCategory)) return false
  const ids = categories.map((category) => category.id)
  return (
    ids.length >= 1 &&
    ids.length === eligibleCategoryIds.length &&
    ids.every((id, index) => eligibleCategoryIds[index] === id) &&
    categories.every((category) => value.adultContentEnabled || !category.adult) &&
    (value.selection.mode !== 'selected' ||
      (Array.isArray(value.selection.categoryIds) &&
        value.selection.categoryIds.length > 0 &&
        value.selection.categoryIds.every((id, index) => id === ids[index]))) &&
    categories.reduce((total, category) => total + category.concepts.length, 0) >=
      value.game.rules.rounds
  )
}

function randomIndex(length: number, random: () => number): CatalogResult<number> {
  const value = random()
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    return { ok: false, issues: ['invalid-random'] }
  }
  return { ok: true, value: Math.floor(value * length) }
}

export function drawNextConcept(
  prepared: PreparedContentSelection,
  usedConceptIds: readonly string[],
  random: () => number,
): CatalogResult<DrawnConcept> {
  if (!isPreparedContentSelection(prepared)) return { ok: false, issues: ['invalid-selection'] }
  const used = new Set(usedConceptIds)
  const availableCategories = prepared.categories
    .map((category) => ({
      category,
      concepts: category.concepts.filter((concept) => !used.has(concept.id)),
    }))
    .filter(({ concepts }) => concepts.length > 0)
  if (!availableCategories.length) return { ok: false, issues: ['content-exhausted'] }

  if (prepared.selection.mode === 'random-category') {
    const categoryIndex = randomIndex(availableCategories.length, random)
    if (!categoryIndex.ok) return categoryIndex
    const selected = availableCategories[categoryIndex.value]!
    const conceptIndex = randomIndex(selected.concepts.length, random)
    if (!conceptIndex.ok) return conceptIndex
    const concept = selected.concepts[conceptIndex.value]!
    return {
      ok: true,
      value: {
        gameId: prepared.game.id,
        categoryId: selected.category.id,
        conceptId: concept.id,
        text: concept.text,
      },
    }
  }

  const candidates = availableCategories.flatMap(({ category, concepts }) =>
    concepts.map((concept) => ({ category, concept })),
  )
  const candidateIndex = randomIndex(candidates.length, random)
  if (!candidateIndex.ok) return candidateIndex
  const selected = candidates[candidateIndex.value]!
  return {
    ok: true,
    value: {
      gameId: prepared.game.id,
      categoryId: selected.category.id,
      conceptId: selected.concept.id,
      text: selected.concept.text,
    },
  }
}
