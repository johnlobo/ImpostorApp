import { translate } from '../../../i18n/translate'
import type { UpdateCoordinatorState } from '../services/updateCoordinator'

interface UpdatePromptProps {
  state: UpdateCoordinatorState
  onPostpone?: () => void
  onApply?: () => Promise<boolean>
}

export function UpdatePrompt({ state, onPostpone, onApply }: UpdatePromptProps) {
  if (state.status === 'idle') return null

  if (state.status === 'applying') {
    return (
      <section data-testid="update-prompt" data-state={state.status} role="status">
        <p>{translate('platform.updateApplying')}</p>
      </section>
    )
  }

  if (state.status === 'failed') {
    return (
      <section data-testid="update-prompt" data-state={state.status} role="alert">
        <p>{translate('platform.updateFailed')}</p>
        {state.error.retryable && onApply && (
          <button type="button" onClick={() => void onApply()}>
            {translate('platform.retryUpdate')}
          </button>
        )}
      </section>
    )
  }

  return (
    <section data-testid="update-prompt" data-state={state.status} role="status">
      <p>{translate('platform.updateAvailable')}</p>
      {state.canApply && onApply && (
        <button type="button" onClick={() => void onApply()}>
          {translate('platform.applyUpdate')}
        </button>
      )}
      {onPostpone && (
        <button type="button" onClick={onPostpone}>
          {translate('platform.postponeUpdate')}
        </button>
      )}
    </section>
  )
}
