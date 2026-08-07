import type { OfflineLifecycleState, PublicErrorCode } from '../../../domain/entities/platform'
import type { TranslationKey } from '../../../i18n/es'
import { translate } from '../../../i18n/translate'

interface OfflineStatusProps {
  state: OfflineLifecycleState
  online?: boolean
  onRetryPreparation: () => Promise<void>
}

const errorMessages: Partial<Record<PublicErrorCode, TranslationKey>> = {
  'first-load-required': 'platform.firstLoadRequired',
  'storage-full': 'platform.storageFull',
  'storage-unavailable': 'platform.storageUnavailable',
  'incompatible-data': 'platform.incompatibleData',
  'writer-unavailable': 'platform.writerUnavailable',
}

export function OfflineStatus({
  state,
  online = navigator.onLine,
  onRetryPreparation,
}: OfflineStatusProps) {
  const canRetry =
    online &&
    (state.status === 'online-not-ready' || (state.status === 'degraded' && state.error.retryable))
  const isError =
    state.status === 'online-not-ready' ||
    state.status === 'degraded' ||
    state.status === 'fatal-safe'
  const message =
    state.status === 'offline-ready'
      ? translate('platform.offlineReady')
      : state.status === 'online-not-ready'
        ? translate('platform.firstLoadRequired')
        : state.status === 'degraded' || state.status === 'fatal-safe'
          ? translate(errorMessages[state.error.code] ?? 'platform.storageUnavailable')
          : translate('platform.initializing')

  return (
    <section
      data-testid="offline-status"
      data-state={state.status}
      role={isError ? 'alert' : 'status'}
    >
      <p
        data-testid={
          state.status === 'online-not-ready' ||
          (state.status === 'degraded' && state.error.code === 'first-load-required')
            ? 'first-load-required'
            : undefined
        }
      >
        {message}
      </p>
      {(state.status === 'online-not-ready' ||
        (state.status === 'degraded' && state.error.retryable)) && (
        <button
          data-testid="offline-retry"
          type="button"
          disabled={!canRetry}
          onClick={() => void onRetryPreparation()}
        >
          {translate('platform.retry')}
        </button>
      )}
    </section>
  )
}
