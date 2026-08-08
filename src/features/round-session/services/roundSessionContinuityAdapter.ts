import type { PublicRoundSession } from '../../../domain/entities/roundSession'
import type { RoundSessionRepository } from '../../../domain/ports/roundSession'
import type { StorageResult } from '../../../domain/ports/platform'

export interface ContinuityCapability {
  readonly feature: 'clues'
  readonly canPause: boolean
  readonly canAbandon: boolean
  readonly isPrivateSurface: false
}

export interface SafeResumeSummary {
  readonly schemaVersion: 1
  readonly gameId: string
  readonly roundNumber: number
  readonly totalRounds: number
  readonly participantNames: readonly string[]
  readonly phase: 'clues'
  readonly updatedAt: string
}

export interface SafeResumeRoute {
  readonly feature: 'clues'
  readonly surface: 'shared-phase'
  readonly gameId: string
}

export interface GamePauseRequest {
  readonly gameId: string
  readonly expectedRevision: number
  readonly confirmedAt: string
}

export type PauseForHomeResult =
  | { readonly status: 'paused'; readonly route: SafeResumeRoute; readonly revision: number }
  | { readonly status: 'already-safe'; readonly route: SafeResumeRoute; readonly revision: number }

export interface PublicRoundSessionContinuityAdapter {
  readonly feature: 'clues'
  capability(): ContinuityCapability
  summarize(): Promise<StorageResult<SafeResumeSummary>>
  safeResumeRoute(): Promise<StorageResult<SafeResumeRoute>>
  pauseForHome(request: GamePauseRequest): Promise<StorageResult<PauseForHomeResult>>
}

const incompatible = {
  ok: false,
  error: { code: 'incompatible-data', retryable: false },
} as const

function route(session: PublicRoundSession): SafeResumeRoute {
  return {
    feature: 'clues',
    surface: 'shared-phase',
    gameId: session.preparedRound.identity.gameId,
  }
}

export function createRoundSessionContinuityAdapter(
  repository: RoundSessionRepository,
  readOnly = false,
): PublicRoundSessionContinuityAdapter {
  return {
    feature: 'clues',
    capability: () => ({
      feature: 'clues',
      canPause: !readOnly,
      canAbandon: !readOnly,
      isPrivateSurface: false,
    }),
    async summarize() {
      const loaded = await repository.load()
      if (!loaded.ok) return loaded
      const session = loaded.value?.session
      if (!session) return incompatible
      return {
        ok: true,
        value: {
          schemaVersion: 1,
          gameId: session.preparedRound.identity.gameId,
          roundNumber: session.preparedRound.identity.roundNumber,
          totalRounds: session.preparedRound.totalRounds,
          participantNames: session.preparedRound.roster.players.map(({ name }) => name),
          phase: 'clues',
          updatedAt: session.activePhase.updatedAt,
        },
      }
    },
    async safeResumeRoute() {
      const loaded = await repository.load()
      if (!loaded.ok) return loaded
      if (!loaded.value?.session) return incompatible
      return { ok: true, value: route(loaded.value.session) }
    },
    async pauseForHome(request) {
      if (readOnly) {
        return { ok: false, error: { code: 'writer-unavailable', retryable: true } }
      }
      const loaded = await repository.load()
      if (!loaded.ok) return loaded
      const stored = loaded.value
      if (!stored?.session || stored.session.preparedRound.identity.gameId !== request.gameId)
        return incompatible
      if (stored.revision !== request.expectedRevision) {
        return { ok: false, error: { code: 'revision-conflict', retryable: true } }
      }
      if (stored.session.activePhase.clock.status !== 'running') {
        return {
          ok: true,
          value: {
            status: 'already-safe',
            route: route(stored.session),
            revision: stored.revision,
          },
        }
      }
      const paused = await repository.pause(stored.revision)
      if (!paused.ok) return paused
      if (!paused.value.session) return incompatible
      return {
        ok: true,
        value: {
          status: 'paused',
          route: route(paused.value.session),
          revision: paused.value.revision,
        },
      }
    },
  }
}
