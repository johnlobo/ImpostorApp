import { describe, expect, it } from 'vitest'
import type { OfflineLifecycleState } from '../../../domain/entities/platform'
import { transitionOfflineLifecycle } from './offlineLifecycle'

describe('offline lifecycle transitions', () => {
  it('requires the first online preparation when resources are not ready', () => {
    const initial: OfflineLifecycleState = { status: 'initializing' }

    expect(
      transitionOfflineLifecycle(initial, {
        type: 'PREPARATION_REQUIRED',
        online: true,
      }),
    ).toEqual({ status: 'online-not-ready' })
  })

  it('reports offline-ready only after preparation completes', () => {
    const initial: OfflineLifecycleState = { status: 'initializing' }

    expect(transitionOfflineLifecycle(initial, { type: 'OFFLINE_READY' })).toEqual({
      status: 'offline-ready',
    })
  })

  it('enters degraded mode when a recoverable platform guarantee fails', () => {
    const initial: OfflineLifecycleState = { status: 'initializing' }

    expect(
      transitionOfflineLifecycle(initial, {
        type: 'PREPARATION_FAILED',
        error: { code: 'storage-unavailable', retryable: true },
      }),
    ).toEqual({
      status: 'degraded',
      error: { code: 'storage-unavailable', retryable: true },
    })
  })

  it('does not interrupt a prepared app when connectivity changes', () => {
    const ready: OfflineLifecycleState = { status: 'offline-ready' }

    expect(
      transitionOfflineLifecycle(ready, {
        type: 'CONNECTIVITY_CHANGED',
        online: false,
      }),
    ).toEqual(ready)

    expect(
      transitionOfflineLifecycle(ready, {
        type: 'CONNECTIVITY_CHANGED',
        online: true,
      }),
    ).toEqual(ready)
  })

  it.each<OfflineLifecycleState>([
    { status: 'online-not-ready' },
    {
      status: 'degraded',
      error: { code: 'first-load-required', retryable: true },
    },
  ])('returns a retryable state to initialization from $status', (state) => {
    expect(transitionOfflineLifecycle(state, { type: 'RETRY_REQUESTED' })).toEqual({
      status: 'initializing',
    })
  })

  it('ignores retry requests for non-retryable degraded failures', () => {
    const degraded: OfflineLifecycleState = {
      status: 'degraded',
      error: { code: 'incompatible-data', retryable: false },
    }

    expect(transitionOfflineLifecycle(degraded, { type: 'RETRY_REQUESTED' })).toEqual(degraded)
  })
})
