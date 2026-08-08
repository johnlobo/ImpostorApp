# Contract: Round session, clues and timer

## Public domain contracts

```ts
// Reused, not redefined:
import type { PreparedRoster } from 'src/domain/entities/playerGroup'
import type {
  ConversationRule,
  EliminationRule,
  TurnOrder,
  VotingRule,
} from 'src/domain/entities/gameConfiguration'
import type { RoundHandoff } from 'src/domain/entities/secretRoleAssignment'

interface PhaseIdentity {
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
}

interface PreparedRound {
  readonly schemaVersion: 1
  readonly identity: Pick<PhaseIdentity, 'gameId' | 'roundNumber'>
  readonly totalRounds: number
  readonly roster: PreparedRoster
  readonly conversation: ConversationRule
  readonly turnOrder: TurnOrder
  readonly voting: VotingRule
  readonly elimination: EliminationRule
  readonly preparedAt: string
}

type TurnSequence =
  | { readonly mode: 'free' }
  | {
      readonly mode: 'roster' | 'random'
      readonly playerIds: readonly string[]
      readonly startingPlayerId: string
    }

type ConversationClock =
  | { readonly status: 'ready'; readonly mode: 'untimed' }
  | {
      readonly status: 'ready'
      readonly mode: 'timed'
      readonly durationSeconds: number
    }
  | { readonly status: 'untimed'; readonly startedAt: string }
  | {
      readonly status: 'running'
      readonly durationSeconds: number
      readonly deadlineAt: string
      readonly confirmedAt: string
      readonly maximumRemainingSeconds: number
    }
  | {
      readonly status: 'paused'
      readonly durationSeconds: number
      readonly remainingSeconds: number
      readonly pausedAt: string
    }
  | {
      readonly status: 'expired'
      readonly durationSeconds: number
      readonly expiredAt: string
    }

interface PhaseClosure {
  readonly closedAt: string
  readonly reason: 'manual' | 'timer-expired'
}

interface CluePhaseSnapshot {
  readonly schemaVersion: 1
  readonly identity: PhaseIdentity
  readonly participantIds: readonly string[]
  readonly turnSequence: TurnSequence
  readonly clock: ConversationClock
  readonly stage: 'clues' | 'discussion'
  readonly currentTurnIndex: number | null
  readonly completedCluePlayerIds: readonly string[]
  readonly state: 'ready' | 'active' | 'closed'
  readonly createdAt: string
  readonly updatedAt: string
  readonly closure: PhaseClosure | null
}

interface CluePhaseHandoff {
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
  readonly participantIds: readonly string[]
  readonly closedAt: string
  readonly reason: 'manual' | 'timer-expired'
}

interface NextCluePhaseRequest {
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
  readonly eligiblePlayerIds: readonly string[]
  readonly issuedAt: string
}

interface PublicRoundSession {
  readonly schemaVersion: 1
  readonly preparedRound: PreparedRound
  readonly activePhase: CluePhaseSnapshot
  readonly closedPhaseHandoffs: readonly CluePhaseHandoff[]
}
```

`PublicRoundSession`, `CluePhaseSnapshot` and both handoff/request types structurally exclude
category, concept, assignments, roles, companions and votes.

