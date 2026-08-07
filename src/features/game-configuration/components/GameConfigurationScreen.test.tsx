import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { GameConfigurationState } from '../services/gameConfigurationService'
import { GameConfigurationScreen } from './GameConfigurationScreen'

const draft = {
  roster: {
    players: [
      { id: 'ana', name: 'Ana', position: 0 },
      { id: 'bruno', name: 'Bruno', position: 1 },
      { id: 'carla', name: 'Carla', position: 2 },
      { id: 'diego', name: 'Diego', position: 3 },
      { id: 'elena', name: 'Elena', position: 4 },
      { id: 'fabio', name: 'Fabio', position: 5 },
    ],
  },
  rounds: 3,
  impostorCount: 1,
  conversation: { mode: 'free' as const },
  turnOrder: 'roster' as const,
  voting: 'verbal' as const,
  finalAttempt: false,
  allocation: 'random' as const,
  impostorAwareness: 'unknown' as const,
  elimination: 'single' as const,
}
const ready: GameConfigurationState = {
  status: 'ready',
  draft,
  issues: [],
  storageError: null,
  confirmed: null,
  revision: 0,
}
const callbacks = () => ({
  onApply: vi.fn(),
  onReview: vi.fn(),
  onEdit: vi.fn(),
  onConfirm: vi.fn(),
  onRetry: vi.fn(),
  onBack: vi.fn(),
})

describe('GameConfigurationScreen', () => {
  it('shows valid defaults and the roster-derived maximum', () => {
    render(<GameConfigurationScreen state={ready} {...callbacks()} />)
    expect(screen.getByRole('spinbutton', { name: 'Rondas' })).toHaveValue(3)
    expect(screen.getByRole('spinbutton', { name: /^Impostores/ })).toHaveValue(1)
    expect(screen.getByText('Máximo para este grupo: 2')).toBeVisible()
    expect(screen.getAllByRole('radio', { name: 'Libre' })[0]).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Verbal' })).toBeChecked()
  })
  it('emits timer, voting and final-attempt commands', async () => {
    const props = callbacks()
    render(<GameConfigurationScreen state={ready} {...props} />)
    await userEvent.click(screen.getByRole('radio', { name: 'Con temporizador' }))
    expect(props.onApply).toHaveBeenCalledWith({
      type: 'set-conversation',
      value: { mode: 'timer', seconds: 90 },
    })
    await userEvent.click(screen.getByRole('radio', { name: 'Secreta' }))
    expect(props.onApply).toHaveBeenCalledWith({ type: 'set-voting', value: 'secret' })
    await userEvent.click(screen.getByRole('checkbox', { name: 'Último intento' }))
    expect(props.onApply).toHaveBeenCalledWith({ type: 'set-final-attempt', value: true })
  })
  it('disables exclusive rules with one impostor', () => {
    render(<GameConfigurationScreen state={ready} {...callbacks()} />)
    expect(screen.getByRole('radio', { name: 'Equilibrado' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Se conocen' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: 'Turnos sucesivos' })).toBeDisabled()
  })
  it('reviews rules and blocks confirmation in observer mode', () => {
    render(
      <GameConfigurationScreen
        state={{
          ...ready,
          status: 'reviewing',
          draft: {
            ...draft,
            conversation: { mode: 'timer', seconds: 120 },
            impostorCount: 2,
            allocation: 'balanced',
          },
        }}
        readOnly
        {...callbacks()}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Revisa la partida' })).toBeVisible()
    expect(screen.getByText('120 segundos')).toBeVisible()
    expect(screen.getByText('Equilibrado')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Confirmar partida' })).toBeDisabled()
  })
  it('offers retry for recoverable storage errors', async () => {
    const props = callbacks()
    render(
      <GameConfigurationScreen
        state={{
          ...ready,
          status: 'error',
          storageError: { code: 'storage-full', retryable: true },
        }}
        {...props}
      />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Reintentar' }))
    expect(props.onRetry).toHaveBeenCalledOnce()
  })
})
