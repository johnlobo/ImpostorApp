import { describe, expect, it, vi } from 'vitest'
import { createUpdateCoordinator } from './updateCoordinator'

function createHarness(
  overrides: {
    gameActive?: boolean
    durableStateConfirmed?: boolean
    activationError?: Error
  } = {},
) {
  let gameActive = overrides.gameActive ?? false
  let durableStateConfirmed = overrides.durableStateConfirmed ?? true
  const activateUpdate = overrides.activationError
    ? vi.fn<() => Promise<void>>().mockRejectedValue(overrides.activationError)
    : vi.fn<() => Promise<void>>().mockResolvedValue(undefined)

  const coordinator = createUpdateCoordinator({
    isGameActive: () => gameActive,
    isDurableStateConfirmed: () => Promise.resolve(durableStateConfirmed),
    activateUpdate,
  })

  return {
    coordinator,
    activateUpdate,
    setGameActive: (value: boolean) => {
      gameActive = value
    },
    setDurableStateConfirmed: (value: boolean) => {
      durableStateConfirmed = value
    },
  }
}

describe('update coordinator', () => {
  it('publishes a complete update without applying it automatically', () => {
    const { coordinator, activateUpdate } = createHarness()

    coordinator.updateAvailable('2.0.0')

    expect(coordinator.getState()).toEqual({
      status: 'available',
      version: '2.0.0',
      canApply: true,
      blockedBy: null,
    })
    expect(activateUpdate).not.toHaveBeenCalled()
  })

  it('defers an update while a game is active and keeps the running version untouched', async () => {
    const { coordinator, activateUpdate } = createHarness({ gameActive: true })

    coordinator.updateAvailable('2.0.0')

    expect(coordinator.getState()).toEqual({
      status: 'available',
      version: '2.0.0',
      canApply: false,
      blockedBy: 'active-game',
    })
    await expect(coordinator.applyUpdate()).resolves.toBe(false)
    expect(activateUpdate).not.toHaveBeenCalled()
  })

  it('rechecks the active game at the safe point before activating', async () => {
    const { coordinator, activateUpdate, setGameActive } = createHarness()
    coordinator.updateAvailable('2.0.0')
    setGameActive(true)

    await expect(coordinator.applyUpdate()).resolves.toBe(false)

    expect(coordinator.getState()).toMatchObject({
      status: 'available',
      canApply: false,
      blockedBy: 'active-game',
    })
    expect(activateUpdate).not.toHaveBeenCalled()
  })

  it('does not activate until the latest state is confirmed durable', async () => {
    const { coordinator, activateUpdate, setDurableStateConfirmed } = createHarness({
      durableStateConfirmed: false,
    })
    coordinator.updateAvailable('2.0.0')

    await expect(coordinator.applyUpdate()).resolves.toBe(false)

    expect(coordinator.getState()).toEqual({
      status: 'available',
      version: '2.0.0',
      canApply: false,
      blockedBy: 'unconfirmed-state',
    })
    expect(activateUpdate).not.toHaveBeenCalled()

    setDurableStateConfirmed(true)
    await expect(coordinator.applyUpdate()).resolves.toBe(true)
    expect(activateUpdate).toHaveBeenCalledOnce()
  })

  it('applies an update at most once when activation requests overlap', async () => {
    let finishActivation: (() => void) | undefined
    const activateUpdate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishActivation = resolve
        }),
    )
    const coordinator = createUpdateCoordinator({
      isGameActive: () => false,
      isDurableStateConfirmed: () => Promise.resolve(true),
      activateUpdate,
    })
    coordinator.updateAvailable('2.0.0')

    const first = coordinator.applyUpdate()
    const second = coordinator.applyUpdate()
    await vi.waitFor(() => expect(activateUpdate).toHaveBeenCalledOnce())
    expect(coordinator.getState()).toEqual({ status: 'applying', version: '2.0.0' })

    finishActivation?.()

    await expect(first).resolves.toBe(true)
    await expect(second).resolves.toBe(false)
    expect(activateUpdate).toHaveBeenCalledOnce()
  })

  it('exposes a retryable public failure and never leaks the activation error', async () => {
    const { coordinator } = createHarness({
      activationError: new Error('private service-worker details'),
    })
    coordinator.updateAvailable('2.0.0')

    await expect(coordinator.applyUpdate()).resolves.toBe(false)

    expect(coordinator.getState()).toEqual({
      status: 'failed',
      version: '2.0.0',
      error: { code: 'update-failed', retryable: true },
    })
    expect(JSON.stringify(coordinator.getState())).not.toContain('private service-worker details')
  })

  it('notifies subscribers when update state changes', () => {
    const { coordinator } = createHarness()
    const listener = vi.fn()
    const unsubscribe = coordinator.subscribe(listener)

    coordinator.updateAvailable('2.0.0')
    unsubscribe()
    coordinator.postpone()

    expect(listener).toHaveBeenCalledOnce()
    expect(listener).toHaveBeenCalledWith({
      status: 'available',
      version: '2.0.0',
      canApply: true,
      blockedBy: null,
    })
    expect(coordinator.getState()).toEqual({ status: 'idle' })
  })
})
