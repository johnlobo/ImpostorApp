# Data Model: Resolucion de rondas y condiciones de victoria

Entidades reutilizadas: `VoteResolutionHandoff` de IMP-7, `NextCluePhaseRequest` de IMP-6,
`PreparedGame` de IMP-3 y `SecretRoundSnapshot` de IMP-5.

## RoundIdentity

| Field | Type | Rules |
|---|---|---|
| gameId | string | Coincide en prepared game, secreto e input |
| roundNumber | integer | 1..PreparedGame.rules.rounds |

Cada input añade `phaseNumber`, estrictamente contiguo dentro de la misma ronda.

## ResolutionLedger

| Field | Type | Rules |
|---|---|---|
| schemaVersion | literal 1 | Validado en cada feature que lo preserva |
| identity | RoundIdentity | Inmutable |
| currentParticipantIds | readonly string[] | Activos canonicos antes del siguiente input |
| eliminatedPlayerIds | readonly string[] | Acumulados, unicos y canonicos |
| consumedVoteResultIds | readonly string[] | Unico por fase, contiguo |
| attemptOutcomes | readonly FinalAttemptOutcome[] | Redacted; maximo uno por impostor |
| lastResolvedPhaseNumber | integer | Cero antes del primer input |
| updatedAt | ISO timestamp | Ultimo commit |

IMP-6 e IMP-7 conservan esta entidad como blob opaco. No la proyectan ni mutan.

## ResolutionDecision

```ts
type ResolutionDecision =
  | {
      readonly kind: 'continue'
      readonly activePlayerIds: readonly string[]
    }
  | {
      readonly kind: 'terminal'
      readonly winner: 'citizens' | 'impostors'
      readonly reason:
        | 'all-impostors-found'
        | 'impostors-escaped'
        | 'impostor-parity'
        | 'persistent-tie'
      readonly activePlayerIds: readonly string[]
    }
```

La funcion pura recibe handoff, assignments y ledger. Aplica todos los eliminados a la vez. Para
`persistent-tie` no modifica eliminados/activos y retorna terminal impostors.

## PrivateFinalAttempt

```ts
type PrivateFinalAttempt =
  | {
      readonly playerId: string
      readonly status: 'pending'
    }
  | {
      readonly playerId: string
      readonly status: 'answered'
      readonly answerText: string
      readonly outcome: 'correct' | 'incorrect'
      readonly confirmedAt: string
    }
  | {
      readonly playerId: string
      readonly status: 'declined'
      readonly outcome: 'declined'
      readonly confirmedAt: string
    }
```

Solo se crea para impostores eliminados con `finalAttempt=true`, en orden roster. AnswerText vive
solo en recovery privado hasta confirmar continuidad o terminal.

## FinalAttemptOutcome

```ts
interface FinalAttemptOutcome {
  readonly playerId: string
  readonly outcome: 'correct' | 'incorrect' | 'declined'
}
```

Es la unica forma que cruza a ledger, proyeccion terminal y handoff IMP-9. No contiene texto.

## RoundResolutionSnapshot

| Field | Type | Rules |
|---|---|---|
| schemaVersion | literal 1 | Version de IMP-8 |
| identity | RoundIdentity | Estable |
| voteHandoff | VoteResolutionHandoff | Input actual completo e inmutable |
| ledger | ResolutionLedger | Estado previo mas input actual |
| decision | ResolutionDecision | Calculada una vez |
| attempts | readonly PrivateFinalAttempt[] | Cola canonica |
| state | `attempts-pending | continuation-ready | terminal-ready | closed` | Comandos validos |
| nextCluePhaseRequest | NextCluePhaseRequest or null | Solo continue cerrado |
| terminalHandoff | RoundResolutionHandoff or null | Solo terminal cerrado |
| createdAt / updatedAt | ISO timestamps | Inyectados |

Decision se persiste al preparar. Las salidas solo se crean tras completar intentos. Confirmar una
salida mueve sus outcomes al ledger y sustituye `attempts` por `[]`; ningun snapshot cerrado
conserva `answerText`.

## NextCluePhaseRequest

Contrato reutilizado sin cambios:

```ts
interface NextCluePhaseRequest {
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
  readonly eligiblePlayerIds: readonly string[]
  readonly issuedAt: string
}
```

PhaseNumber es input.phaseNumber+1 y eligible IDs son decision.activePlayerIds canonicos.

## RoundResolutionHandoff

```ts
interface RoundResolutionHandoff {
  readonly schemaVersion: 1
  readonly resultId: string
  readonly gameId: string
  readonly roundNumber: number
  readonly participantIds: readonly string[]
  readonly originalRoles: readonly {
    readonly playerId: string
    readonly role: 'citizen' | 'impostor'
  }[]
  readonly winner: 'citizens' | 'impostors'
  readonly reason:
    | 'all-impostors-found'
    | 'impostors-escaped'
    | 'impostor-parity'
    | 'persistent-tie'
  readonly eliminatedPlayerIds: readonly string[]
  readonly activePlayerIds: readonly string[]
  readonly attemptOutcomes: readonly FinalAttemptOutcome[]
  readonly resolvedAt: string
}
```

ParticipantIds y originalRoles cubren el roster original en orden canonico. Eliminados y activos son
disjuntos, unicos y forman una particion. Attempt outcomes solo identifica impostores originales
eliminados. El handoff excluye concepto, categoria, guesses, votos, tallies, puntos y continuidad.

## PublicResolutionSession

Proyeccion compartida antes del terminal: identidad, fase, nombre del eliminado ya publico,
progreso anonimo de intentos, estado de trabajo y revision. Puede indicar que hay una salida
pendiente, pero no expone winner, reason, concepto, roles activos, answerText ni outcomes.

## PublicTerminalResolution

Solo tras terminal durable: ganador, motivo, concepto, todos los roles, eliminados/activos y outcomes
redacted. Es para UI y no se reutiliza como handoff a IMP-9.

## ActiveResolutionRecovery

```ts
interface ActiveResolutionRecovery {
  readonly schemaVersion: 1
  readonly secretRound: SecretRoundSnapshot
  readonly closedPhaseHandoffs: readonly CluePhaseHandoff[]
  readonly voteResolutionHandoffs: readonly VoteResolutionHandoff[]
  readonly resolution: RoundResolutionSnapshot
}
```

Se persiste con `phase: 'resolution-active'`. En ciclos successive, el ledger y handoffs minimos
se preservan opacamente dentro de los envelopes `clues-active` y `voting-active`.

## Invariants

- Vote input corresponde a currentParticipantIds, fase siguiente y mismo juego/ronda.
- Cada vote resultId se consume una vez.
- Eliminados acumulados y activos particionan roster; no se reintroduce un eliminado.
- Cada impostor eliminado obtiene cero o un intento segun regla; nunca un ciudadano.
- Pending attempts bloquean ambas salidas.
- Continue existe solo para successive con I>0 e I<C.
- Terminal handoff existe una vez y contiene todo el historial redacted.
- Observer y public projections nunca reciben secretRound ni answerText.
