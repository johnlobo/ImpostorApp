import type { InstallState } from '../../../infrastructure/pwa/installCapability'
import { translate } from '../../../i18n/translate'

interface InstallHelpProps {
  state: InstallState
  onInstall?: () => Promise<void>
}

export function InstallHelp({ state, onInstall }: InstallHelpProps) {
  return (
    <section className="install-help" data-testid="install-help" aria-labelledby="install-title">
      <h2 id="install-title">{translate('install.help')}</h2>
      {state === 'ios' && (
        <ol>
          <li>{translate('install.iosShare')}</li>
          <li>{translate('install.iosAddHome')}</li>
        </ol>
      )}
      {state === 'android' && (
        <button type="button" onClick={() => void onInstall?.()}>
          {translate('install.androidAction')}
        </button>
      )}
      {state === 'unsupported' && <p role="status">{translate('install.unsupported')}</p>}
      {state === 'installed' && <p role="status">{translate('install.installed')}</p>}
    </section>
  )
}
