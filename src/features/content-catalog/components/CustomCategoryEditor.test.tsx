/* eslint-disable @typescript-eslint/require-await */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { CustomCategoryEditor } from './CustomCategoryEditor'

describe('CustomCategoryEditor', () => {
  it('keeps its draft after save so service errors can be corrected', async () => {
    const onSave = vi.fn(async () => undefined)
    render(<CustomCategoryEditor categories={[]} onSave={onSave} onDelete={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: ' Mi grupo ' } })
    fireEvent.change(screen.getByLabelText('Conceptos, uno por línea'), {
      target: { value: 'Uno\nDos' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Crear categoría' }))
    expect(onSave).toHaveBeenCalledWith({
      id: undefined,
      name: ' Mi grupo ',
      adult: false,
      concepts: [
        { id: undefined, text: 'Uno' },
        { id: undefined, text: 'Dos' },
      ],
    })
    expect(screen.getByLabelText('Nombre')).toHaveValue(' Mi grupo ')
  })
})
