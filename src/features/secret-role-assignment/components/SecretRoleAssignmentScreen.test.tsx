import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { RoundHandoff } from '../../../domain/entities/secretRoleAssignment'
import type { SecretRoleAssignmentState } from '../services/secretRoleAssignmentService'
import { SecretRoleAssignmentScreen } from './SecretRoleAssignmentScreen'

const shared: SecretRoleAssignmentState = {
  status: 'shared',
  revision: 2,
  selectedPlayerId: null,
  privateCategory: null,
  privateRole: null,
  storageError: null,
  readOnly: false,
  progress: {
    total: 3,
    completed: 1,
    players: [
      { id: 'p1', name: 'Ana', position: 0, status: 'completed' },
      { id: 'p2', name: 'Bruno', position: 1, status: 'pending' },
      { id: 'p3', name: 'Carla', position: 2, status: 'pending' },
    ],
  },
}

function controller(state: SecretRoleAssignmentState) {
  return {
    state,
    selectPlayer: vi.fn(),
    reveal: vi.fn(() => Promise.resolve()),
    conceal: vi.fn(),
    startRound: vi.fn<() => RoundHandoff | null>(() => null),
    resetHistory: vi.fn(() => Promise.resolve()),
    retry: vi.fn(() => Promise.resolve()),
  }
}

describe('SecretRoleAssignmentScreen', () => {
  it('keeps the shared surface free of category, concept and role', async () => {
    const props = controller(shared)
    render(<SecretRoleAssignmentScreen controller={props} onStart={vi.fn()} />)
    expect(screen.getByText('1 de 3')).toBeVisible()
    expect(screen.queryByText('Lugares')).not.toBeInTheDocument()
    expect(screen.queryByText('Lugar 0')).not.toBeInTheDocument()
    expect(screen.queryByText('IMPOSTOR')).not.toBeInTheDocument()
    expect(document.body).not.toHaveTextContent(/Lugares|Lugar 0|IMPOSTOR|compañeros/i)
    expect(screen.getByRole('button', { name: /Ana/ })).toBeDisabled()
    await userEvent.click(screen.getByRole('button', { name: /Bruno/ }))
    expect(props.selectPlayer).toHaveBeenCalledWith('p2')
    expect(screen.getByRole('button', { name: 'Empezar ronda' })).toBeDisabled()
  })

  it('renders only public progress in observer mode and disables every command', () => {
    const props = controller({ ...shared, readOnly: true })
    render(<SecretRoleAssignmentScreen controller={props} onStart={vi.fn()} />)
    expect(screen.getByText(/otra ventana tiene el control/i)).toBeVisible()
    expect(screen.getAllByRole('button')).toHaveLength(4)
    screen.getAllByRole('button').forEach((button) => expect(button).toBeDisabled())
    expect(document.body).not.toHaveTextContent(/Lugares|Lugar 0|IMPOSTOR|compañeros/i)
  })

  it('starts covered and requests durable reveal', async () => {
    const props = controller({
      ...shared,
      status: 'private-covered',
      selectedPlayerId: 'p2',
      privateCategory: 'Lugares',
    })
    render(<SecretRoleAssignmentScreen controller={props} onStart={vi.fn()} />)
    expect(screen.getByText('Solo para Bruno')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Lugares' })).toBeVisible()
    expect(screen.queryByText('Lugar 0')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Pulsa para ver el concepto' }))
    expect(props.reveal).toHaveBeenCalledOnce()
  })

  it('renders a private citizen projection and removes it through conceal', async () => {
    const props = controller({
      ...shared,
      status: 'private-revealed',
      selectedPlayerId: 'p2',
      privateCategory: 'Lugares',
      privateRole: { kind: 'citizen', category: 'Lugares', concept: 'Lugar 0' },
    })
    render(<SecretRoleAssignmentScreen controller={props} onStart={vi.fn()} />)
    expect(screen.getByText('Lugares')).toBeVisible()
    expect(screen.getByText('Lugar 0')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Ocultar y devolver el móvil' }))
    expect(props.conceal).toHaveBeenCalledOnce()
  })

  it.each([
    ['known', ['Bruno'], /Tus compañeros: Bruno/i],
    ['unknown', [], null],
  ] as const)('renders the %s awareness projection privately', (__, companions, expected) => {
    const props = controller({
      ...shared,
      status: 'private-revealed',
      selectedPlayerId: 'p1',
      privateCategory: 'Lugares',
      privateRole: { kind: 'impostor', category: 'Lugares', companions },
    })
    render(<SecretRoleAssignmentScreen controller={props} onStart={vi.fn()} />)
    expect(screen.getByText('IMPOSTOR')).toBeVisible()
    if (expected) expect(screen.getByText(expected)).toBeVisible()
    else expect(screen.queryByText(/Tus compañeros/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Lugar 0')).not.toBeInTheDocument()
  })

  it('enables start at N/N and emits only the public handoff', async () => {
    const handoff = {
      gameId: 'game-1',
      roundNumber: 1,
      preparedAt: '2026-08-08T00:01:00Z',
    }
    const props = controller({
      ...shared,
      status: 'ready',
      progress: {
        ...shared.progress!,
        completed: 3,
        players: shared.progress!.players.map((player) => ({
          ...player,
          status: 'completed',
        })),
      },
    })
    props.startRound.mockReturnValue(handoff)
    const onStart = vi.fn()
    render(<SecretRoleAssignmentScreen controller={props} onStart={onStart} />)
    const start = screen.getByRole('button', { name: 'Empezar ronda' })
    expect(start).toBeEnabled()
    await userEvent.click(start)
    expect(onStart).toHaveBeenCalledWith(handoff)
    expect(JSON.stringify(onStart.mock.calls)).not.toMatch(/Lugar 0|impostor|Lugares/)
  })

  it('retries a retryable storage error without rendering secret content', async () => {
    const props = controller({
      ...shared,
      status: 'error',
      progress: null,
      storageError: { code: 'storage-full', retryable: true },
    })
    render(<SecretRoleAssignmentScreen controller={props} onStart={vi.fn()} />)
    expect(screen.getByRole('alert')).toBeVisible()
    expect(document.body).not.toHaveTextContent(/Lugares|Lugar 0|IMPOSTOR/i)
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar preparación' }))
    expect(props.retry).toHaveBeenCalledOnce()
  })
})
