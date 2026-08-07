import { useReducer, useState } from 'react'
import { prepareRoster, type PreparedRoster } from '../domain/entities/playerGroup'
import { GameConfigurationScreen } from '../features/game-configuration/components/GameConfigurationScreen'
import { useGameConfiguration } from '../features/game-configuration/hooks/useGameConfiguration'
import { PlayerGroupsScreen } from '../features/player-groups/components/PlayerGroupsScreen'
import { usePlayerGroups } from '../features/player-groups/hooks/usePlayerGroups'
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
  gameConfigurationRepository,
  playerGroupsRepository,
  recoveryService,
} from '../features/platform/services/recoveryRuntime'
import { translate } from '../i18n/translate'
import { AppShell } from './AppShell'
import { initialNavigationState, navigationReducer } from './navigation'

function ConfigurationFlow({
  roster,
  readOnly,
  onBack,
}: {
  roster: PreparedRoster
  readOnly: boolean
  onBack: () => void
}) {
  const configuration = useGameConfiguration(roster, gameConfigurationRepository)

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

export function App() {
  const [navigation, dispatch] = useReducer(navigationReducer, initialNavigationState)
  const [configurationRoster, setConfigurationRoster] = useState<PreparedRoster | null>(null)
  const offline = useOfflineLifecycle()
  const installation = useInstallPrompt()
  const update = useAppUpdate(appUpdateCoordinator)
  const recovery = useRecovery(recoveryService)
  const playerGroups = usePlayerGroups(playerGroupsRepository)

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
            (configurationRoster ? (
              <ConfigurationFlow
                roster={configurationRoster}
                readOnly={recovery.state.status === 'observer'}
                onBack={() => setConfigurationRoster(null)}
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
