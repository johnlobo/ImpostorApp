import type { ConfigurationCommand } from '../../../domain/entities/gameConfiguration'
import type { PublicPlatformError } from '../../../domain/entities/platform'
import { translate } from '../../../i18n/translate'
import type { GameConfigurationState } from '../services/gameConfigurationService'

interface Props {
  state: GameConfigurationState
  readOnly?: boolean
  onApply: (command: ConfigurationCommand) => void
  onReview: () => void
  onEdit: () => void
  onConfirm: () => void
  onRetry: () => void
  onBack: () => void
}

const issueKeys = {
  'invalid-roster': 'configuration.error.roster',
  'rounds-out-of-range': 'configuration.error.rounds',
  'impostors-out-of-range': 'configuration.error.impostors',
  'timer-out-of-range': 'configuration.error.timer',
  'invalid-rule': 'configuration.error.incompatible',
  'multi-impostor-required': 'configuration.error.incompatible',
  'invalid-confirmation': 'configuration.error.incompatible',
} as const

const storageKeys: Record<PublicPlatformError['code'], Parameters<typeof translate>[0]> = {
  'first-load-required': 'platform.firstLoadRequired',
  'storage-unavailable': 'platform.storageUnavailable',
  'storage-full': 'platform.storageFull',
  'incompatible-data': 'platform.incompatibleData',
  'migration-failed': 'recovery.migrationFailed',
  'revision-conflict': 'configuration.error.conflict',
  'writer-unavailable': 'platform.writerUnavailable',
  'content-exhausted': 'configuration.error.storage',
  'update-failed': 'platform.updateFailed',
  'unknown-storage-error': 'configuration.error.storage',
}

function Choice({
  name,
  value,
  checked,
  disabled,
  label,
  onChange,
}: {
  name: string
  value: string
  checked: boolean
  disabled: boolean
  label: string
  onChange: () => void
}) {
  return (
    <label className="choice">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={label}
      />
      <span>{label}</span>
    </label>
  )
}

function Summary({ state }: { state: GameConfigurationState }) {
  const { draft } = state
  return (
    <div className="configuration-summary">
      <section aria-labelledby="configuration-players-summary">
        <h3 id="configuration-players-summary">{translate('configuration.review.players')}</h3>
        <ol>
          {draft.roster.players.map((player) => (
            <li key={player.id}>{player.name}</li>
          ))}
        </ol>
      </section>
      <section aria-labelledby="configuration-rules-summary">
        <h3 id="configuration-rules-summary">{translate('configuration.review.rules')}</h3>
        <dl>
          <div>
            <dt>{translate('configuration.rounds')}</dt>
            <dd>{draft.rounds}</dd>
          </div>
          <div>
            <dt>{translate('configuration.impostors')}</dt>
            <dd>{draft.impostorCount}</dd>
          </div>
          <div>
            <dt>{translate('configuration.conversation')}</dt>
            <dd>
              {draft.conversation.mode === 'free'
                ? translate('configuration.conversation.free')
                : translate('configuration.review.timer', { seconds: draft.conversation.seconds })}
            </dd>
          </div>
          <div>
            <dt>{translate('configuration.turnOrder')}</dt>
            <dd>{translate(`configuration.turnOrder.${draft.turnOrder}`)}</dd>
          </div>
          <div>
            <dt>{translate('configuration.voting')}</dt>
            <dd>{translate(`configuration.voting.${draft.voting}`)}</dd>
          </div>
          <div>
            <dt>{translate('configuration.finalAttempt')}</dt>
            <dd>
              {draft.finalAttempt
                ? translate('configuration.enabled')
                : translate('configuration.disabled')}
            </dd>
          </div>
          <div>
            <dt>{translate('configuration.allocation')}</dt>
            <dd>{translate(`configuration.allocation.${draft.allocation}`)}</dd>
          </div>
          {draft.impostorCount > 1 && (
            <>
              <div>
                <dt>{translate('configuration.awareness')}</dt>
                <dd>{translate(`configuration.awareness.${draft.impostorAwareness}`)}</dd>
              </div>
              <div>
                <dt>{translate('configuration.elimination')}</dt>
                <dd>{translate(`configuration.elimination.${draft.elimination}`)}</dd>
              </div>
            </>
          )}
        </dl>
      </section>
    </div>
  )
}

