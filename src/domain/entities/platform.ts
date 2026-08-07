export type IsoTimestamp = string
export type SchemaVersion = number

export interface AppMetadata {
  id: 'app'
  schemaVersion: SchemaVersion
  appVersion: string
  createdAt: IsoTimestamp
  updatedAt: IsoTimestamp
  lastSuccessfulOpenAt: IsoTimestamp | null
}

export interface RecoverySnapshot<TPayload = unknown> {
  id: 'active-game'
  schemaVersion: SchemaVersion
  revision: number
  savedAt: IsoTimestamp
  phase: string
  payload: TPayload
  integrity: 'confirmed'
}

export interface PlayerGroupRecord<TPayload = unknown> {
  id: string
  schemaVersion: SchemaVersion
  name: string
  payload: TPayload
  updatedAt: IsoTimestamp
}

export interface CustomCategoryRecord<TPayload = unknown> {
  id: string
  schemaVersion: SchemaVersion
  adult: boolean
  payload: TPayload
  updatedAt: IsoTimestamp
}

export interface UsedConceptRecord {
  scopeId: string
  conceptId: string
  usedAt: IsoTimestamp
}

export interface UserPreferences {
  id: 'preferences'
  schemaVersion: SchemaVersion
  locale: string
  soundEnabled: boolean
  vibrationEnabled: boolean
  adultContentEnabled: boolean
  updatedAt: IsoTimestamp
}

export type PersistenceNamespace =
  'player-groups' | 'custom-categories' | 'used-concepts' | 'preferences'

export type PublicErrorCode =
  | 'first-load-required'
  | 'storage-unavailable'
  | 'storage-full'
  | 'incompatible-data'
  | 'migration-failed'
  | 'revision-conflict'
  | 'writer-unavailable'
  | 'content-exhausted'
  | 'update-failed'
  | 'unknown-storage-error'

export interface PublicPlatformError {
  code: PublicErrorCode
  retryable: boolean
}

export type OfflineLifecycleState =
  | { status: 'initializing' }
  | { status: 'online-not-ready' }
  | { status: 'offline-ready' }
  | { status: 'update-available'; version: string }
  | { status: 'applying-update'; version: string }
  | { status: 'degraded'; error: PublicPlatformError }
  | { status: 'fatal-safe'; error: PublicPlatformError }

export interface WriterLease {
  instanceId: string
  acquiredAt: number
  heartbeatAt: number
  mode: 'writer' | 'observer'
}

const publicErrorFields = new Set(['code', 'retryable'])

export function serializePublicError(error: PublicPlatformError): string {
  return JSON.stringify(
    Object.fromEntries(Object.entries(error).filter(([key]) => publicErrorFields.has(key))),
  )
}
