import { useReducer } from 'react'
import { translate } from '../i18n/translate'
import { AppShell } from './AppShell'
import { initialNavigationState, navigationReducer } from './navigation'

export function App() {
  const [navigation, dispatch] = useReducer(navigationReducer, initialNavigationState)
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
          <p className="muted">{translate('platform.initializing')}</p>
        </section>
      )}
    </AppShell>
  )
}
