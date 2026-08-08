import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import {
  isPreparedContentSelection,
  type ContentCategory,
  type PreparedContentSelection,
} from '../domain/entities/contentCatalog'
import { isPreparedGame, type PreparedGame } from '../domain/entities/gameConfiguration'
import { prepareRoster, type PreparedRoster } from '../domain/entities/playerGroup'
import type { CluePhaseHandoff } from '../domain/entities/roundSession'
import { isSecretRoundSnapshot, type RoundHandoff } from '../domain/entities/secretRoleAssignment'
import { ContentCatalogScreen } from '../features/content-catalog/components/ContentCatalogScreen'
import { ES_ADULT_CATALOG } from '../features/content-catalog/data/esAdultCatalog'
import { ES_GENERAL_CATALOG } from '../features/content-catalog/data/esCatalog'
import { useContentCatalog } from '../features/content-catalog/hooks/useContentCatalog'
import { GameConfigurationScreen } from '../features/game-configuration/components/GameConfigurationScreen'
import { useGameConfiguration } from '../features/game-configuration/hooks/useGameConfiguration'
import { PlayerGroupsScreen } from '../features/player-groups/components/PlayerGroupsScreen'
import { usePlayerGroups } from '../features/player-groups/hooks/usePlayerGroups'
import { SecretRoleAssignmentScreen } from '../features/secret-role-assignment/components/SecretRoleAssignmentScreen'
import { useSecretRoleAssignment } from '../features/secret-role-assignment/hooks/useSecretRoleAssignment'
import { RoundSessionScreen } from '../features/round-session/components/RoundSessionScreen'
import { useRoundSession } from '../features/round-session/hooks/useRoundSession'
import { InstallHelp } from '../features/platform/components/InstallHelp'
import { OfflineStatus } from '../features/platform/components/OfflineStatus'
import { RecoveryStatus } from '../features/platform/components/RecoveryStatus'
import { UpdatePrompt } from '../features/platform/components/UpdatePrompt'
import { useAppUpdate } from '../features/platform/hooks/useAppUpdate'
import { useInstallPrompt } from '../features/platform/hooks/useInstallPrompt'
import { useOfflineLifecycle } from '../features/platform/hooks/useOfflineLifecycle'
import { useRecovery } from '../features/platform/hooks/useRecovery'
import { appUpdateCoordinator } from '../features/platform/services/appUpdateRuntime'
import {
  conceptDrawRepository,
  contentPreferencesRepository,
  contentSelectionRepository,
  customCategoriesRepository,
  gameConfigurationRepository,
  playerGroupsRepository,
  recoveryService,
  roundSessionRepository,
  secretRoundRepository,
} from '../features/platform/services/recoveryRuntime'
import { translate } from '../i18n/translate'
import { AppShell } from './AppShell'
import { initialNavigationState, navigationReducer } from './navigation'

const builtInCatalog: readonly ContentCategory[] = [...ES_GENERAL_CATALOG, ...ES_ADULT_CATALOG]

function ConfigurationFlow({
  roster,
  readOnly,
  onBack,
  onConfirmed,
}: {
  roster: PreparedRoster
  readOnly: boolean
  onBack: () => void
  onConfirmed: (game: PreparedGame) => void
}) {
  const configuration = useGameConfiguration(roster, gameConfigurationRepository)

  useEffect(() => {
    if (configuration.state.status === 'confirmed' && configuration.state.confirmed) {
      onConfirmed(configuration.state.confirmed)
    }
  }, [configuration.state.confirmed, configuration.state.status, onConfirmed])

  return (
    <GameConfigurationScreen
      readOnly={readOnly}
      state={configuration.state}
      onApply={configuration.apply}
      onReview={configuration.review}
      onEdit={configuration.edit}
      onConfirm={() => {
        void configuration.confirm()
      }}
      onRetry={() => {
        void configuration.retry()
      }}
      onBack={onBack}
    />
  )
}

function ContentCatalogFlow({
  game,
  readOnly,
  onConfirmed,
}: {
  game: PreparedGame
  readOnly: boolean
  onConfirmed: (content: PreparedContentSelection) => void
}) {
  const dependencies = useMemo(
    () => ({
      game,
      builtInCategories: builtInCatalog,
      customCategoriesRepository,
      preferencesRepository: contentPreferencesRepository,
      selectionRepository: contentSelectionRepository,
      drawRepository: conceptDrawRepository,
      readOnly,
    }),
    [game, readOnly],
  )
  const controller = useContentCatalog(dependencies)
  return <ContentCatalogScreen controller={controller} onConfirmed={onConfirmed} />
}

function RoleAssignmentFlow({
  content,
  readOnly,
  onStart,
}: {
  content: PreparedContentSelection
  readOnly: boolean
  onStart: (handoff: RoundHandoff) => void
}) {
  const resetHistory = useCallback(
    () => conceptDrawRepository.reset(content.game.id, { confirmed: true }),
    [content.game.id],
  )
  const controller = useSecretRoleAssignment(content, secretRoundRepository, readOnly, resetHistory)
  return <SecretRoleAssignmentScreen controller={controller} onStart={onStart} />
}

function RoundSessionFlow({
  handoff,
  readOnly,
  onClosed,
}: {
  handoff?: RoundHandoff
  readOnly: boolean
  onClosed: (handoff: CluePhaseHandoff) => void
}) {
  const controller = useRoundSession(roundSessionRepository, readOnly, handoff)
  return <RoundSessionScreen controller={controller} onClosed={onClosed} />
}

