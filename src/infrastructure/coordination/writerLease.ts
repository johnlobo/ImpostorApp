import type { WriterLease } from '../../domain/entities/platform'
import type { Clock, WriterCoordinator } from '../../domain/ports/platform'

export interface StoredWriterLease {
  instanceId: string
  acquiredAt: number
  heartbeatAt: number
}

export interface WriterLeaseStore {
  read(): Promise<StoredWriterLease | null>
  claim(candidate: StoredWriterLease, expiredBefore: number): Promise<boolean>
  renew(instanceId: string, heartbeatAt: number): Promise<boolean>
  release(instanceId: string): Promise<void>
}

export interface WriterLeaseCoordinatorOptions {
  instanceId: string
  store: WriterLeaseStore
  clock: Clock
  leaseTimeoutMs: number
}

export interface HeartbeatWriterCoordinator extends WriterCoordinator {
  heartbeat(): Promise<boolean>
}

export function createWriterLeaseCoordinator({
  instanceId,
  store,
  clock,
  leaseTimeoutMs,
}: WriterLeaseCoordinatorOptions): HeartbeatWriterCoordinator {
  if (leaseTimeoutMs <= 0) {
    throw new RangeError('leaseTimeoutMs must be greater than zero')
  }

  let lease: WriterLease = observerLease(instanceId, clock.now())

  return {
    async acquire(): Promise<WriterLease> {
      const now = clock.now()
      const candidate: StoredWriterLease = {
        instanceId,
        acquiredAt: now,
        heartbeatAt: now,
      }
      const acquired = await store.claim(candidate, now - leaseTimeoutMs)

      lease = acquired ? { ...candidate, mode: 'writer' } : observerLease(instanceId, now)
      return lease
    },

    current(): WriterLease {
      return lease
    },

    async heartbeat(): Promise<boolean> {
      if (lease.mode !== 'writer') {
        return false
      }

      const heartbeatAt = clock.now()
      const renewed = await store.renew(instanceId, heartbeatAt)

      if (renewed) {
        lease = { ...lease, heartbeatAt }
      } else {
        lease = { ...lease, mode: 'observer' }
      }

      return renewed
    },

    async release(): Promise<void> {
      if (lease.mode === 'writer') {
        await store.release(instanceId)
      }

      lease = { ...lease, mode: 'observer' }
    },
  }
}

function observerLease(instanceId: string, now: number): WriterLease {
  return {
    instanceId,
    acquiredAt: now,
    heartbeatAt: now,
    mode: 'observer',
  }
}
