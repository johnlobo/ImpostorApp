import { describe, expect, it } from 'vitest'

import { ES_ADULT_CATALOG } from './esAdultCatalog'
import { BUILT_IN_CATALOG_SCHEMA_VERSION, ES_GENERAL_CATALOG } from './esCatalog'

describe('Spanish built-in catalog', () => {
  const completeCatalog = [...ES_GENERAL_CATALOG, ...ES_ADULT_CATALOG]

  it('contains fourteen general categories and one separate adult category', () => {
    expect(ES_GENERAL_CATALOG).toHaveLength(14)
    expect(ES_GENERAL_CATALOG.every(({ adult }) => !adult)).toBe(true)
    expect(ES_ADULT_CATALOG).toHaveLength(1)
    expect(ES_ADULT_CATALOG[0]?.adult).toBe(true)
  })

  it('provides at least ten normalized concepts per category', () => {
    for (const category of completeCatalog) {
      expect(category.schemaVersion).toBe(BUILT_IN_CATALOG_SCHEMA_VERSION)
      expect(category.source).toBe('built-in')
      expect(category.name).toBe(category.name.trim().replace(/\s+/gu, ' '))
      expect(category.concepts.length).toBeGreaterThanOrEqual(10)
      for (const concept of category.concepts) {
        expect(concept.text).toBe(concept.text.trim().replace(/\s+/gu, ' '))
      }
    }
  })

  it('uses globally unique opaque stable IDs', () => {
    const categoryIds = completeCatalog.map(({ id }) => id)
    const conceptIds = completeCatalog.flatMap(({ concepts }) => concepts.map(({ id }) => id))
    const allIds = [...categoryIds, ...conceptIds]

    expect(new Set(categoryIds).size).toBe(categoryIds.length)
    expect(new Set(conceptIds).size).toBe(conceptIds.length)
    expect(new Set(allIds).size).toBe(allIds.length)
    expect(allIds.every((id) => /^es-b\d{2}(?:-c\d{2})?$/u.test(id))).toBe(true)
  })

  it('contains no duplicate text inside a category', () => {
    for (const category of completeCatalog) {
      const keys = category.concepts.map(({ text }) => text.toLocaleLowerCase('es'))
      expect(new Set(keys).size).toBe(keys.length)
    }
  })

  it('freezes every level of the packaged data', () => {
    expect(Object.isFrozen(ES_GENERAL_CATALOG)).toBe(true)
    expect(Object.isFrozen(ES_ADULT_CATALOG)).toBe(true)
    for (const category of completeCatalog) {
      expect(Object.isFrozen(category)).toBe(true)
      expect(Object.isFrozen(category.concepts)).toBe(true)
      expect(category.concepts.every(Object.isFrozen)).toBe(true)
    }
  })
})
