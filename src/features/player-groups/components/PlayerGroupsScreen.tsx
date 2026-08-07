import { useState, type FormEvent } from 'react'
import {
  MAX_GROUP_NAME_LENGTH,
  MAX_PLAYER_NAME_LENGTH,
  type PlayerGroupIssue,
  type SavedPlayerGroup,
} from '../../../domain/entities/playerGroup'
import type { PublicPlatformError } from '../../../domain/entities/platform'
import { translate } from '../../../i18n/translate'
import type { PlayerGroupsState } from '../services/playerGroupsService'

interface Props {
  readOnly?: boolean
  state: PlayerGroupsState
  onAdd: (name: string) => void
  onRename: (playerId: string, name: string) => void
  onRemove: (playerId: string) => void
  onMove: (playerId: string, direction: 'up' | 'down') => void
  onSaveGroup: (name: string) => void
  onLoadGroup: (groupId: string) => void
  onDeleteGroup: (groupId: string) => void
  onPrepare: () => void
  onRetry: () => void
}

const issueKeys: Record<PlayerGroupIssue, Parameters<typeof translate>[0]> = {
  'empty-name': 'players.error.emptyName',
  'name-too-long': 'players.error.nameTooLong',
  'duplicate-name': 'players.error.duplicateName',
  'minimum-players': 'players.error.minimum',
  'maximum-players': 'players.error.maximum',
  'player-not-found': 'players.error.notFound',
  'duplicate-group-name': 'groups.error.duplicateName',
  'group-name-too-long': 'groups.error.nameTooLong',
  'invalid-group': 'groups.error.invalid',
}

const storageKeys: Record<PublicPlatformError['code'], Parameters<typeof translate>[0]> = {
  'first-load-required': 'platform.firstLoadRequired',
  'storage-unavailable': 'platform.storageUnavailable',
  'storage-full': 'platform.storageFull',
  'incompatible-data': 'platform.incompatibleData',
  'migration-failed': 'recovery.migrationFailed',
  'revision-conflict': 'groups.error.conflict',
  'writer-unavailable': 'platform.writerUnavailable',
  'content-exhausted': 'groups.error.storage',
  'update-failed': 'platform.updateFailed',
  'unknown-storage-error': 'groups.error.storage',
}

function limitCharacters(value: string, maximum: number): string {
  return Array.from(value).slice(0, maximum).join('')
}

function GroupRow({
  group,
  onLoad,
  onDelete,
  disabled,
}: {
  group: SavedPlayerGroup
  onLoad: () => void
  onDelete: () => void
  disabled: boolean
}) {
  return (
    <li className="saved-group">
      <div>
        <strong>{group.name}</strong>
        <span className="muted">
          {translate('groups.playerCount', { count: group.players.length })}
        </span>
      </div>
      <div className="row-actions">
        <button type="button" onClick={onLoad} disabled={disabled}>
          {translate('groups.load')}
        </button>
        <button type="button" onClick={onDelete} disabled={disabled}>
          {translate('groups.delete')}
        </button>
      </div>
    </li>
  )
}

function PlayerNameInput({
  playerId,
  name,
  disabled,
  onRename,
}: {
  playerId: string
  name: string
  disabled: boolean
  onRename: (playerId: string, name: string) => void
}) {
  const [value, setValue] = useState(name)

  return (
    <input
      aria-label={translate('players.renameLabel', { name })}
      value={value}
      onChange={(event) => setValue(limitCharacters(event.target.value, MAX_PLAYER_NAME_LENGTH))}
      onBlur={() => {
        if (value !== name) onRename(playerId, value)
        setValue(name)
      }}
      disabled={disabled}
    />
  )
}

