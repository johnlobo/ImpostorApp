import { useEffect, useMemo, useState } from 'react'
import type { PreparedGame } from '../../../domain/entities/gameConfiguration'
import type { CategorySelection, ContentCategory } from '../../../domain/entities/contentCatalog'
import type {
  ConceptDrawRepository,
  ContentPreferencesRepository,
  CustomCategoriesRepository,
  PreparedContentSelectionRepository,
} from '../../../domain/ports/contentCatalog'
import {
  createContentCatalogService,
  type ContentCatalogState,
  type CustomCategoryInput,
} from '../services/contentCatalogService'

export interface ContentCatalogHookDependencies {
  game: PreparedGame
  builtInCategories: readonly ContentCategory[]
  customCategoriesRepository: CustomCategoriesRepository
  preferencesRepository: ContentPreferencesRepository
  selectionRepository: PreparedContentSelectionRepository
  drawRepository: ConceptDrawRepository
  createId?: () => string
  nowIso?: () => string
  random?: () => number
  readOnly?: boolean
}

export function useContentCatalog(dependencies: ContentCatalogHookDependencies) {
  const service = useMemo(
    () =>
      createContentCatalogService({
        ...dependencies,
        createId: dependencies.createId ?? (() => crypto.randomUUID()),
        nowIso: dependencies.nowIso ?? (() => new Date().toISOString()),
        random: dependencies.random ?? Math.random,
      }),
    [dependencies],
  )
  const [state, setState] = useState<ContentCatalogState>(service.getState())

  useEffect(() => {
    const unsubscribe = service.subscribe(setState)
    void service.initialize()
    return unsubscribe
  }, [service])

  return {
    state,
    setSelection: (selection: CategorySelection) => service.setSelection(selection),
    requestAdultContent: (enabled: boolean) => service.requestAdultContent(enabled),
    confirmAdultContent: () => service.confirmAdultContent(),
    cancelAdultContent: () => service.cancelAdultContent(),
    review: () => service.review(),
    edit: () => service.edit(),
    confirm: () => service.confirm(),
    saveCustomCategory: (input: CustomCategoryInput) => service.saveCustomCategory(input),
    deleteCustomCategory: (id: string) => service.deleteCustomCategory(id),
    draw: () => service.draw(),
    resetHistory: () => service.resetHistory({ confirmed: true }),
    retry: () => service.retry(),
    clearFeedback: () => service.clearFeedback(),
  }
}

export type ContentCatalogController = ReturnType<typeof useContentCatalog>
