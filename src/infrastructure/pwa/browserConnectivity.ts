import type { ConnectivityGateway } from '../../domain/ports/platform'

export class BrowserConnectivity implements ConnectivityGateway {
  isOnline(): boolean {
    return navigator.onLine
  }

  subscribe(listener: (online: boolean) => void): () => void {
    const online = () => listener(true)
    const offline = () => listener(false)
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }
}
