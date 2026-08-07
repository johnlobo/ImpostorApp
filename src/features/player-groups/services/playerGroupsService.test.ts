import { describe, expect, it, vi } from 'vitest'
import type { SavedPlayerGroup } from '../../../domain/entities/playerGroup'
import type { PlayerGroupsRepository } from '../../../domain/ports/playerGroups'
import { createPlayerGroupsService } from './playerGroupsService'

function setup(groups: readonly SavedPlayerGroup[] = []) {
  let id = 0
  const save = vi.fn<PlayerGroupsRepository['save']>()
  save.mockImplementation((group: SavedPlayerGroup) => Promise.resolve({ ok: true, value: group }))
  const repository: PlayerGroupsRepository = {
    list: vi.fn().mockResolvedValue({ ok: true, value: groups }),
    save,
    delete: vi.fn().mockResolvedValue({ ok: true, value: undefined }),
  }
  const service = createPlayerGroupsService({
    repository,
    createId: () => `id-${++id}`,
    nowIso: () => '2026-08-07T00:00:00.000Z',
  })
  return { service, repository, save }
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
