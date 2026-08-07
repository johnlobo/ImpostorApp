import type { Transaction } from 'dexie'

export interface PersistenceMigration {
  version: number
  stores: Record<string, string | null>
  upgrade?: (transaction: Transaction) => void | Promise<void>
}

export const persistenceMigrations: readonly PersistenceMigration[] = [
  {
    version: 1,
    stores: {
      metadata: '&id',
      recoverySnapshots: '&id, revision',
      'player-groups': '&key',
      'custom-categories': '&key',
      'used-concepts': '&key',
      preferences: '&key',
    },
  },
  {
    version: 2,
    stores: {
      metadata: '&id',
      recoverySnapshots: '&id, revision',
      'player-groups': '&key',
      'custom-categories': '&key',
      'used-concepts': '&key',
      preferences: '&key',
      'role-assignment-history': '&key',
    },
  },
]
