import { useEffect, useReducer } from 'react'
import { InstallHelp } from '../features/platform/components/InstallHelp'
import { RecoveryStatus } from '../features/platform/components/RecoveryStatus'
import { UpdatePrompt } from '../features/platform/components/UpdatePrompt'
import { OfflineStatus } from '../features/platform/components/OfflineStatus'
import { useAppUpdate } from '../features/platform/hooks/useAppUpdate'
import { useInstallPrompt } from '../features/platform/hooks/useInstallPrompt'
import { useOfflineLifecycle } from '../features/platform/hooks/useOfflineLifecycle'
import { useRecovery } from '../features/platform/hooks/useRecovery'
import {
  appUpdateCoordinator,
  setAppDurability,
} from '../features/platform/services/appUpdateRuntime'
import { recoveryService } from '../features/platform/services/recoveryRuntime'
import { translate } from '../i18n/translate'
import { AppShell } from './AppShell'
import { initialNavigationState, navigationReducer } from './navigation'

export function App() {
  const [navigation, dispatch] = useReducer(navigationReducer, initialNavigationState)
  const offline = useOfflineLifecycle()
  const installation = useInstallPrompt()
  const update = useAppUpdate(appUpdateCoordinator)
  const recovery = useRecovery(recoveryService)
  useEffect(() => {
    setAppDurability(
      recovery.state.status === 'ready' ||
        recovery.state.status === 'observer' ||
        recovery.state.status === 'cleared',
    )
  }, [recovery.state.status])
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
        <section aria-labelledby="welcome-title">
          <h2 id="welcome-title">{translate('app.tagline')}</h2>
          <OfflineStatus
            state={offline.state}
            online={offline.online}
            onRetryPreparation={offline.retryPreparation}
          />
        </section>
      )}
    </AppShell>
  )
}