export function GameConfigurationScreen({
  state,
  readOnly = false,
  onApply,
  onReview,
  onEdit,
  onConfirm,
  onRetry,
  onBack,
}: Props) {
  const busy = state.status === 'loading' || state.status === 'confirming'
  const disabled = busy || readOnly
  const reviewing = ['reviewing', 'confirming', 'confirmed'].includes(state.status)
  const maxImpostors = Math.min(3, Math.floor(state.draft.roster.players.length / 3))
  const choice = (
    name: string,
    value: string,
    checked: boolean,
    label: string,
    command: ConfigurationCommand,
    extraDisabled = false,
  ) => (
    <Choice
      key={`-`}
      name={name}
      value={value}
      checked={checked}
      disabled={disabled || extraDisabled}
      label={label}
      onChange={() => onApply(command)}
    />
  )

  return (
    <section className="game-configuration" aria-labelledby="configuration-title">
      <header className="section-header">
        <div>
          <h2 id="configuration-title">
            {translate(reviewing ? 'configuration.review.title' : 'configuration.title')}
          </h2>
          <p className="muted">
            {translate(reviewing ? 'configuration.review.subtitle' : 'configuration.subtitle')}
          </p>
        </div>
        <span className="step-indicator">
          {translate(reviewing ? 'configuration.step.review' : 'configuration.step.configure')}
        </span>
      </header>

      {state.issues.length > 0 && (
        <div className="status-message error-message" role="alert">
          {state.issues.map((issue) => (
            <p key={issue}>{translate(issueKeys[issue])}</p>
          ))}
        </div>
      )}
      {state.storageError && (
        <div className="status-message error-message" role="alert">
          <p>{translate(storageKeys[state.storageError.code])}</p>
          {state.storageError.retryable && !readOnly && (
            <button type="button" onClick={onRetry} disabled={busy}>
              {translate('configuration.retry')}
            </button>
          )}
        </div>
      )}

      {reviewing ? (
        <>
          <Summary state={state} />
          {state.status === 'confirmed' && (
            <p className="success-message" role="status">
              {translate('configuration.confirmed')}
            </p>
          )}
          <div className="configuration-actions">
            <button type="button" onClick={onEdit} disabled={busy || state.status === 'confirmed'}>
              {translate('configuration.edit')}
            </button>
            <button
              type="button"
              className="primary-action"
              onClick={onConfirm}
              disabled={disabled || state.status === 'confirmed'}
            >
              {translate(
                state.status === 'confirming'
                  ? 'configuration.confirming'
                  : 'configuration.confirm',
              )}
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="configuration-fields">
            <fieldset className="numeric-rules" disabled={disabled}>
              <legend>{translate('configuration.basics')}</legend>
              <label>
                <span>{translate('configuration.rounds')}</span>
                <input
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  value={state.draft.rounds}
                  onChange={(event) =>
                    onApply({ type: 'set-rounds', value: event.currentTarget.valueAsNumber })
                  }
                />
              </label>
              <label>
                <span>{translate('configuration.impostors')}</span>
                <input
                  type="number"
                  min={1}
                  max={maxImpostors}
                  step={1}
                  value={state.draft.impostorCount}
                  onChange={(event) =>
                    onApply({ type: 'set-impostors', value: event.currentTarget.valueAsNumber })
                  }
                />
                <small>
                  {translate('configuration.impostors.maximum', { count: maxImpostors })}
                </small>
              </label>
            </fieldset>

            <fieldset disabled={disabled}>
              <legend>{translate('configuration.conversation')}</legend>
              <div className="segmented-control">
                {choice(
                  'conversation',
                  'free',
                  state.draft.conversation.mode === 'free',
                  translate('configuration.conversation.free'),
                  { type: 'set-conversation', value: { mode: 'free' } },
                )}
                {choice(
                  'conversation',
                  'timer',
                  state.draft.conversation.mode === 'timer',
                  translate('configuration.conversation.timer'),
                  { type: 'set-conversation', value: { mode: 'timer', seconds: 90 } },
                )}
              </div>
              {state.draft.conversation.mode === 'timer' && (
                <div className="timer-control">
                  <div
                    className="preset-actions"
                    aria-label={translate('configuration.timer.presets')}
                  >
                    {[60, 90, 120].map((seconds) => (
                      <button
                        key={seconds}
                        type="button"
                        aria-pressed={
                          state.draft.conversation.mode === 'timer' &&
                          state.draft.conversation.seconds === seconds
                        }
                        onClick={() =>
                          onApply({ type: 'set-conversation', value: { mode: 'timer', seconds } })
                        }
                      >
                        {translate('configuration.timer.seconds', { seconds })}
                      </button>
                    ))}
                  </div>
                  <label>
                    <span>{translate('configuration.timer.custom')}</span>
                    <input
                      type="number"
                      min={30}
                      max={600}
                      step={30}
                      value={state.draft.conversation.seconds}
                      onChange={(event) =>
                        onApply({
                          type: 'set-conversation',
                          value: { mode: 'timer', seconds: event.currentTarget.valueAsNumber },
                        })
                      }
                    />
                  </label>
                </div>
              )}
            </fieldset>

            <fieldset disabled={disabled}>
              <legend>{translate('configuration.turnOrder')}</legend>
              <div className="segmented-control">
                {(['roster', 'random', 'free'] as const).map((value) =>
                  choice(
                    'turn-order',
                    value,
                    state.draft.turnOrder === value,
                    translate(`configuration.turnOrder.${value}`),
                    { type: 'set-turn-order', value },
                  ),
                )}
              </div>
            </fieldset>

            <fieldset disabled={disabled}>
              <legend>{translate('configuration.voting')}</legend>
              <div className="segmented-control">
                {(['verbal', 'secret'] as const).map((value) =>
                  choice(
                    'voting',
                    value,
                    state.draft.voting === value,
                    translate(`configuration.voting.${value}`),
                    { type: 'set-voting', value },
                  ),
                )}
              </div>
              <label className="toggle-control">
                <input
                  type="checkbox"
                  checked={state.draft.finalAttempt}
                  onChange={(event) =>
                    onApply({ type: 'set-final-attempt', value: event.currentTarget.checked })
                  }
                />
                <span>{translate('configuration.finalAttempt')}</span>
              </label>
            </fieldset>

            <fieldset disabled={disabled}>
              <legend>{translate('configuration.multi')}</legend>
              <div className="rule-group">
                <span>{translate('configuration.allocation')}</span>
                <div className="segmented-control">
                  {(['random', 'balanced'] as const).map((value) =>
                    choice(
                      'allocation',
                      value,
                      state.draft.allocation === value,
                      translate(`configuration.allocation.${value}`),
                      { type: 'set-allocation', value },
                      state.draft.impostorCount === 1,
                    ),
                  )}
                </div>
              </div>
              <div className="rule-group">
                <span>{translate('configuration.awareness')}</span>
                <div className="segmented-control">
                  {(['unknown', 'known'] as const).map((value) =>
                    choice(
                      'awareness',
                      value,
                      state.draft.impostorAwareness === value,
                      translate(`configuration.awareness.${value}`),
                      { type: 'set-awareness', value },
                      state.draft.impostorCount === 1,
                    ),
                  )}
                </div>
              </div>
              <div className="rule-group">
                <span>{translate('configuration.elimination')}</span>
                <div className="segmented-control">
                  {(['single', 'successive'] as const).map((value) =>
                    choice(
                      'elimination',
                      value,
                      state.draft.elimination === value,
                      translate(`configuration.elimination.${value}`),
                      { type: 'set-elimination', value },
                      state.draft.impostorCount === 1,
                    ),
                  )}
                </div>
              </div>
            </fieldset>
          </div>
          <div className="configuration-actions">
            <button type="button" onClick={onBack} disabled={busy}>
              {translate('configuration.back')}
            </button>
            <button type="button" className="primary-action" onClick={onReview} disabled={disabled}>
              {translate('configuration.review')}
            </button>
          </div>
        </>
      )}
    </section>
  )
}
