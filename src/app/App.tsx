import { useReducer } from 'react'
import { OfflineStatus } from '../features/platform/components/OfflineStatus'
import { useOfflineLifecycle } from '../features/platform/hooks/useOfflineLifecycle'
import { translate } from '../i18n/translate'
import { AppShell } from './AppShell'
import { initialNavigationState, navigationReducer } from './navigation'

export function App() {
  const [navigation, dispatch] = useReducer(navigationReducer, initialNavigationState)
  const offline = useOfflineLifecycle()
  return (
    <AppShell onHelp={() => dispatch({ type: 'OPEN_HELP' })}>
      {navigation.screen === 'help' ? (
        <section aria-labelledby="help-title">
          <h2 id="help-title">{translate('nav.help')}</h2>
          <p className="muted">{translate('install.unsupported')}</p>
          <button type="button" onClick={() => dispatch({ type: 'BACK' })}>
            {translate('nav.home')}
          </button>
        </section>
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
