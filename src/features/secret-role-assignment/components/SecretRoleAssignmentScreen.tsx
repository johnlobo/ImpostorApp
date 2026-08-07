import type { RoundHandoff } from '../../../domain/entities/secretRoleAssignment'
import { translate } from '../../../i18n/translate'
import type { SecretRoleAssignmentState } from '../services/secretRoleAssignmentService'

interface Controller {
  readonly state: SecretRoleAssignmentState
  selectPlayer(playerId: string): void
  reveal(): Promise<void>
  conceal(): void
  startRound(): RoundHandoff | null
  resetHistory(): Promise<void>
  retry(): Promise<void>
}

function storageMessage(state: SecretRoleAssignmentState): string {
  switch (state.storageError?.code) {
    case 'content-exhausted':
      return translate('roles.error.exhausted')
    case 'writer-unavailable':
      return translate('platform.writerUnavailable')
    case 'incompatible-data':
      return translate('platform.incompatibleData')
    case 'storage-full':
      return translate('platform.storageFull')
    default:
      return translate('roles.error.storage')
  }
}

export function SecretRoleAssignmentScreen({
  controller,
  onStart,
}: {
  controller: Controller
  onStart: (handoff: RoundHandoff) => void
}) {
  const { state } = controller
  const selectedPlayer = state.progress?.players.find(({ id }) => id === state.selectedPlayerId)

  if (state.status === 'loading' || state.status === 'preparing') {
    return (
      <main className="secret-role-screen" aria-busy="true">
        <p role="status">{translate('roles.preparing')}</p>
      </main>
    )
  }

  if (state.status === 'error') {
    return (
      <main className="secret-role-screen">
        <p className="status-message error-message" role="alert">
          {storageMessage(state)}
        </p>
        {state.storageError?.retryable && (
          <button type="button" onClick={() => void controller.retry()}>
            {translate('platform.retry')}
          </button>
        )}
        {state.storageError?.code === 'content-exhausted' && !state.readOnly && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(translate('catalog.history.confirm'))) {
                void controller.resetHistory()
              }
            }}
          >
            {translate('catalog.history.reset')}
          </button>
        )}
      </main>
    )
  }

  if (state.status === 'private-covered' || state.status === 'revealing') {
    return (
      <main className="private-role-screen" aria-label={translate('roles.private.label')}>
        <header>
          <p className="muted">
            {translate('roles.private.player', { name: selectedPlayer?.name ?? '' })}
          </p>
          <p>{translate('roles.category')}</p>
          <h2>{state.privateCategory}</h2>
        </header>
        <button
          type="button"
          className="reveal-curtain"
          autoFocus
          disabled={state.status === 'revealing'}
          onClick={() => void controller.reveal()}
        >
          {state.status === 'revealing' ? translate('roles.revealing') : translate('roles.reveal')}
        </button>
      </main>
    )
  }

  if (state.status === 'private-revealed' && state.privateRole) {
    return (
      <main className="private-role-screen" aria-label={translate('roles.private.label')}>
        <header>
          <p className="muted">{translate('roles.category')}</p>
          <h2>{state.privateRole.category}</h2>
        </header>
        <section className="private-role-content" aria-live="polite">
          {state.privateRole.kind === 'citizen' ? (
            <>
              <p>{translate('roles.concept')}</p>
              <strong>{state.privateRole.concept}</strong>
            </>
          ) : (
            <>
              <strong>{translate('roles.impostor')}</strong>
              {state.privateRole.companions.length > 0 && (
                <p>
                  {translate('roles.companions', {
                    names: state.privateRole.companions.join(', '),
                  })}
                </p>
              )}
            </>
          )}
        </section>
        <button
          type="button"
          className="primary-action"
          autoFocus
          onClick={() => controller.conceal()}
        >
          {translate('roles.hide')}
        </button>
      </main>
    )
  }

  const progress = state.progress
  if (!progress) return null

  return (
    <main className="secret-role-screen" aria-label={translate('roles.shared.label')}>
      <header className="section-header">
        <div>
          <p className="muted">{translate('roles.shared.eyebrow')}</p>
          <h2>{translate('roles.title')}</h2>
        </div>
        <strong aria-label={translate('roles.progress.label')}>
          {translate('roles.progress', {
            completed: progress.completed,
            total: progress.total,
          })}
        </strong>
      </header>
      {state.readOnly && <p className="status-message">{translate('roles.observer')}</p>}
      <ol className="reveal-player-list">
        {progress.players.map((player) => (
          <li key={player.id}>
            <button
              type="button"
              disabled={state.readOnly || player.status === 'completed'}
              className={player.status === 'completed' ? 'completed-player' : undefined}
              onClick={() => controller.selectPlayer(player.id)}
            >
              <span>{player.name}</span>
              <span className="muted">
                {translate(
                  player.status === 'completed' ? 'roles.player.completed' : 'roles.player.pending',
                )}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className="primary-action start-round-action"
        disabled={state.readOnly || progress.completed !== progress.total}
        onClick={() => {
          const handoff = controller.startRound()
          if (handoff) onStart(handoff)
        }}
      >
        {translate('roles.start')}
      </button>
    </main>
  )
}
