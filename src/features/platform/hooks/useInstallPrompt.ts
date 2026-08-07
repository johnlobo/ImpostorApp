import { useCallback, useEffect, useState } from 'react'
import {
  BrowserInstallCapability,
  type BeforeInstallPromptEvent,
} from '../../../infrastructure/pwa/installCapability'

const capability = new BrowserInstallCapability()

export function useInstallPrompt() {
  const [state, setState] = useState(() => capability.getState())

  useEffect(() => {
    const refresh = () => setState(capability.getState())
    const capturePrompt = (event: Event) => {
      capability.capture(event as BeforeInstallPromptEvent)
      refresh()
    }
    const markInstalled = () => {
      capability.markInstalled()
      refresh()
    }

    window.addEventListener('beforeinstallprompt', capturePrompt)
    window.addEventListener('appinstalled', markInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', capturePrompt)
      window.removeEventListener('appinstalled', markInstalled)
    }
  }, [])

  const install = useCallback(async () => {
    await capability.install()
    setState(capability.getState())
  }, [])

  return { state, install }
}
