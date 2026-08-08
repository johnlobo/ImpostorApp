import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { PublicRoundSession } from '../../../domain/entities/roundSession'
import type { RoundSessionState } from '../services/roundSessionService'
import { RoundSessionScreen } from './RoundSessionScreen'

const publicSession = {
  schemaVersion: 1,
  preparedRound: {
    schemaVersion: 1,
    identity: { gameId: 'game-1', roundNumber: 1 },
    totalRounds: 3,
    roster: {
      players: [
        { id: 'p1', name: 'Ana', position: 0 },
        { id: 'p2', name: 'Bruno', position: 1 },
        { id: 'p3', name: 'Carla', position: 2 },
      ],
    },
    conversation: { mode: 'free' },
    turnOrder: 'roster',
    voting: 'verbal',
    elimination: 'single',
    preparedAt: '2026-08-08T00:00:00.000Z',
  },
  activePhase: {
    schemaVersion: 1,
    identity: { gameId: 'game-1', roundNumber: 1, phaseNumber: 1 },
    participantIds: ['p1', 'p2', 'p3'],
    turnSequence: {
      mode: 'roster',
      playerIds: ['p1', 'p2', 'p3'],
      startingPlayerId: 'p1',
    },
    clock: { status: 'untimed', startedAt: '2026-08-08T00:00:00.000Z' },
    stage: 'discussion',
    currentTurnIndex: null,
    completedCluePlayerIds: ['p1', 'p2', 'p3'],
    state: 'active',
    createdAt: '2026-08-08T00:00:00.000Z',
    updatedAt: '2026-08-08T00:00:00.000Z',
    closure: null,
  },
  closedPhaseHandoffs: [],
} satisfies PublicRoundSession

function props(status: RoundSessionState['status']) {
  return {
    state: {
      status,
      session: publicSession,
      revision: 3,
      remainingSeconds: null,
      error: null,
      readOnly: status === 'observer',
    } satisfies RoundSessionState,
    begin: vi.fn(),
    advance: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn(),
    requestClose: vi.fn(),
    cancelClose: vi.fn(),
    confirmClose: vi.fn(),
    retry: vi.fn(),
  }
}

describe('RoundSessionScreen', () => {
  it('renders public discussion with one primary action and no secrets', () => {
    const controller = props('discussion')
    render(<RoundSessionScreen controller={controller} onClosed={vi.fn()} />)
    expect(screen.getByText('Ronda 1 de 3')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Terminar pistas' })).toBeVisible()
    expect(document.querySelectorAll('.primary-action')).toHaveLength(1)
    expect(document.body).not.toHaveTextContent(/concepto|impostor|compañeros|voto individual/i)
  })

  it('cancels confirmation with Escape', async () => {
    const controller = props('confirmation')
    render(<RoundSessionScreen controller={controller} onClosed={vi.fn()} />)
    expect(screen.getByRole('dialog')).toBeVisible()
    await userEvent.keyboard('{Escape}')
    expect(controller.cancelClose).toHaveBeenCalledOnce()
  })

  it('keeps keyboard focus inside the close confirmation', async () => {
    const controller = props('confirmation')
    render(<RoundSessionScreen controller={controller} onClosed={vi.fn()} />)
    const confirm = screen.getByRole('button', { name: 'Confirmar y continuar' })
    const cancel = screen.getByRole('button', { name: 'Seguir conversando' })
    expect(confirm).toHaveFocus()
    await userEvent.tab()
    expect(cancel).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(confirm).toHaveFocus()
  })

  it('restores focus to the close trigger after cancellation', () => {
    const controller = props('discussion')
    const view = render(<RoundSessionScreen controller={controller} onClosed={vi.fn()} />)
    screen.getByRole('button', { name: 'Terminar pistas' }).focus()
    view.rerender(
      <RoundSessionScreen
        controller={{ ...controller, state: { ...controller.state, status: 'confirmation' } }}
        onClosed={vi.fn()}
      />,
    )
    view.rerender(<RoundSessionScreen controller={controller} onClosed={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Terminar pistas' })).toHaveFocus()
  })

  it('observer exposes no commands', () => {
    render(<RoundSessionScreen controller={props('observer')} onClosed={vi.fn()} />)
    expect(screen.getByText(/otra ventana tiene el control/i)).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('observer sees the actual ready projection without receiving commands', () => {
    const controller = props('observer')
    const readySession: PublicRoundSession = {
      ...publicSession,
      activePhase: {
        ...publicSession.activePhase,
        clock: { status: 'ready', mode: 'untimed' },
        stage: 'clues',
        currentTurnIndex: 0,
        completedCluePlayerIds: [],
        state: 'ready',
      },
    }
    render(
      <RoundSessionScreen
        controller={{ ...controller, state: { ...controller.state, session: readySession } }}
        onClosed={vi.fn()}
      />,
    )
    expect(screen.getByText('Todo preparado')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Empieza Ana' })).toBeVisible()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
