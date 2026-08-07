/* eslint-disable @typescript-eslint/require-await */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ContentCatalogController } from '../hooks/useContentCatalog'
import { ContentCatalogScreen } from './ContentCatalogScreen'

function controller(overrides: Record<string, unknown> = {}): ContentCatalogController {
  const base = {
    state: {
      status: 'ready',
      draft: {
        game: { rules: { rounds: 3 } },
        selection: { mode: 'all' },
        adultContentEnabled: false,
      },
      categories: [
        {
          id: 'cat-1',
          name: 'General',
          adult: false,
          concepts: Array(10).fill({}),
          source: 'built-in',
          schemaVersion: 1,
          createdAt: null,
          updatedAt: null,
        },
      ],
      customCategories: [],
      issues: [],
      storageError: null,
      prepared: null,
      drawn: null,
      revision: 0,
      adultConfirmationPending: false,
      readOnly: false,
    },
    setSelection: vi.fn(),
    requestAdultContent: vi.fn(async () => undefined),
    confirmAdultContent: vi.fn(async () => undefined),
    cancelAdultContent: vi.fn(),
    review: vi.fn(),
    edit: vi.fn(),
    confirm: vi.fn(async () => undefined),
    saveCustomCategory: vi.fn(async () => undefined),
    deleteCustomCategory: vi.fn(async () => undefined),
    draw: vi.fn(async () => null),
    resetHistory: vi.fn(async () => undefined),
    retry: vi.fn(async () => undefined),
    clearFeedback: vi.fn(),
  }
  return { ...base, ...overrides } as unknown as ContentCatalogController
}

describe('ContentCatalogScreen', () => {
  it('changes selection and requests review', () => {
    const model = controller()
    render(<ContentCatalogScreen controller={model} />)
    fireEvent.click(screen.getByLabelText('Aleatoria por ronda'))
    fireEvent.click(screen.getByRole('button', { name: 'Revisar selección' }))
    expect(model.setSelection).toHaveBeenCalledWith({ mode: 'random-category' })
    expect(model.review).toHaveBeenCalledOnce()
  })

  it('shows explicit adult confirmation', () => {
    const model = controller({ state: { ...controller().state, adultConfirmationPending: true } })
    render(<ContentCatalogScreen controller={model} />)
    expect(screen.getByRole('dialog', { name: 'Activar contenido adulto' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }))
    expect(model.confirmAdultContent).toHaveBeenCalledOnce()
  })

  it('disables mutations for observers', () => {
    const model = controller({ state: { ...controller().state, readOnly: true } })
    render(<ContentCatalogScreen controller={model} />)
    expect(screen.getByRole('status')).toHaveTextContent('Otra ventana')
    expect(screen.getByRole('button', { name: 'Revisar selección' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Crear categoría' })).toBeDisabled()
  })
})
