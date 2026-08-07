import type { PropsWithChildren } from 'react'
import { translate } from '../i18n/translate'

interface AppShellProps extends PropsWithChildren {
  onHelp: () => void
}

export function AppShell({ children, onHelp }: AppShellProps) {
  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>{translate('app.name')}</h1>
        <button type="button" onClick={onHelp} aria-label={translate('nav.help')}>
          {translate('nav.help')}
        </button>
      </header>
      <main className="app-content" id="main-content">
        {children}
      </main>
    </div>
  )
}
