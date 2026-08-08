import type { RoundHandoff } from '../entities/secretRoleAssignment'
import type {
  CluePhaseHandoff,
  NextCluePhaseRequest,
  PublicRoundSession,
} from '../entities/roundSession'
import type { StorageResult } from './platform'

export interface StoredPublicRoundSession {
  readonly session: PublicRoundSession | null
  readonly revision: number
}

export interface RoundSessionRepository {
  load(): Promise<StorageResult<StoredPublicRoundSession | null>>
  prepareInitial(
    handoff: RoundHandoff,
    expectedRevision: number,
    random: () => number,
  ): Promise<StorageResult<StoredPublicRoundSession>>
  prepareNext(
    request: NextCluePhaseRequest,
    expectedRevision: number,
    random: () => number,
  ): Promise<StorageResult<StoredPublicRoundSession>>
  begin(expectedRevision: number): Promise<StorageResult<StoredPublicRoundSession>>
  advanceClueTurn(
    expectedRevision: number,
    expectedTurnIndex: number,
  ): Promise<StorageResult<StoredPublicRoundSession>>
  pause(expectedRevision: number): Promise<StorageResult<StoredPublicRoundSession>>
  resume(expectedRevision: number): Promise<StorageResult<StoredPublicRoundSession>>
  close(
    expectedRevision: number,
    confirmation: { readonly confirmed: true },
  ): Promise<
    StorageResult<{
      readonly stored: StoredPublicRoundSession
      readonly handoff: CluePhaseHandoff
    }>
  >
}
