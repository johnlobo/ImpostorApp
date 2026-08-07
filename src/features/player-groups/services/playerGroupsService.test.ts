import { describe, expect, it, vi } from 'vitest'
import type { SavedPlayerGroup } from '../../../domain/entities/playerGroup'
import type { PlayerGroupsRepository } from '../../../domain/ports/playerGroups'
import { createPlayerGroupsService } from './playerGroupsService'

const savedGroup: SavedPlayerGroup = {
  id: 'friends',
  schemaVersion: 1,
  name: 'Amigos',
  players: [
    { name: 'Ana', position: 0 },
    { name: 'Bruno', position: 1 },
    { name: 'Carla', position: 2 },
  ],
  createdAt: '2026-08-07T00:00:00.000Z',
  updatedAt: '2026-08-07T00:00:00.000Z',
}

function setup(groups: readonly SavedPlayerGroup[] = []) {
  let id = 0
  const save = vi.fn<PlayerGroupsRepository['save']>()
  save.mockImplementation((group: SavedPlayerGroup) => Promise.resolve({ ok: true, value: group }))
  const remove = vi.fn<PlayerGroupsRepository['delete']>()
  remove.mockResolvedValue({ ok: true, value: undefined })
  const repository: PlayerGroupsRepository = {
    list: vi.fn().mockResolvedValue({ ok: true, value: groups }),
    save,
    delete: remove,
  }
  const service = createPlayerGroupsService({
    repository,
    createId: () => `id-${++id}`,
    nowIso: () => '2026-08-07T00:00:00.000Z',
  })
  return { service, repository, save, remove }
}

describe('player groups service', () => {
  it('initializes, edits, and prepares a valid roster', async () => {
    const { service } = setup()
    await service.initialize()
    for (const name of ['Ana', 'Bruno', 'Carla']) service.apply({ type: 'add', name })
    service.prepare()
    expect(service.getState()).toMatchObject({
      status: 'ready',
      prepared: { players: [{ name: 'Ana' }, { name: 'Bruno' }, { name: 'Carla' }] },
    })
  })

  it('keeps the last valid draft when a duplicate is attempted', async () => {
    const { service } = setup()
    await service.initialize()
    service.apply({ type: 'add', name: 'Ana' })
    service.apply({ type: 'add', name: ' ana ' })
    expect(service.getState().draft.players.map(({ name }) => name)).toEqual(['Ana'])
    expect(service.getState().issues).toEqual(['duplicate-name'])
  })

  it('saves and reloads a group with fresh active identities', async () => {
    const { service, save } = setup()
    await service.initialize()
    for (const name of ['Ana', 'Bruno', 'Carla']) service.apply({ type: 'add', name })
    await service.saveGroup('Amigos')
    expect(service.getState()).toMatchObject({ status: 'ready', groups: [{ name: 'Amigos' }] })
    expect(save).toHaveBeenCalledOnce()
    const before = service.getState().draft.players.map(({ id }) => id)
    service.loadGroup(service.getState().groups[0]!.id)
    expect(service.getState().draft.players.map(({ id }) => id)).not.toEqual(before)
  })

  it('preserves the active draft on storage failure', async () => {
    const { service, save } = setup()
    save.mockResolvedValueOnce({
      ok: false,
      error: { code: 'storage-full', retryable: true },
    })
    await service.initialize()
    for (const name of ['Ana', 'Bruno', 'Carla']) service.apply({ type: 'add', name })
    await service.saveGroup('Amigos')
    expect(service.getState()).toMatchObject({
      status: 'error',
      draft: { players: [{ name: 'Ana' }, { name: 'Bruno' }, { name: 'Carla' }] },
      storageError: { code: 'storage-full' },
    })
  })

  it('retries the failed save with its original input', async () => {
    const { service, save } = setup()
    save.mockResolvedValueOnce({
      ok: false,
      error: { code: 'storage-full', retryable: true },
    })
    await service.initialize()
    for (const name of ['Ana', 'Bruno', 'Carla']) service.apply({ type: 'add', name })
    await service.saveGroup('Amigos')
    await service.retry()
    expect(save).toHaveBeenCalledTimes(2)
    expect(save.mock.calls[1]?.[0].name).toBe('Amigos')
    expect(service.getState()).toMatchObject({ status: 'ready', storageError: null })
  })

  it('retries the exact failed deletion', async () => {
    const { service, remove } = setup([savedGroup])
    remove
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'revision-conflict', retryable: true },
      })
      .mockResolvedValueOnce({ ok: true, value: undefined })
    await service.initialize()
    await service.deleteGroup(savedGroup.id)
    await service.retry()
    expect(remove).toHaveBeenCalledTimes(2)
    expect(remove).toHaveBeenLastCalledWith(savedGroup.id)
    expect(service.getState().groups).toEqual([])
  })

  it('does not delete the active draft when a group is deleted', async () => {
    const { service } = setup()
    await service.initialize()
    for (const name of ['Ana', 'Bruno', 'Carla']) service.apply({ type: 'add', name })
    await service.saveGroup('Amigos')
    const groupId = service.getState().groups[0]!.id
    await service.deleteGroup(groupId)
    expect(service.getState().groups).toEqual([])
    expect(service.getState().draft.players.map(({ name }) => name)).toEqual([
      'Ana',
      'Bruno',
      'Carla',
    ])
  })
})
