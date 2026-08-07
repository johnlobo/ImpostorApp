import type { StoredWriterLease, WriterLeaseStore } from './writerLease'

const leaseKey = 'impostorapp:writer-lease'
const lockName = 'impostorapp:writer-lease-operation'

export class BrowserWriterLeaseStore implements WriterLeaseStore {
  read(): Promise<StoredWriterLease | null> {
    const value = localStorage.getItem(leaseKey)
    if (!value) return Promise.resolve(null)
    try {
      return Promise.resolve(JSON.parse(value) as StoredWriterLease)
    } catch {
      return Promise.resolve(null)
    }
  }

  claim(candidate: StoredWriterLease, expiredBefore: number): Promise<boolean> {
    if (!navigator.locks) return Promise.resolve(false)
    return this.exclusive(async () => {
      const current = await this.read()
      if (
        current &&
        current.instanceId !== candidate.instanceId &&
        current.heartbeatAt >= expiredBefore
      ) {
        return false
      }
      localStorage.setItem(leaseKey, JSON.stringify(candidate))
      return true
    })
  }

  renew(instanceId: string, heartbeatAt: number): Promise<boolean> {
    if (!navigator.locks) return Promise.resolve(false)
    return this.exclusive(async () => {
      const current = await this.read()
      if (!current || current.instanceId !== instanceId) return false
      localStorage.setItem(leaseKey, JSON.stringify({ ...current, heartbeatAt }))
      return true
    })
  }

  release(instanceId: string): Promise<void> {
    return this.exclusive(() => {
      this.releaseImmediately(instanceId)
      return Promise.resolve()
    })
  }

  releaseImmediately(instanceId: string): void {
    const value = localStorage.getItem(leaseKey)
    if (!value) return
    try {
      const current = JSON.parse(value) as StoredWriterLease
      if (current.instanceId === instanceId) localStorage.removeItem(leaseKey)
    } catch {
      localStorage.removeItem(leaseKey)
    }
  }

  private exclusive<T>(operation: () => Promise<T>): Promise<T> {
    return navigator.locks.request(lockName, async () => await operation()) as Promise<T>
  }
}
