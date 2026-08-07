import { describe, expect, it, vi } from 'vitest'
import type { PersistenceGateway } from '../../src/domain/ports/platform'
import { createPlayerGroupsRepository } from '../../src/infrastructure/persistence/playerGroupsRepository'

const group = {
  id: 'friends',
  schemaVersion: 1 as const,
  name: 'Amigos',
  players: [
    { name: 'Ana', position: 0 },
    { name: 'Bruno', position: 1 },
    { name: 'Carla', position: 2 },
  ],
  createdAt: '2026-08-07T00:00:00.000Z',
  updatedAt: '2026-08-07T00:00:00.000Z',
}

function gateway(records: readonly unknown[] = []): PersistenceGateway {
  return {
    initialize: vi.fn(),
    loadRecoverySnapshot: vi.fn(),
    commitRecoverySnapshot: vi.fn(),
    readCollection: vi.fn().mockResolvedValue({ ok: true, value: records }),
    commitCollectionChange: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
    clearAllData: vi.fn(),
  }
}

describe('player groups repository', () => {
  it('lists valid groups in Spanish name order', async () => {
    const repository = createPlayerGroupsRepository(
      gateway([{ ...group, id: 'z', name: 'Zeta' }, group]),
    )
    const result = await repository.list()
    expect(result.ok && result.value.map(({ name }) => name)).toEqual(['Amigos', 'Zeta'])
  })

  it.each([
    { ...group, players: [] },
    {
      ...group,
      players: [
        { name: 'Ana', position: 0 },
        { name: ' ana ', position: 1 },
        { name: 'Carla', position: 2 },
      ],
    },
    { ...group, name: ' Amigos ' },
  ])('rejects malformed persisted data as incompatible', async (record) => {
    const repository = createPlayerGroupsRepository(gateway([record]))
    expect(await repository.list()).toEqual({
      ok: false,
      error: { code: 'incompatible-data', retryable: false },
    })
  })

  it('writes and deletes through the existing collection contract', async () => {
    const persistence = gateway()
    const repository = createPlayerGroupsRepository(persistence)
    expect(await repository.save(group)).toEqual({ ok: true, value: group })
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(persistence.commitCollectionChange).toHaveBeenCalledWith('player-groups', {
      operation: 'put',
      key: 'friends',
      value: group,
    })
    await repository.delete('friends')
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(persistence.commitCollectionChange).toHaveBeenCalledWith('player-groups', {
      operation: 'delete',
      key: 'friends',
    })
  })
})