```ts
type RoundSessionIssue =
  | 'invalid-handoff'
  | 'invalid-participants'
  | 'invalid-phase-number'
  | 'invalid-random'
  | 'invalid-clock'
  | 'invalid-transition'
  | 'confirmation-required'
  | 'incompatible-state'

type RoundSessionResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly issues: readonly RoundSessionIssue[] }

prepareInitialPhase(
  preparedRound: PreparedRound,
  random: () => number,
  now: string,
): RoundSessionResult<CluePhaseSnapshot>

prepareSuccessivePhase(
  preparedRound: PreparedRound,
  previous: CluePhaseHandoff,
  request: NextCluePhaseRequest,
  random: () => number,
  now: string,
): RoundSessionResult<CluePhaseSnapshot>

beginClues(
  phase: CluePhaseSnapshot,
  preparedRound: PreparedRound,
  now: string,
): RoundSessionResult<CluePhaseSnapshot>

advanceClueTurn(
  phase: CluePhaseSnapshot,
  expectedTurnIndex: number,
  now: string,
): RoundSessionResult<CluePhaseSnapshot>

pauseClock(
  phase: CluePhaseSnapshot,
  now: string,
): RoundSessionResult<CluePhaseSnapshot>

resumeClock(
  phase: CluePhaseSnapshot,
  now: string,
): RoundSessionResult<CluePhaseSnapshot>

deriveClock(
  clock: ConversationClock,
  now: string,
): RoundSessionResult<{ clock: ConversationClock; remainingSeconds: number | null }>

closeCluePhase(
  phase: CluePhaseSnapshot,
  now: string,
  confirmation: { readonly confirmed: true },
): RoundSessionResult<{
  readonly phase: CluePhaseSnapshot
  readonly handoff: CluePhaseHandoff
}>
```

- `prepareInitialPhase` usa todos los jugadores en orden canonico de roster.
- `prepareSuccessivePhase` no acepta elegibles hasta recibir `NextCluePhaseRequest` de IMP-8.
- La solicitud sucesiva debe ser un subconjunto estricto no vacio de los participantes previos.
- Fisher-Yates consume RNG solo durante prepare; recovery y comandos no lo consumen.
- begin deja de ser ready y crea deadline solo para conversacion timed.
- Una fase ready ya contiene progreso valido: roster/random usa clues/0/[] y free usa
  discussion/null/[]. Begin solo activa estado/reloj. Advance recibe el indice observado como token
  de intencion, no un destino: solo coincide con el turno actual, completa ese turno y el ultimo entra
  en discussion. Repetir un token ya completado es no-op.
- begin sobre una fase ya active, pause sobre paused y resume sobre running son no-op equivalentes;
  no se consideran mutaciones y el repositorio no incrementa revision.
- Un estado que no representa la misma intencion idempotente devuelve `invalid-transition` o
  `incompatible-state`, no lanza detalles del payload.
- close desde un reloj efectivamente expirado produce `timer-expired`; en otro caso produce manual.
- Toda mutacion deriva primero el reloj efectivo. Expired no admite pause/resume; no existe reset.

## Repository contract

```ts
interface StoredPublicRoundSession {
  readonly session: PublicRoundSession | null
  readonly revision: number
}

interface RoundSessionRepository {
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
  ): Promise<StorageResult<{
    readonly stored: StoredPublicRoundSession
    readonly handoff: CluePhaseHandoff
  }>>
}
```

### Load and projection

- `load` acepta `round-prepared` como `{ session: null, revision }` para preparar phase 1 y
  `clues-active` como una proyeccion publica validada.
- La implementacion puede leer `ActiveRoundRecovery`, pero DEBE eliminar `secretRound` antes de
  retornar por cualquier metodo.
- Payload incompleto, fase futura o relaciones inconsistentes retornan `incompatible-data`.

### Atomicity, writer and revision

- Cada mutacion abre una transaccion sobre `recoverySnapshots` y `metadata`, requiere writer lease y
  verifica expectedRevision.
- Una mutacion real incrementa revision exactamente una vez. Un no-op idempotente retorna el valor
  actual sin escribir ni incrementar.
- `revision-conflict` es retryable a nivel plataforma, pero el servicio MUST ejecutar `load` y no
  reproducir automaticamente el comando stale.
- Otros fallos retryable pueden reintentar la escritura consciente; ningun fallo emite handoff.

### Initial and successive preparation

- `prepareInitial` valida `RoundHandoff` contra el `SecretRoundSnapshot` N/N persistido y usa roster
  completo. Repetir con la misma identidad retorna la fase existente sin RNG ni revision.
