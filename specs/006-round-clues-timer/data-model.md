# Data Model: Desarrollo de rondas, pistas y temporizador

Entidades reutilizadas sin redefinir: `RoundHandoff` y `SecretRoundSnapshot` de IMP-5;
`PreparedGame`, `ConversationRule`, `TurnOrder`, `VotingRule` y `EliminationRule` de IMP-3. El
snapshot secreto se conserva solo dentro del envelope de recuperacion. El dominio y la UI de IMP-6
trabajan con las entidades publicas descritas a continuacion.

## PhaseIdentity

| Field | Type | Rules |
|---|---|---|
| gameId | string | Igual a `RoundHandoff.gameId` y `PreparedGame.id` |
| roundNumber | integer | Igual a `RoundHandoff.roundNumber`, mayor o igual que 1 |
| phaseNumber | integer | Empieza en 1 y aumenta exactamente en uno para fases sucesivas |

La tupla es la identidad estable. Puede representarse como clave opaca interna, pero no se concatena
en URL ni se utiliza para transportar payloads.

## PreparedRound

```ts
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
```

Proyeccion publica derivada del `SecretRoundSnapshot.content.game` despues de validar el
`RoundHandoff`. No contiene impostorCount, allocation, awareness, concepto ni assignments. IMP-6 no
ofrece presets ni cambia `conversation.seconds`; consume exactamente el valor confirmado por IMP-3.
`totalRounds` es la cantidad publica validada de rondas de `PreparedGame` y permite mostrar progreso
sin volver a exponer el agregado de configuracion.

## EligibleRoster

| Field | Type | Rules |
|---|---|---|
| participantIds | readonly string[] | Unicos, no vacios, todos pertenecen al roster |

`participantIds` siempre se canonicaliza filtrando el roster original, por lo que su orden es
estable e independiente de `TurnSequence`. Para phase 1 incluye el roster completo. Para fases
posteriores procede exclusivamente de `NextCluePhaseRequest`.

## TurnSequence

```ts
type TurnSequence =
  | { readonly mode: 'free' }
  | {
      readonly mode: 'roster' | 'random'
      readonly playerIds: readonly string[]
      readonly startingPlayerId: string
    }
```

- `free` no expresa speaker ni secuencia obligatoria.
- `roster` copia `participantIds`.
- `random` es una permutacion Fisher-Yates completa de `participantIds`, confirmada una vez.
- `startingPlayerId` es siempre el primer ID de `playerIds`.

## ConversationClock

```ts
type ConversationClock =
  | {
      readonly status: 'ready'
      readonly mode: 'untimed'
    }
  | {
      readonly status: 'ready'
      readonly mode: 'timed'
      readonly durationSeconds: number
    }
  | {
      readonly status: 'untimed'
      readonly startedAt: string
    }
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
```

Una fase se prepara en `ready`; el tiempo no empieza hasta el commit de `Comenzar pistas`.

Para running:

```text
deadlineRemaining = ceil((deadlineAt - now) / 1000)
remaining = clamp(min(maximumRemainingSeconds, deadlineRemaining), 0, durationSeconds)
```

Si remaining es cero, la proyeccion efectiva es `expired`; no hace falta una escritura ejecutada por
un tick. Un salto atras queda limitado por `maximumRemainingSeconds`; uno hacia delante puede
expirar. Pausa persiste el remaining efectivo. Resume crea deadline desde ese remaining.

## CluePhaseSnapshot

| Field | Type | Rules |
|---|---|---|
| schemaVersion | integer | Inicialmente 1 |
| identity | PhaseIdentity | Estable y unica en la ronda |
| participantIds | readonly string[] | Orden canonico del roster |
| turnSequence | TurnSequence | Coherente con `PreparedGame.turnOrder` |
| clock | ConversationClock | Coherente con `PreparedGame.conversation` |
| stage | `'clues' \| 'discussion'` | `free` siempre usa discussion |
| currentTurnIndex | `number \| null` | Indice valido solo durante clues gestionadas |
| completedCluePlayerIds | readonly string[] | Prefijo exacto anterior al indice actual |
| state | `'ready' \| 'active' \| 'closed'` | Solo avanza; nunca vuelve a ready |
| createdAt | ISO timestamp | Confirmacion de preparacion |
| updatedAt | ISO timestamp | Ultima mutacion durable |
| closure | PhaseClosure \| null | Solo presente si state es closed |

El snapshot completo existe solo para la fase actual. Cuando una fase sucesiva se confirma, el
snapshot cerrado anterior se sustituye y solo permanece su handoff minimo.

