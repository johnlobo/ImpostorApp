export type InstallState = 'ios' | 'android' | 'unsupported' | 'installed'

interface InstallChoice {
  outcome: 'accepted' | 'dismissed'
}

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<InstallChoice>
}

function isStandalone() {
  const iosNavigator = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || iosNavigator.standalone === true
}

function isIos() {
  return /iPad|iPhone|iPod/i.test(navigator.userAgent)
}

export class BrowserInstallCapability {
  private deferredPrompt: BeforeInstallPromptEvent | undefined

  getState(): InstallState {
    if (isStandalone()) return 'installed'
    if (this.deferredPrompt) return 'android'
    if (isIos()) return 'ios'
    return 'unsupported'
  }

  capture(event: BeforeInstallPromptEvent) {
    event.preventDefault()
    this.deferredPrompt = event
  }

  markInstalled() {
    this.deferredPrompt = undefined
  }

  async install() {
    const prompt = this.deferredPrompt
    if (!prompt) return

    this.deferredPrompt = undefined
    await prompt.prompt()
    await prompt.userChoice
  }
}
