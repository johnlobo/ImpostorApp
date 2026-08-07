import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PlayerGroupsState } from '../services/playerGroupsService'
import { PlayerGroupsScreen } from './PlayerGroupsScreen'

const group = {
  id: 'friends',
  schemaVersion: 1 as const,
  name: 'Amigos',
  players: [
    { name: 'Ana', position: 0 },
    { name: 'Bruno', position: 1 },
    { name: 'Carla', position: 2 },
  ],
  createdAt: '2026-08-07T00:00:00.000Z',
  updatedAt: '2026-08-07T00:00:00.000Z',
}

const ready: PlayerGroupsState = {
  status: 'ready',
  draft: { players: [], dirty: false, sourceGroupId: null },
  groups: [],
  issues: [],
  storageError: null,
  prepared: null,
}

function callbacks() {
  return {
    onAdd: vi.fn(),
    onRename: vi.fn(),
    onRemove: vi.fn(),
    onMove: vi.fn(),
    onSaveGroup: vi.fn(),
    onLoadGroup: vi.fn(),
    onDeleteGroup: vi.fn(),
    onPrepare: vi.fn(),
    onRetry: vi.fn(),
  }
}

describe('PlayerGroupsScreen', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('adds a player from the named form', async () => {
    const props = callbacks()
    render(<PlayerGroupsScreen state={ready} {...props} />)
    await userEvent.type(screen.getByLabelText('Nombre del jugador'), 'Ana')
    await userEvent.click(screen.getByRole('button', { name: 'Añadir' }))
    expect(props.onAdd).toHaveBeenCalledWith('Ana')
  })

  it('shows validation and storage errors without entered data', () => {
    const props = callbacks()
    render(
      <PlayerGroupsScreen
        state={{
          ...ready,
          issues: ['duplicate-name'],
          storageError: { code: 'storage-full', retryable: true },
        }}
        {...props}
      />,
    )
    expect(screen.getByText('Cada jugador debe tener un nombre diferente.')).toBeVisible()
    expect(
      screen.getByText('No hay espacio suficiente para guardar de forma segura.'),
    ).toBeVisible()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeVisible()
  })

  it('requires confirmation before replacing a dirty draft', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const props = callbacks()
    render(
      <PlayerGroupsScreen
        state={{
          ...ready,
          draft: {
            players: [{ id: 'active', name: 'Actual', position: 0 }],
            dirty: true,
            sourceGroupId: null,
          },
          groups: [group],
        }}
        {...props}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cargar' }))
    expect(confirm).toHaveBeenCalled()
    expect(props.onLoadGroup).not.toHaveBeenCalled()
  })

  it('restores the loaded group name for direct updates', async () => {
    const props = callbacks()
    render(
      <PlayerGroupsScreen
        state={{
          ...ready,
          draft: { players: [], dirty: false, sourceGroupId: null },
          groups: [group],
        }}
        {...props}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Cargar' }))
    expect(screen.getByLabelText('Nombre del grupo')).toHaveValue('Amigos')
  })

  it('limits names by Unicode code points', async () => {
    const props = callbacks()
    render(<PlayerGroupsScreen state={ready} {...props} />)
    const input = screen.getByLabelText('Nombre del jugador')
    const face = String.fromCodePoint(0x1f600)
    await userEvent.type(input, face.repeat(32))
    expect(input).toHaveValue(face.repeat(30))
  })

  it('offers accessible reordering and deletion controls', () => {
    const props = callbacks()
    render(
      <PlayerGroupsScreen
        state={{
          ...ready,
          draft: {
            players: [
              { id: 'ana', name: 'Ana', position: 0 },
              { id: 'bruno', name: 'Bruno', position: 1 },
              { id: 'carla', name: 'Carla', position: 2 },
            ],
            dirty: true,
            sourceGroupId: null,
          },
        }}
        {...props}
      />,
    )
    expect(screen.getByRole('button', { name: 'Subir a Ana' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Bajar a Carla' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Eliminar a Bruno' })).toBeEnabled()
  })
})
