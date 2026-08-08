import { useEffect, useRef } from 'react'
import type { CluePhaseHandoff } from '../../../domain/entities/roundSession'
import { translate } from '../../../i18n/translate'
import type { RoundSessionState } from '../services/roundSessionService'

interface Controller {
  readonly state: RoundSessionState
  begin(): Promise<void>
  advance(): Promise<void>
  pause(): Promise<void>
  resume(): Promise<void>
  requestClose(): void
  cancelClose(): void
  confirmClose(): Promise<CluePhaseHandoff | null>
  retry(): Promise<void>
}

function playerName(state: RoundSessionState, playerId: string): string {
  return (
    state.session?.preparedRound.roster.players.find(({ id }) => id === playerId)?.name ??
    translate('round.player.unknown')
  )
}

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`
}

function orderLabel(mode: 'roster' | 'random' | 'free'): string {
  if (mode === 'roster') return translate('round.order.roster')
  if (mode === 'random') return translate('round.order.random')
  return translate('round.order.free')
}

function errorMessage(state: RoundSessionState): string {
  if (state.error?.code === 'writer-unavailable') return translate('platform.writerUnavailable')
  if (state.error?.code === 'incompatible-data') return translate('platform.incompatibleData')
  if (state.error?.code === 'storage-full') return translate('platform.storageFull')
  return translate('round.error.storage')
}

export function RoundSessionScreen({
  controller,
  onClosed,
}: {
  readonly controller: Controller
  readonly onClosed: (handoff: CluePhaseHandoff) => void
}) {
  const { state } = controller
  const closeTriggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const wasConfirming = useRef(false)
  const isConfirming = state.status === 'confirmation' || state.status === 'closing'

  useEffect(() => {
    if (!isConfirming && wasConfirming.current) closeTriggerRef.current?.focus()
    wasConfirming.current = isConfirming
  }, [isConfirming])

  useEffect(() => {
    if (state.status !== 'confirmation') return
    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        controller.cancelClose()
        return
      }
      if (event.key !== 'Tab') return
      const controls = Array.from(
        dialogRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [],
      )
      if (controls.length === 0) return
      const first = controls[0]!
      const last = controls.at(-1)!
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleDialogKey)
    return () => window.removeEventListener('keydown', handleDialogKey)
  }, [controller, state.status])

  if (state.status === 'loading' || state.status === 'preparing') {
    return (
      <main className="round-session-screen" aria-busy="true">
        <p role="status">{translate('round.loading')}</p>
      </main>
    )
  }

  if (state.status === 'safe-mode' || state.status === 'error') {
    return (
      <main className="round-session-screen">
        <p className="status-message error-message" role="alert">
          {errorMessage(state)}
        </p>
        {state.error?.retryable && (
          <button type="button" className="primary-action" onClick={() => void controller.retry()}>
            {translate('platform.retry')}
          </button>
        )}
      </main>
    )
  }

  const session = state.session
  if (!session) {
    return (
      <main className="round-session-screen">
        <p className="status-message">{translate('round.observer.empty')}</p>
      </main>
    )
  }
  const { activePhase: phase, preparedRound } = session
  const sequence = phase.turnSequence.mode === 'free' ? [] : phase.turnSequence.playerIds
  const currentId =
    phase.currentTurnIndex === null ? null : (sequence[phase.currentTurnIndex] ?? null)
  const timed = state.remainingSeconds !== null

  return (
    <main className="round-session-screen" aria-label={translate('round.label')}>
      <header className="section-header">
        <div>
          <p className="muted">{translate('round.eyebrow')}</p>
          <h2>
            {translate('round.progress', {
              round: preparedRound.identity.roundNumber,
              total: preparedRound.totalRounds,
            })}
          </h2>
        </div>
        <strong>{orderLabel(phase.turnSequence.mode)}</strong>
      </header>

      {state.status === 'observer' && (
        <p className="status-message">{translate('round.observer')}</p>
      )}

      {timed && (
        <section className="round-clock" aria-label={translate('round.clock.label')}>
          <span>{translate('round.clock.label')}</span>
          <strong>{formatClock(state.remainingSeconds ?? 0)}</strong>
          {state.remainingSeconds === 0 && phase.state !== 'closed' && (
            <p className="status-message error-message" role="alert">
              {translate('round.clock.expired')}
            </p>
          )}
        </section>
      )}

      {phase.state !== 'closed' && (
        <section className="round-current" aria-live="polite">
          {phase.state === 'ready' ? (
            <>
              <p className="muted">{translate('round.ready')}</p>
              <h3>
                {phase.turnSequence.mode === 'free'
                  ? translate('round.free')
                  : translate('round.starts', {
                      name: playerName(state, phase.turnSequence.startingPlayerId),
                    })}
              </h3>
            </>
          ) : currentId ? (
            <>
              <p className="muted">{translate('round.current')}</p>
              <h3>{playerName(state, currentId)}</h3>
            </>
          ) : (
            <>
              <p className="muted">{translate('round.discussion')}</p>
              <h3>{translate('round.discussion.detail')}</h3>
            </>
          )}
        </section>
      )}

      {sequence.length > 0 && (
        <ol className="round-sequence" aria-label={translate('round.sequence')}>
          {sequence.map((playerId, index) => (
            <li
              key={playerId}
              className={
                phase.completedCluePlayerIds.includes(playerId)
                  ? 'round-player-complete'
                  : index === phase.currentTurnIndex
                    ? 'round-player-current'
                    : undefined
              }
            >
              <span>{index + 1}</span>
              <span>{playerName(state, playerId)}</span>
            </li>
          ))}
        </ol>
      )}

      {isConfirming ? (
        <section
          ref={dialogRef}
          className="round-confirmation"
          role="dialog"
          aria-modal="true"
          aria-labelledby="round-close-title"
        >
          <h3 id="round-close-title">{translate('round.close.title')}</h3>
          <p>{translate('round.close.detail')}</p>
          <div className="round-actions">
            <button
              type="button"
              disabled={state.status === 'closing'}
              onClick={() => controller.cancelClose()}
            >
              {translate('round.close.cancel')}
            </button>
            <button
              type="button"
              className="primary-action"
              autoFocus
              disabled={state.status === 'closing'}
              onClick={() => {
                void controller.confirmClose().then((handoff) => {
                  if (handoff) onClosed(handoff)
                })
              }}
            >
              {state.status === 'closing'
                ? translate('round.close.saving')
                : translate('round.close.confirm')}
            </button>
          </div>
        </section>
      ) : (
        <footer className="round-controls">
          {timed && ['clues', 'discussion'].includes(state.status) && (
            <button type="button" onClick={() => void controller.pause()}>
              {translate('round.pause')}
            </button>
          )}
          {state.status === 'paused' && (
            <button type="button" onClick={() => void controller.resume()}>
              {translate('round.resume')}
            </button>
          )}
          {state.status === 'ready' && (
            <button
              type="button"
              className="primary-action"
              onClick={() => void controller.begin()}
            >
              {translate('round.begin')}
            </button>
          )}
          {state.status === 'clues' && (
            <button
              type="button"
              className="primary-action"
              onClick={() => void controller.advance()}
            >
              {translate('round.next')}
            </button>
          )}
          {['discussion', 'paused', 'expired'].includes(state.status) && (
            <button
              type="button"
              ref={closeTriggerRef}
              className="primary-action"
              onClick={() => controller.requestClose()}
            >
              {translate('round.close.request')}
            </button>
          )}
          {phase.state === 'closed' && (
            <p className="status-message success-message" role="status">
              {translate('round.closed')}
            </p>
          )}
        </footer>
      )}
    </main>
  )
}
