import { useState } from 'react'

import type { PublicErrorCode } from '../../../domain/entities/platform'
import type { TranslationKey } from '../../../i18n/es'
import { translate } from '../../../i18n/translate'
import type { RecoveryState } from '../services/recoveryService'

interface RecoveryStatusProps {
  state: RecoveryState
  onRetry: () => Promise<void>
  onClearData: (confirmation: { confirmed: true }) => Promise<void>
  onSafeExit?: () => void
}

const errorMessages: Partial<Record<PublicErrorCode, TranslationKey>> = {
  'storage-full': 'platform.storageFull',
  'storage-unavailable': 'platform.storageUnavailable',
  'incompatible-data': 'platform.incompatibleData',
  'migration-failed': 'recovery.migrationFailed',
  'writer-unavailable': 'platform.writerUnavailable',
}

export function RecoveryStatus({ state, onRetry, onClearData, onSafeExit }: RecoveryStatusProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const dataState =
    state.status === 'ready'
      ? state.snapshot
        ? 'restored'
        : 'empty'
      : state.status === 'cleared'
        ? 'empty'
        : state.status === 'error'
          ? state.error.code
          : state.status

  if (state.status === 'initializing') {
    return (
      <section data-testid="recovery-status" data-state={dataState} role="status">
        {translate('recovery.initializing')}
      </section>
    )
  }

  if (state.status === 'safe-read-only') {
    return (
      <section data-testid="recovery-status" data-state={dataState} role="alert">
        <h2>{translate('recovery.safeMode')}</h2>
        <p>{translate('platform.incompatibleData')}</p>
        <p>{translate('recovery.dataPreserved')}</p>
      </section>
    )
  }

  if (state.status === 'observer') {
    return (
      <section data-testid="recovery-status" data-state={dataState} role="status">
        <h2>{translate('recovery.observerTitle')}</h2>
        <p>{translate('platform.writerUnavailable')}</p>
        {state.snapshot && <SnapshotDetails snapshot={state.snapshot} />}
      </section>
    )
  }

  if (state.status === 'error') {
    return (
      <section data-testid="recovery-status" data-state={dataState} role="alert">
        <p>{translate(errorMessages[state.error.code] ?? 'platform.storageUnavailable')}</p>
        {state.error.retryable && (
          <button type="button" onClick={() => void onRetry()}>
            {translate('recovery.retry')}
          </button>
        )}
        {state.error.code === 'storage-full' && (
          <button data-testid="recovery-delete" type="button" onClick={() => setDeleteOpen(true)}>
            {translate('platform.deleteData')}
          </button>
        )}
        {state.error.code === 'storage-unavailable' && (
          <button data-testid="recovery-safe-exit" type="button" onClick={onSafeExit}>
            {translate('recovery.safeExit')}
          </button>
        )}
        <DeleteDialog
          open={deleteOpen}
          confirmed={confirmed}
          onConfirmed={setConfirmed}
          onCancel={() => {
            setDeleteOpen(false)
            setConfirmed(false)
          }}
          onClearData={onClearData}
        />
      </section>
    )
  }

  const snapshot = state.status === 'ready' || state.status === 'clearing' ? state.snapshot : null
  return (
    <section data-testid="recovery-status" data-state={dataState} role="status">
      <h2>
        {translate(
          snapshot
            ? 'recovery.snapshotAvailable'
            : state.status === 'cleared'
              ? 'recovery.cleared'
              : 'recovery.ready',
        )}
      </h2>
      {snapshot && <SnapshotDetails snapshot={snapshot} />}
      <button
        data-testid="recovery-delete"
        type="button"
        disabled={state.status === 'clearing'}
        onClick={() => setDeleteOpen(true)}
      >
        {translate('platform.deleteData')}
      </button>
      <DeleteDialog
        open={deleteOpen}
        confirmed={confirmed}
        onConfirmed={setConfirmed}
        onCancel={() => {
          setDeleteOpen(false)
          setConfirmed(false)
        }}
        onClearData={onClearData}
      />
    </section>
  )
}

function SnapshotDetails({
  snapshot,
}: {
  snapshot: NonNullable<Extract<RecoveryState, { status: 'ready' }>['snapshot']>
}) {
  return (
    <p
      data-testid="recovery-snapshot"
      data-revision={snapshot.revision}
      data-phase={snapshot.phase}
    >
      {translate('recovery.snapshotRevision', { revision: snapshot.revision })}
    </p>
  )
}

interface DeleteDialogProps {
  open: boolean
  confirmed: boolean
  onConfirmed: (confirmed: boolean) => void
  onCancel: () => void
  onClearData: (confirmation: { confirmed: true }) => Promise<void>
}

function DeleteDialog({ open, confirmed, onConfirmed, onCancel, onClearData }: DeleteDialogProps) {
  if (!open) return null
  return (
    <dialog data-testid="recovery-delete-dialog" open aria-labelledby="recovery-delete-title">
      <h2 id="recovery-delete-title">{translate('platform.deleteData')}</h2>
      <label>
        <input
          data-testid="recovery-delete-confirmation"
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirmed(event.currentTarget.checked)}
        />
        {translate('platform.confirmDelete')}
      </label>
      <button data-testid="recovery-delete-cancel" type="button" onClick={onCancel}>
        {translate('recovery.cancel')}
      </button>
      <button
        data-testid="recovery-delete-confirm"
        type="button"
        disabled={!confirmed}
        onClick={() => void onClearData({ confirmed: true })}
      >
        {translate('platform.deleteData')}
      </button>
    </dialog>
  )
}
