import { describe, expect, it } from 'vitest'
import { BrowserWriterLeaseStore } from './browserWriterLeaseStore'

describe('BrowserWriterLeaseStore', () => {
  it('fails closed when Web Locks cannot prove exclusive ownership', async () => {
    const descriptor = Object.getOwnPropertyDescriptor(navigator, 'locks')
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })
    const store = new BrowserWriterLeaseStore()

    await expect(
      store.claim({ instanceId: 'tab-a', acquiredAt: 1, heartbeatAt: 1 }, 0),
    ).resolves.toBe(false)

    if (descriptor) Object.defineProperty(navigator, 'locks', descriptor)
  })
})
