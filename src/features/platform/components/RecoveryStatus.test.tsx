import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { recoverySnapshot } from '../../../../tests/fixtures/platform'
import { RecoveryStatus } from './RecoveryStatus'

const noop = () => Promise.resolve()

describe('RecoveryStatus', () => {
  it('publishes restored snapshot metadata without its private payload', () => {
    render(
      <RecoveryStatus
        state={{ status: 'ready', snapshot: recoverySnapshot({ revision: 7, phase: 'clues' }) }}
        onRetry={noop}
        onClearData={noop}
      />,
    )
    expect(screen.getByTestId('recovery-status')).toHaveAttribute('data-state', 'restored')
    expect(screen.getByTestId('recovery-snapshot')).toHaveAttribute('data-revision', '7')
    expect(screen.getByTestId('recovery-snapshot')).toHaveAttribute('data-phase', 'clues')
  })

  it('does not offer deletion in observer mode', () => {
    render(
      <RecoveryStatus
        state={{ status: 'observer', snapshot: recoverySnapshot() }}
        onRetry={noop}
        onClearData={noop}
      />,
    )
    expect(screen.getByText('Modo de consulta')).toBeInTheDocument()
    expect(screen.queryByTestId('recovery-delete')).not.toBeInTheDocument()
  })

  it('explains that incompatible data remains preserved', () => {
    render(
      <RecoveryStatus
        state={{ status: 'safe-read-only', error: { code: 'incompatible-data', retryable: false } }}
        onRetry={noop}
        onClearData={noop}
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Modo seguro de solo lectura')
    expect(screen.getByRole('alert')).toHaveTextContent('Los datos se conservarán sin cambios.')
  })

  it('requires explicit dialog confirmation before clearing data', async () => {
    const user = userEvent.setup()
    const onClearData = vi.fn().mockResolvedValue(undefined)
    render(
      <RecoveryStatus
        state={{ status: 'ready', snapshot: recoverySnapshot() }}
        onRetry={noop}
        onClearData={onClearData}
      />,
    )
    await user.click(screen.getByTestId('recovery-delete'))
    expect(screen.getByTestId('recovery-delete-confirm')).toBeDisabled()
    await user.click(screen.getByTestId('recovery-delete-confirmation'))
    await user.click(screen.getByTestId('recovery-delete-confirm'))
    expect(onClearData).toHaveBeenCalledWith({ confirmed: true })
  })
})