- `prepareNext` requiere activePhase closed y request exactamente siguiente. Al confirmar, conserva
  el handoff de la fase cerrada y sustituye su snapshot completo por la fase ready nueva.
- Los IDs solicitados deben reducir estrictamente los participantes anteriores. Los handoffs quedan
  contiguos, ascendentes y sin duplicados; su cardinalidad coincide con el estado de activePhase.
- Cada handoff comparte game/round, usa phaseNumber igual a indice+1, participantes canonicos no
  vacios y cierre valido; si activePhase esta closed, el ultimo coincide con su closure.
- Ningun metodo registra votos, interpreta eliminados o evalua victoria.

### Close and handoff

- close requiere confirmacion. El commit escribe closure antes de retornar el handoff.
- Repetir close sobre closed retorna el mismo handoff sin escritura ni navegacion duplicada.
- `participantIds` del handoff usa orden canonico del roster incluso si turnSequence es random.

## Internal recovery contract

```ts
interface OpaqueResolutionLedgerEnvelope {
  readonly schemaVersion: 1
  readonly gameId: string
  readonly roundNumber: number
  readonly payload: unknown
}

interface ActiveRoundRecovery {
  readonly schemaVersion: 1
  readonly secretRound: SecretRoundSnapshot
  readonly resolutionLedger: OpaqueResolutionLedgerEnvelope | null
  readonly activePhase: CluePhaseSnapshot
  readonly closedPhaseHandoffs: readonly CluePhaseHandoff[]
}
```

Se persiste como `RecoverySnapshot<ActiveRoundRecovery>` con `phase: 'clues-active'`. Este tipo no se
exporta desde el hook ni se usa como prop. Se conserva hasta que una epica posterior cierre la ronda.
IMP-6 solo valida version/identidad de `resolutionLedger` y lo preserva opacamente; no accede a su
payload ni lo incluye en `PublicRoundSession`.

## Feature handoffs

```ts
onPhasePrepared(session: PublicRoundSession): void
onCluePhaseClosed(handoff: CluePhaseHandoff): void
```

Los callbacks son independientes de React, Dexie, URL y navegacion. `onCluePhaseClosed` es la unica
salida hacia IMP-7. `NextCluePhaseRequest` es una entrada de IMP-8, no una decision de IMP-6.

## Screen integration contract

- La UI implementa ready, clues, discussion, paused, expired, confirmation, error-retry, observer y
  closed conforme a `specs/screen-inventory.md`.
- La secuencia es informativa y no navegable; una unica CTA ejecuta el siguiente comando valido.
- El slot de Game Menu solo aparece en superficies compartidas y su comportamiento pertenece a
  IMP-10. Ninguna superficie privada lo recibe.

```ts
interface PublicRoundSessionContinuityAdapter {
  readonly feature: 'clues'
  capability(): ContinuityCapability
  summarize(): Promise<StorageResult<SafeResumeSummary>>
  safeResumeRoute(): Promise<StorageResult<SafeResumeRoute>>
  pauseForHome(request: GamePauseRequest): Promise<StorageResult<PauseForHomeResult>>
}
```

El adaptador no expone `ActiveRoundRecovery` ni ofrece abandono. Running se persiste paused antes de
Home; paused devuelve no-op; expired conserva expiry; observer retorna writer-unavailable; stale
recarga sin reproducir la pausa. Solo IMP-10 renderiza el menu y sus dialogos.

## Privacy contract

Tests MUST verificar ausencia de secretos en:

- `PublicRoundSession`, `CluePhaseSnapshot` y `CluePhaseHandoff`;
- DOM compartido y modo observer;
- URL y estado del reducer de navegacion;
- `PublicPlatformError` y mensajes traducidos;
- `console` y cualquier logger.

IMP-6 no introduce telemetria. No se permite serializar `ActiveRoundRecovery` fuera del repositorio.