export function PlayerGroupsScreen({
  state,
  readOnly = false,
  onAdd,
  onRename,
  onRemove,
  onMove,
  onSaveGroup,
  onLoadGroup,
  onDeleteGroup,
  onPrepare,
  onRetry,
}: Props) {
  const [playerName, setPlayerName] = useState('')
  const [groupName, setGroupName] = useState('')
  const pending = state.status === 'loading' || state.status === 'saving'

  function addPlayer(event: FormEvent) {
    event.preventDefault()
    onAdd(playerName)
    setPlayerName('')
  }

  function saveGroup(event: FormEvent) {
    event.preventDefault()
    onSaveGroup(groupName)
  }

  function loadSavedGroup(group: SavedPlayerGroup) {
    if (
      state.draft.dirty &&
      state.draft.players.length > 0 &&
      !window.confirm(translate('groups.confirmReplace'))
    ) {
      return
    }
    setGroupName(group.name)
    onLoadGroup(group.id)
  }

  function deleteSavedGroup(group: SavedPlayerGroup) {
    if (!window.confirm(translate('groups.confirmDelete', { name: group.name }))) return
    onDeleteGroup(group.id)
  }

  return (
    <section className="player-groups" aria-labelledby="players-title">
      <header className="section-header">
        <div>
          <h2 id="players-title">{translate('players.title')}</h2>
          <p className="muted">{translate('players.subtitle')}</p>
        </div>
        <span className="player-count" aria-live="polite">
          {translate('players.count', { count: state.draft.players.length })}
        </span>
      </header>

      <form className="inline-form" onSubmit={addPlayer}>
        <label htmlFor="player-name">{translate('players.nameLabel')}</label>
        <div className="input-action">
          <input
            id="player-name"
            value={playerName}
            onChange={(event) =>
              setPlayerName(limitCharacters(event.target.value, MAX_PLAYER_NAME_LENGTH))
            }
            disabled={pending || readOnly}
            autoComplete="off"
          />
          <button type="submit" disabled={pending || readOnly}>
            {translate('players.add')}
          </button>
        </div>
      </form>

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
          {state.storageError.retryable && (
            <button type="button" onClick={onRetry}>
              {translate('groups.retry')}
            </button>
          )}
        </div>
      )}

      {state.draft.players.length === 0 ? (
        <p className="empty-state">{translate('players.empty')}</p>
      ) : (
        <ol className="player-list">
          {state.draft.players.map((player, index) => (
            <li key={player.id} className="player-row">
              <span className="position" aria-hidden="true">
                {index + 1}
              </span>
              <PlayerNameInput
                key={`${player.id}:${player.name}`}
                playerId={player.id}
                name={player.name}
                disabled={pending || readOnly}
                onRename={onRename}
              />
              <div className="icon-actions">
                <button
                  type="button"
                  aria-label={translate('players.moveUp', { name: player.name })}
                  title={translate('players.moveUp', { name: player.name })}
                  onClick={() => onMove(player.id, 'up')}
                  disabled={pending || readOnly || index === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={translate('players.moveDown', { name: player.name })}
                  title={translate('players.moveDown', { name: player.name })}
                  onClick={() => onMove(player.id, 'down')}
                  disabled={pending || readOnly || index === state.draft.players.length - 1}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={translate('players.remove', { name: player.name })}
                  onClick={() => onRemove(player.id)}
                  disabled={pending || readOnly}
                >
                  ×
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="prepare-actions">
        <button
          type="button"
          className="primary-action"
          onClick={onPrepare}
          disabled={pending || readOnly || state.draft.players.length < 3}
        >
          {translate('players.continue')}
        </button>
        {state.prepared && (
          <p className="success-message" role="status">
            {translate('players.prepared', { count: state.prepared.players.length })}
          </p>
        )}
      </div>

      <section className="saved-groups-section" aria-labelledby="saved-groups-title">
        <h3 id="saved-groups-title">{translate('groups.title')}</h3>
        <form className="inline-form" onSubmit={saveGroup}>
          <label htmlFor="group-name">{translate('groups.nameLabel')}</label>
          <div className="input-action">
            <input
              id="group-name"
              value={groupName}
              onChange={(event) =>
                setGroupName(limitCharacters(event.target.value, MAX_GROUP_NAME_LENGTH))
              }
              disabled={pending || readOnly}
              autoComplete="off"
            />
            <button type="submit" disabled={pending || readOnly || state.draft.players.length < 3}>
              {state.draft.sourceGroupId ? translate('groups.update') : translate('groups.save')}
            </button>
          </div>
        </form>

        {state.status === 'loading' ? (
          <p role="status">{translate('groups.loading')}</p>
        ) : state.groups.length === 0 ? (
          <p className="empty-state">{translate('groups.empty')}</p>
        ) : (
          <ul className="saved-groups-list">
            {state.groups.map((group) => (
              <GroupRow
                key={group.id}
                group={group}
                disabled={pending || readOnly}
                onLoad={() => loadSavedGroup(group)}
                onDelete={() => deleteSavedGroup(group)}
              />
            ))}
          </ul>
        )}
      </section>
    </section>
  )
}
