import type {
  AppMetadata,
  OfflineLifecycleState,
  RecoverySnapshot,
  UserPreferences,
  WriterLease,
} from '../../src/domain/entities/platform'

export const fixedNow = '2026-08-07T00:00:00.000Z'

export function appMetadata(overrides: Partial<AppMetadata> = {}): AppMetadata {
  return {
    id: 'app',
    schemaVersion: 1,
    appVersion: '0.1.0',
    createdAt: fixedNow,
    updatedAt: fixedNow,
    lastSuccessfulOpenAt: null,
    ...overrides,
  }
}

export function recoverySnapshot(overrides: Partial<RecoverySnapshot> = {}): RecoverySnapshot {
  return {
    id: 'active-game',
    schemaVersion: 1,
    revision: 0,
    savedAt: fixedNow,
    phase: 'setup',
    payload: { fixture: true },
    integrity: 'confirmed',
    ...overrides,
  }
}

export function preferences(overrides: Partial<UserPreferences> = {}): UserPreferences {
  return {
    id: 'preferences',
    schemaVersion: 1,
    locale: 'es',
    soundEnabled: true,
    vibrationEnabled: true,
    adultContentEnabled: false,
    updatedAt: fixedNow,
    ...overrides,
  }
}

export function writerLease(overrides: Partial<WriterLease> = {}): WriterLease {
  return {
    instanceId: 'fixture-instance',
    acquiredAt: 1,
    heartbeatAt: 1,
    mode: 'writer',
    ...overrides,
  }
}

export function lifecycleReady(): OfflineLifecycleState {
  return { status: 'offline-ready' }
}
