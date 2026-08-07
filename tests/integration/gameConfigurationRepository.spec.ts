/* eslint-disable @typescript-eslint/unbound-method */
import { describe, expect, it, vi } from 'vitest'

import {
  GAME_CONFIGURATION_SCHEMA_VERSION,
  type PreparedGame,
} from '../../src/domain/entities/gameConfiguration'
import type { PersistenceGateway } from '../../src/domain/ports/platform'
import { createGameConfigurationRepository } from '../../src/infrastructure/persistence/gameConfigurationRepository'

function preparedGame(): PreparedGame {
  return {
    schemaVersion: GAME_CONFIGURATION_SCHEMA_VERSION,
    id: 'game-1',
    roster: {
      players: [
        { id: 'ana', name: 'Ana', position: 0 },
        { id: 'bruno', name: 'Bruno', position: 1 },
        { id: 'carla', name: 'Carla', position: 2 },
      ],
    },
    rules: {
      rounds: 3,
      impostorCount: 1,
      conversation: { mode: 'free' },
      turnOrder: 'roster',
      voting: 'verbal',
      finalAttempt: false,
      allocation: 'random',
      impostorAwareness: 'unknown',
      elimination: 'single',
    },
    createdAt: '2026-08-07T10:00:00.000Z',
  }
}

function persistence(): PersistenceGateway {
  return {
    initialize: vi.fn(),
    loadRecoverySnapshot: vi.fn(),
    commitRecoverySnapshot: vi.fn(),
    readCollection: vi.fn(),
    commitCollectionChange: vi.fn(),
    clearAllData: vi.fn(),
  }
}

describe('game configuration repository', () => {
  it('persists a configured recovery snapshot using the expected revision', async () => {
    const gateway = persistence()
    const game = preparedGame()
    vi.mocked(gateway.commitRecoverySnapshot).mockImplementation((_expected, snapshot) =>
      Promise.resolve({ ok: true, value: snapshot }),
    )
    const repository = createGameConfigurationRepository(gateway, () => '2026-08-07T10:01:00.000Z')

    await expect(repository.save(game, 4)).resolves.toEqual({
      ok: true,
      value: { game, revision: 5 },
    })
    expect(gateway.commitRecoverySnapshot).toHaveBeenCalledWith(4, {
      id: 'active-game',
      schemaVersion: GAME_CONFIGURATION_SCHEMA_VERSION,
      revision: 5,
      savedAt: '2026-08-07T10:01:00.000Z',
      phase: 'configured',
      payload: game,
      integrity: 'confirmed',
    })
  })

  it('loads and validates a confirmed configured snapshot', async () => {
    const gateway = persistence()
    const game = preparedGame()
    vi.mocked(gateway.loadRecoverySnapshot).mockResolvedValue({
      ok: true,
      value: {
        id: 'active-game',
        schemaVersion: GAME_CONFIGURATION_SCHEMA_VERSION,
        revision: 2,
        savedAt: '2026-08-07T10:01:00.000Z',
        phase: 'configured',
        payload: game,
        integrity: 'confirmed',
      },
    })

    await expect(createGameConfigurationRepository(gateway).load()).resolves.toEqual({
      ok: true,
      value: { game, revision: 2 },
    })
  })

  it('returns null when there is no recovery snapshot', async () => {
    const gateway = persistence()
    vi.mocked(gateway.loadRecoverySnapshot).mockResolvedValue({ ok: true, value: null })

    await expect(createGameConfigurationRepository(gateway).load()).resolves.toEqual({
      ok: true,
      value: null,
    })
  })

  it.each([
    { phase: 'playing' },
    { schemaVersion: GAME_CONFIGURATION_SCHEMA_VERSION + 1 },
    { payload: { ...preparedGame(), schemaVersion: 99 } },
    { revision: 0 },
  ])('rejects an incompatible configured snapshot: %o', async (override) => {
    const gateway = persistence()
    vi.mocked(gateway.loadRecoverySnapshot).mockResolvedValue({
      ok: true,
      value: {
        id: 'active-game',
        schemaVersion: GAME_CONFIGURATION_SCHEMA_VERSION,
        revision: 1,
        savedAt: '2026-08-07T10:01:00.000Z',
        phase: 'configured',
        payload: preparedGame(),
        integrity: 'confirmed',
        ...override,
      },
    })

    await expect(createGameConfigurationRepository(gateway).load()).resolves.toEqual({
      ok: false,
      error: { code: 'incompatible-data', retryable: false },
    })
  })

  it('preserves a revision-conflict result without presenting the game as saved', async () => {
    const gateway = persistence()
    vi.mocked(gateway.commitRecoverySnapshot).mockResolvedValue({
      ok: false,
      error: { code: 'revision-conflict', retryable: true },
    })

    await expect(
      createGameConfigurationRepository(gateway).save(preparedGame(), 3),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'revision-conflict', retryable: true },
    })
  })

  it('rejects invalid input without invoking persistence', async () => {
    const gateway = persistence()
    const invalid = { ...preparedGame(), rules: { ...preparedGame().rules, rounds: 11 } }

    await expect(
      createGameConfigurationRepository(gateway).save(invalid as PreparedGame, 0),
    ).resolves.toEqual({
      ok: false,
      error: { code: 'incompatible-data', retryable: false },
    })
    expect(gateway.commitRecoverySnapshot).not.toHaveBeenCalled()
  })
})
