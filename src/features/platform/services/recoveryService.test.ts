import { describe, expect, it, vi } from 'vitest'

import type { PersistenceGateway, WriterCoordinator } from '../../../domain/ports/platform'
import { recoverySnapshot, writerLease } from '../../../../tests/fixtures/platform'
import { createRecoveryService } from './recoveryService'

function dependencies(
  options: {
    observer?: boolean
    initializationError?: 'storage-full' | 'storage-unavailable' | 'incompatible-data'
  } = {},
) {
  const acquire = vi
    .fn()
    .mockResolvedValue(writerLease({ mode: options.observer ? 'observer' : 'writer' }))
  const clearAllData = vi.fn().mockResolvedValue({ ok: true, value: undefined })
  const persistence = {
    initialize: vi.fn().mockResolvedValue(
      options.initializationError
        ? {
            ok: false,
            error: {
              code: options.initializationError,
              retryable: options.initializationError !== 'incompatible-data',
            },
          }
        : { ok: true, value: 'ready' },
    ),
    loadRecoverySnapshot: vi.fn().mockResolvedValue({ ok: true, value: recoverySnapshot() }),
    clearAllData,
  } as unknown as PersistenceGateway
  const writer = {
    acquire,
  } as unknown as WriterCoordinator
  const marker = {
    getItem: vi.fn().mockReturnValue(null),
    setItem: vi.fn(),
  }
  return { persistence, writer, marker, acquire, clearAllData }
}

describe('recovery service', () => {
  it('exposes the last confirmed snapshot for the writer', async () => {
    const service = createRecoveryService(dependencies())
    await service.initialize()
    expect(service.getState()).toEqual({ status: 'ready', snapshot: recoverySnapshot() })
  })

  it('exposes the same snapshot without write access for an observer', async () => {
    const service = createRecoveryService(dependencies({ observer: true }))
    await service.initialize()
    expect(service.getState()).toEqual({ status: 'observer', snapshot: recoverySnapshot() })
  })

  it.each(['storage-full', 'storage-unavailable'] as const)(
    'exposes %s as a retryable error',
    async (code) => {
      const service = createRecoveryService(dependencies({ initializationError: code }))
      await service.initialize()
      expect(service.getState()).toEqual({ status: 'error', error: { code, retryable: true } })
    },
  )

  it('preserves an incompatible database without trying to acquire the writer lease', async () => {
    const deps = dependencies({ initializationError: 'incompatible-data' })
    const service = createRecoveryService(deps)
    await service.initialize()
    expect(service.getState()).toEqual({
      status: 'safe-read-only',
      error: { code: 'incompatible-data', retryable: false },
    })
    expect(deps.acquire).not.toHaveBeenCalled()
  })

  it('clears data after literal confirmation from a writer-ready state', async () => {
    const deps = dependencies()
    const service = createRecoveryService(deps)
    await service.initialize()
    await service.clearAllData({ confirmed: true })
    expect(deps.clearAllData).toHaveBeenCalledWith({ confirmed: true })
    expect(service.getState()).toEqual({ status: 'cleared' })
  })

  it('reports storage-unavailable when a previously recovered snapshot disappears', async () => {
    const deps = dependencies()
    deps.persistence.loadRecoverySnapshot = vi.fn().mockResolvedValue({ ok: true, value: null })
    deps.marker.getItem.mockReturnValue('snapshot')
    const service = createRecoveryService(deps)

    await service.initialize()

    expect(service.getState()).toEqual({
      status: 'error',
      error: { code: 'storage-unavailable', retryable: true },
    })
    expect(deps.acquire).not.toHaveBeenCalled()
  })
})
