import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { translate } from '../../../i18n/translate'
import type { UpdateCoordinatorState } from '../services/updateCoordinator'
import { UpdatePrompt } from './UpdatePrompt'

function renderPrompt(
  state: UpdateCoordinatorState,
  onPostpone = vi.fn(),
  onApply = vi.fn<() => Promise<boolean>>().mockResolvedValue(true),
) {
  render(<UpdatePrompt state={state} onPostpone={onPostpone} onApply={onApply} />)

  return { onPostpone, onApply }
}

describe('UpdatePrompt', () => {
  it('offers postponement without presenting an unsafe apply action during an active game', async () => {
    const user = userEvent.setup()
    const { onPostpone, onApply } = renderPrompt({
      status: 'available',
      version: '2.0.0',
      canApply: false,
      blockedBy: 'active-game',
    })

    expect(screen.getByRole('status')).toHaveTextContent(translate('platform.updateAvailable'))
    expect(
      screen.queryByRole('button', { name: translate('platform.applyUpdate') }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: translate('platform.postponeUpdate') }))

    expect(onPostpone).toHaveBeenCalledOnce()
    expect(onApply).not.toHaveBeenCalled()
  })

  it('offers explicit postpone and apply actions at a safe point', async () => {
    const user = userEvent.setup()
    const { onPostpone, onApply } = renderPrompt({
      status: 'available',
      version: '2.0.0',
      canApply: true,
      blockedBy: null,
    })

    await user.click(screen.getByRole('button', { name: translate('platform.applyUpdate') }))

    expect(onApply).toHaveBeenCalledOnce()
    expect(onPostpone).not.toHaveBeenCalled()
  })

  it('announces activation and disables all update actions while applying', () => {
    renderPrompt({ status: 'applying', version: '2.0.0' })

    expect(screen.getByRole('status')).toHaveTextContent('Aplicando actualización…')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('reports a failed update and lets the user retry safely', async () => {
    const user = userEvent.setup()
    const { onApply } = renderPrompt({
      status: 'failed',
      version: '2.0.0',
      error: { code: 'update-failed', retryable: true },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se pudo aplicar la actualización. La versión actual sigue disponible.',
    )

    await user.click(screen.getByRole('button', { name: 'Reintentar actualización' }))

    expect(onApply).toHaveBeenCalledOnce()
  })

  it('renders nothing when no update is waiting', () => {
    const { container } = render(<UpdatePrompt state={{ status: 'idle' }} />)

    expect(container).toBeEmptyDOMElement()
  })
})