export function App() {
  const [navigation, dispatch] = useReducer(navigationReducer, initialNavigationState)
  const [configurationRoster, setConfigurationRoster] = useState<PreparedRoster | null>(null)
  const [confirmedGame, setConfirmedGame] = useState<PreparedGame | null>(null)
  const [confirmedContent, setConfirmedContent] = useState<PreparedContentSelection | null>(null)
  const [roundHandoff, setRoundHandoff] = useState<RoundHandoff | null>(null)
  const [, setCluePhaseHandoff] = useState<CluePhaseHandoff | null>(null)
  const offline = useOfflineLifecycle()
  const installation = useInstallPrompt()
  const update = useAppUpdate(appUpdateCoordinator)
  const recovery = useRecovery(recoveryService)
  const playerGroups = usePlayerGroups(playerGroupsRepository)

  const snapshot =
    recovery.state.status === 'ready' || recovery.state.status === 'observer'
      ? recovery.state.snapshot
      : null
  const recoveredContent =
    snapshot?.phase === 'content-selected' && isPreparedContentSelection(snapshot.payload)
      ? snapshot.payload
      : null
  const recoveredSecretRound =
    snapshot?.phase === 'round-prepared' && isSecretRoundSnapshot(snapshot.payload)
      ? snapshot.payload
      : null
  const invalidSecretRound = snapshot?.phase === 'round-prepared' && !recoveredSecretRound
  const recoveredGame =
    snapshot?.phase === 'configured' && isPreparedGame(snapshot.payload)
      ? snapshot.payload
      : (recoveredContent?.game ?? recoveredSecretRound?.content.game ?? null)
  const activeGame = confirmedGame ?? recoveredGame
  const activeContent =
    confirmedContent ?? recoveredContent ?? recoveredSecretRound?.content ?? null
  const handleGameConfirmed = useCallback((game: PreparedGame) => {
    setConfirmedGame(game)
  }, [])
  const handleContentConfirmed = useCallback((content: PreparedContentSelection) => {
    setConfirmedContent(content)
  }, [])
  const handleRoundStarted = useCallback((handoff: RoundHandoff) => {
    setRoundHandoff(handoff)
  }, [])

  return (
    <AppShell onHelp={() => dispatch({ type: 'OPEN_HELP' })}>
      <RecoveryStatus
        state={recovery.state}
        onRetry={recovery.retry}
        onClearData={recovery.clearAllData}
        onSafeExit={() => dispatch({ type: 'OPEN_HELP' })}
      />
      <UpdatePrompt state={update.state} onPostpone={update.postpone} onApply={update.apply} />
      {navigation.screen === 'help' ? (
        <div>
          <InstallHelp state={installation.state} onInstall={installation.install} />
          <button type="button" onClick={() => dispatch({ type: 'BACK' })}>
            {translate('nav.home')}
          </button>
        </div>
      ) : (
        <>
          <OfflineStatus
            state={offline.state}
            online={offline.online}
            onRetryPreparation={offline.retryPreparation}
          />
          {(recovery.state.status === 'ready' || recovery.state.status === 'observer') &&
            (invalidSecretRound ? (
              <main className="status-message error-message" role="alert">
                <h2>{translate('recovery.safeMode')}</h2>
                <p>{translate('platform.incompatibleData')}</p>
                <p>{translate('recovery.dataPreserved')}</p>
              </main>
            ) : roundHandoff ? (
              <RoundSessionFlow
                handoff={roundHandoff}
                readOnly={recovery.state.status === 'observer'}
                onClosed={setCluePhaseHandoff}
              />
            ) : snapshot?.phase === 'clues-active' ? (
              <RoundSessionFlow
                readOnly={recovery.state.status === 'observer'}
                onClosed={setCluePhaseHandoff}
              />
            ) : activeContent ? (
              <RoleAssignmentFlow
                content={activeContent}
                readOnly={recovery.state.status === 'observer'}
                onStart={handleRoundStarted}
              />
            ) : activeGame ? (
              <ContentCatalogFlow
                game={activeGame}
                readOnly={recovery.state.status === 'observer'}
                onConfirmed={handleContentConfirmed}
              />
            ) : configurationRoster ? (
              <ConfigurationFlow
                roster={configurationRoster}
                readOnly={recovery.state.status === 'observer'}
                onBack={() => setConfigurationRoster(null)}
                onConfirmed={handleGameConfirmed}
              />
            ) : (
              <PlayerGroupsScreen
                readOnly={recovery.state.status === 'observer'}
                state={playerGroups.state}
                onAdd={(name) => playerGroups.apply({ type: 'add', name })}
                onRename={(playerId, name) =>
                  playerGroups.apply({ type: 'rename', playerId, name })
                }
                onRemove={(playerId) => playerGroups.apply({ type: 'remove', playerId })}
                onMove={(playerId, direction) =>
                  playerGroups.apply({ type: 'move', playerId, direction })
                }
                onSaveGroup={(name) => {
                  void playerGroups.saveGroup(name)
                }}
                onLoadGroup={playerGroups.loadGroup}
                onDeleteGroup={(groupId) => {
                  void playerGroups.deleteGroup(groupId)
                }}
                onPrepare={() => {
                  playerGroups.prepare()
                  const prepared = prepareRoster(playerGroups.state.draft)
                  if (prepared.ok) setConfigurationRoster(prepared.value)
                }}
                onRetry={() => {
                  void playerGroups.retry()
                }}
              />
            ))}
        </>
      )}
    </AppShell>
  )
}