En `roster` y `random`, una fase ready ya contiene `stage: clues`, indice cero y completados vacios;
begin solo activa la fase y su reloj. Avanzar completa
implicitamente el ID actual y no acepta otro ID o indice; el ultimo avance entra en discussion con
indice nulo. En `free`, stage es discussion y los campos de progreso permanecen `null`/`[]`.

## PhaseClosure

```ts
interface PhaseClosure {
  readonly closedAt: string
  readonly reason: 'manual' | 'timer-expired'
}
```

El cierre exige `{ confirmed: true }`. Si el reloj efectivo esta expirado, el motivo es
`timer-expired`; desde untimed, running o paused es `manual`. Una vez cerrado no acepta mutaciones.

## CluePhaseHandoff

```ts
interface CluePhaseHandoff {
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
  readonly participantIds: readonly string[]
  readonly closedAt: string
  readonly reason: 'manual' | 'timer-expired'
}
```

`participantIds` usa siempre orden canonico de roster, no el orden random de pistas. El handoff no
incluye secuencia, reloj, concepto, categoria, roles, companeros ni votos. Repetir close devuelve un
valor equivalente sin revision nueva.

## NextCluePhaseRequest

```ts
interface NextCluePhaseRequest {
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
  readonly eligiblePlayerIds: readonly string[]
  readonly issuedAt: string
}
```

IMP-8 lo emite despues de consumir el resultado de IMP-7 y determinar que aun no existe victoria.
IMP-6 exige misma partida/ronda, `phaseNumber = previous + 1`, fase previa cerrada e IDs unicos que
formen un subconjunto estricto no vacio de los participantes previos. No comprueba roles, votos,
eliminados ni victoria.

## PublicRoundSession

```ts
interface PublicRoundSession {
  readonly schemaVersion: 1
  readonly preparedRound: PreparedRound
  readonly activePhase: CluePhaseSnapshot
  readonly closedPhaseHandoffs: readonly CluePhaseHandoff[]
}
```

Es el unico payload que puede salir del repositorio hacia servicio, hook, UI u observer. Aunque
`activePhase.state` sea closed, permanece como fase actual hasta que IMP-8 solicite la siguiente o
cierre la ronda.

`closedPhaseHandoffs` contiene una entrada por fase, ordenada y sin huecos. Si activePhase esta
ready/active contiene fases `1..phaseNumber-1`; si esta closed contiene `1..phaseNumber` y el ultimo
handoff coincide exactamente con su closure y participantes.
Cada entrada comparte gameId/roundNumber, usa `phaseNumber = indice + 1`, participantes canonicos no
vacios y un `closedAt`/reason validos.

## ActiveRoundRecovery (internal)

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

`OpaqueResolutionLedgerEnvelope` expone internamente solo schemaVersion/gameId/roundNumber y payload
opaco propiedad de IMP-8. IMP-6 valida cabecera, lo preserva byte-for-byte y nunca lo proyecta,
interpreta o muta. La primera fase usa null; una fase sucesiva exige el ledger entregado por IMP-8.

Payload interno de `RecoverySnapshot.phase = 'clues-active'`. Infraestructura valida relaciones
entre las tres partes y proyecta `PublicRoundSession`; nunca lo devuelve por el puerto publico. No
hay tabla o migracion nueva.

## RoundSessionIssue

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
```

Las funciones puras usan issues tipados. Datos persistidos parciales o futuros se traducen a
`PublicPlatformError { code: 'incompatible-data', retryable: false }` sin detalles del payload.

## State transitions

```text
round-prepared N/N -> prepareInitial -> clues-active / phase 1 ready
phase ready -> begin -> active + untimed|running
active/clues roster|random -> advance current -> next clue|discussion
running -> pause -> paused
paused -> resume -> running
running + remaining 0 -> derive -> expired (sin navegacion ni commit obligatorio)
active|paused|expired -> request close -> confirm -> closed + CluePhaseHandoff
closed + NextCluePhaseRequest valido -> prepareNext -> nueva activePhase ready
```

Repetir begin sobre active, pause sobre paused, resume sobre running o close sobre closed es no-op sin
incrementar revision. Una revision stale recarga el ultimo snapshot y no reproduce la intencion.
Antes de cada mutacion se deriva el reloj efectivo; expired no admite pause/resume y solo puede
cerrarse. No existe transicion que acepte un jugador o indice arbitrario.

## RecoverySnapshot mapping

| RecoverySnapshot field | Value |
|---|---|
| id | `active-game` |
| schemaVersion | `ActiveRoundRecovery.schemaVersion` |
| revision | Revision previa +1 solo por mutacion real |
| phase | `clues-active` |
| payload | ActiveRoundRecovery interno |
| integrity | `confirmed` |
