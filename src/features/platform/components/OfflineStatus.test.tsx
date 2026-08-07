import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { OfflineLifecycleState } from '../../../domain/entities/platform'
import { translate } from '../../../i18n/translate'
import { OfflineStatus } from './OfflineStatus'

function renderStatus(
  state: OfflineLifecycleState,
  onRetryPreparation = vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
) {
  render(<OfflineStatus state={state} onRetryPreparation={onRetryPreparation} />)

  return { onRetryPreparation }
}

describe('OfflineStatus', () => {
  it('announces when the installed version is ready for offline use', () => {
    renderStatus({ status: 'offline-ready' })

    expect(screen.getByRole('status')).toHaveTextContent(translate('platform.offlineReady'))
    expect(
      screen.queryByRole('button', { name: translate('platform.retry') }),
    ).not.toBeInTheDocument()
  })

  it('explains an interrupted first load and lets the user retry preparation', async () => {
    const user = userEvent.setup()
    const { onRetryPreparation } = renderStatus({
      status: 'degraded',
      error: { code: 'first-load-required', retryable: true },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(translate('platform.firstLoadRequired'))

    await user.click(screen.getByRole('button', { name: translate('platform.retry') }))

    expect(onRetryPreparation).toHaveBeenCalledOnce()
  })

  it('reports a full storage failure and offers its retry action', async () => {
    const user = userEvent.setup()
    const { onRetryPreparation } = renderStatus({
      status: 'degraded',
      error: { code: 'storage-full', retryable: true },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(translate('platform.storageFull'))

    await user.click(screen.getByRole('button', { name: translate('platform.retry') }))

    expect(onRetryPreparation).toHaveBeenCalledOnce()
  })

  it('reports unavailable storage without presenting an unsafe retry action', () => {
    renderStatus({
      status: 'fatal-safe',
      error: { code: 'storage-unavailable', retryable: false },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(translate('platform.storageUnavailable'))
    expect(
      screen.queryByRole('button', { name: translate('platform.retry') }),
    ).not.toBeInTheDocument()
  })
})
