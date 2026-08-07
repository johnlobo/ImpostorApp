/* eslint-disable @typescript-eslint/require-await, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method */
import { describe, expect, it, vi } from 'vitest'
import type { ContentCategory } from '../../../domain/entities/contentCatalog'
import type {
  ConceptDrawRepository,
  ContentPreferencesRepository,
  CustomCategoriesRepository,
  PreparedContentSelectionRepository,
} from '../../../domain/ports/contentCatalog'
import type { PreparedGame } from '../../../domain/entities/gameConfiguration'
import { createContentCatalogService } from './contentCatalogService'

const game: PreparedGame = {
  schemaVersion: 1,
  id: 'game-1',
  createdAt: '2026-08-07T00:00:00Z',
  roster: {
    players: [1, 2, 3].map((number, position) => ({
      id: `p${number}`,
      name: `J${number}`,
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
}
const category: ContentCategory = {
  id: 'cat-1',
  schemaVersion: 1,
  source: 'built-in',
  name: 'General',
  adult: false,
  concepts: Array.from({ length: 10 }, (_, index) => ({
    id: `c-${index}`,
    text: `Concepto ${index}`,
  })),
  createdAt: null,
  updatedAt: null,
}

function setup(readOnly = false) {
  const customCategoriesRepository: CustomCategoriesRepository = {
    list: vi.fn(async () => ({ ok: true as const, value: [] })),
    save: vi.fn(async (value) => ({ ok: true as const, value })),
    delete: vi.fn(async () => ({ ok: true as const, value: undefined })),
  }
  const preferencesRepository: ContentPreferencesRepository = {
    loadAdultEnabled: vi.fn(async () => ({ ok: true as const, value: false })),
    saveAdultEnabled: vi.fn(async () => ({ ok: true as const, value: undefined })),
  }
  const selectionRepository: PreparedContentSelectionRepository = {
    load: vi.fn(async () => ({ ok: true as const, value: null })),
    save: vi.fn(async (content, revision) => ({
      ok: true as const,
      value: { content, revision: revision + 1 },
    })),
  }
  const drawRepository: ConceptDrawRepository = {
    drawAndMarkUsed: vi.fn(async (request) => ({
      ok: true as const,
      value: { gameId: request.gameId, categoryId: 'cat-1', conceptId: 'c-1', text: 'Concepto 1' },
    })),
    reset: vi.fn(async () => ({ ok: true as const, value: undefined })),
  }
  const service = createContentCatalogService({
    game,
    builtInCategories: [category],
    customCategoriesRepository,
    preferencesRepository,
    selectionRepository,
    drawRepository,
    createId: (() => {
      let id = 0
      return () => `new-${++id}`
    })(),
    nowIso: () => '2026-08-07T01:00:00Z',
    random: () => 0,
    readOnly,
  })
  return {
    service,
    customCategoriesRepository,
    preferencesRepository,
    selectionRepository,
    drawRepository,
  }
}

describe('content catalog service', () => {
  it('loads, reviews and confirms a selection', async () => {
    const { service, selectionRepository } = setup()
    await service.initialize()
    service.review()
    expect(service.getState().status).toBe('reviewing')
    await service.confirm()
    expect(service.getState()).toMatchObject({ status: 'confirmed', revision: 1 })
    expect(selectionRepository.save).toHaveBeenCalledOnce()
  })

  it('preserves the configured snapshot revision before content confirmation', async () => {
    const { service, selectionRepository } = setup()
    vi.mocked(selectionRepository.load).mockResolvedValue({
      ok: true as const,
      value: { content: null, revision: 7 },
    })
    await service.initialize()
    expect(service.getState()).toMatchObject({ status: 'ready', prepared: null, revision: 7 })
    service.review()
    await service.confirm()
    expect(selectionRepository.save).toHaveBeenCalledWith(expect.any(Object), 7)
  })

  it('requires confirmation before enabling adult content', async () => {
    const { service, preferencesRepository } = setup()
    await service.initialize()
    await service.requestAdultContent(true)
    expect(service.getState().adultConfirmationPending).toBe(true)
    expect(preferencesRepository.saveAdultEnabled).not.toHaveBeenCalled()
    await service.confirmAdultContent()
    expect(preferencesRepository.saveAdultEnabled).toHaveBeenCalledWith(true)
    expect(service.getState().draft.adultContentEnabled).toBe(true)
  })

  it('preserves feedback and input when custom validation fails, then performs CRUD', async () => {
    const { service, customCategoriesRepository } = setup()
    await service.initialize()
    await service.saveCustomCategory({ name: '', adult: false, concepts: [{ text: 'Uno' }] })
    expect(service.getState().issues).toEqual(['invalid-category'])
    expect(customCategoriesRepository.save).not.toHaveBeenCalled()
    await service.saveCustomCategory({ name: 'Propia', adult: false, concepts: [{ text: 'Uno' }] })
    expect(service.getState().customCategories).toHaveLength(1)
    await service.deleteCustomCategory(service.getState().customCategories[0]!.id)
    expect(service.getState().customCategories).toHaveLength(0)
  })

  it('serializes draws and reset operations', async () => {
    const { service, drawRepository } = setup()
    await service.initialize()
    service.review()
    await service.confirm()
    const [first, second] = await Promise.all([service.draw(), service.draw()])
    expect(first?.conceptId).toBe('c-1')
    expect(second?.conceptId).toBe('c-1')
    expect(drawRepository.drawAndMarkUsed).toHaveBeenCalledTimes(2)
    await service.resetHistory({ confirmed: true })
    expect(drawRepository.reset).toHaveBeenCalledWith('game-1', { confirmed: true })
  })

  it('blocks durable operations in observer mode', async () => {
    const { service, customCategoriesRepository } = setup(true)
    await service.initialize()
    await service.saveCustomCategory({ name: 'Propia', adult: false, concepts: [{ text: 'Uno' }] })
    expect(service.getState().storageError?.code).toBe('writer-unavailable')
    expect(customCategoriesRepository.save).not.toHaveBeenCalled()
  })
})
