import { describe, expect, it } from 'vitest'
import type { Clock } from '../../src/domain/ports/platform'
import {
  createWriterLeaseCoordinator,
  type StoredWriterLease,
  type WriterLeaseStore,
} from '../../src/infrastructure/coordination/writerLease'

const leaseTimeoutMs = 10_000
const initialTime = 100_000

class MutableClock implements Clock {
  constructor(private timestamp = initialTime) {}

  now(): number {
    return this.timestamp
  }

  nowIso(): string {
    return new Date(this.timestamp).toISOString()
  }

  advance(milliseconds: number): void {
    this.timestamp += milliseconds
  }
}

class SharedWriterLeaseStore implements WriterLeaseStore {
  private lease: StoredWriterLease | null = null

  read(): Promise<StoredWriterLease | null> {
    return Promise.resolve(this.lease === null ? null : { ...this.lease })
  }

  claim(candidate: StoredWriterLease, expiredBefore: number): Promise<boolean> {
    if (this.lease !== null && this.lease.heartbeatAt >= expiredBefore) {
      return Promise.resolve(false)
    }

    this.lease = { ...candidate }
    return Promise.resolve(true)
  }

  renew(instanceId: string, heartbeatAt: number): Promise<boolean> {
    if (this.lease?.instanceId !== instanceId) {
      return Promise.resolve(false)
    }

    this.lease = { ...this.lease, heartbeatAt }
    return Promise.resolve(true)
  }

  release(instanceId: string): Promise<void> {
    if (this.lease?.instanceId === instanceId) {
      this.lease = null
    }

    return Promise.resolve()
  }
}

function coordinator(instanceId: string, store: WriterLeaseStore, clock: Clock) {
  return createWriterLeaseCoordinator({
    instanceId,
    store,
    clock,
    leaseTimeoutMs,
  })
}

describe('multi-tab writer coordination', () => {
  it('grants one writer and leaves a concurrent tab in observer mode', async () => {
    const clock = new MutableClock()
    const store = new SharedWriterLeaseStore()
    const firstTab = coordinator('tab-a', store, clock)
    const secondTab = coordinator('tab-b', store, clock)

    const [firstLease, secondLease] = await Promise.all([firstTab.acquire(), secondTab.acquire()])

    expect([firstLease.mode, secondLease.mode].sort()).toEqual(['observer', 'writer'])
    expect(firstTab.current().mode === 'writer' || secondTab.current().mode === 'writer').toBe(true)
  })

  it('keeps an observer read-only while the owner renews its heartbeat', async () => {
    const clock = new MutableClock()
    const store = new SharedWriterLeaseStore()
    const writer = coordinator('tab-a', store, clock)
    const observer = coordinator('tab-b', store, clock)

    expect((await writer.acquire()).mode).toBe('writer')
    clock.advance(leaseTimeoutMs - 1)
    expect(await writer.heartbeat()).toBe(true)
    clock.advance(2)

    expect((await observer.acquire()).mode).toBe('observer')
    expect(observer.current()).toMatchObject({ instanceId: 'tab-b', mode: 'observer' })
  })

  it('hands writing permission to an observer after the owner releases it', async () => {
    const clock = new MutableClock()
    const store = new SharedWriterLeaseStore()
    const firstTab = coordinator('tab-a', store, clock)
    const secondTab = coordinator('tab-b', store, clock)

    expect((await firstTab.acquire()).mode).toBe('writer')
    expect((await secondTab.acquire()).mode).toBe('observer')

    await firstTab.release()

    expect(firstTab.current().mode).toBe('observer')
    expect((await secondTab.acquire()).mode).toBe('writer')
  })

  it('takes over only after the previous heartbeat is provably expired', async () => {
    const clock = new MutableClock()
    const store = new SharedWriterLeaseStore()
    const firstTab = coordinator('tab-a', store, clock)
    const secondTab = coordinator('tab-b', store, clock)

    expect((await firstTab.acquire()).mode).toBe('writer')

    clock.advance(leaseTimeoutMs)
    expect((await secondTab.acquire()).mode).toBe('observer')

    clock.advance(1)
    expect((await secondTab.acquire()).mode).toBe('writer')
  })

  it('demotes a writer when it can no longer renew ownership', async () => {
    const clock = new MutableClock()
    const store = new SharedWriterLeaseStore()
    const formerWriter = coordinator('tab-a', store, clock)
    const nextWriter = coordinator('tab-b', store, clock)

    expect((await formerWriter.acquire()).mode).toBe('writer')
    clock.advance(leaseTimeoutMs + 1)
    expect((await nextWriter.acquire()).mode).toBe('writer')

    expect(await formerWriter.heartbeat()).toBe(false)
    expect(formerWriter.current().mode).toBe('observer')
  })
})
