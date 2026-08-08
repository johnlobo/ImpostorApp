# Data Model: Votacion, empates y eliminacion

Entidades reutilizadas: `CluePhaseHandoff` y envelope interno de IMP-6; `PreparedGame`,
`VotingRule` y `EliminationRule` de IMP-3; `SecretRoundSnapshot` de IMP-5. Solo el repositorio
maneja el envelope secreto.

## VotingIdentity

| Field | Type | Rules |
|---|---|---|
| gameId | string | Igual al juego preparado |
| roundNumber | integer | Igual a ronda secreta y handoff de pistas |
| phaseNumber | integer | Igual al `CluePhaseHandoff`; >= 1 |

## Ballot

| Field | Type | Rules |
|---|---|---|
| ballotNumber | `1 | 2` | Primera papeleta o unico desempate |
| voterIds | readonly string[] | Todos los `participantIds`, orden canonico |
| candidateIds | readonly string[] | Primera: participantes; segunda: empatados de corte |
| maxSelections | integer | Primera: 1 o `impostorCount`; segunda: puestos pendientes |
| provisionalPlayerIds | readonly string[] | Vacio en primera; sobre el corte en segunda |
| pendingSlots | integer | Puestos que el desempate debe llenar |
| state | `open | ready-to-count | closed` | Closed es inmutable |
| openedAt | ISO timestamp | Durable |
| closedAt | ISO timestamp or null | Solo closed |

### Cardinality

Para cada votante, la primera papeleta exige un candidato cuando `maxSelections=1`; con
`single` multi-impostor exige 1..`impostorCount`. El desempate exige
`min(pendingSlots, candidateIds excluding voterId)`.

## SecretVote

| Field | Type | Rules |
|---|---|---|
| ballotNumber | `1 | 2` | Distingue primera papeleta y desempate |
| voterId | string | Unico por `ballotNumber`; elegible |
| candidateIds | readonly string[] | Canonicos, unicos, sin voterId y con cardinalidad valida |
| confirmedAt | ISO timestamp | Se asigna en el commit |

Las selecciones no aparecen en proyecciones publicas ni se retornan despues de confirmar.

## VoteTally

`ApprovalCount` contiene `playerId` y un entero `count >= 1`; no conserva votantes.

| Field | Type | Rules |
|---|---|---|
| ballotNumber | `1 | 2` | Papeleta contada |
| approvals | readonly ApprovalCount[] | Solo agregados; orden por count descendente y roster |
| effectiveSlots | integer | `min(maxSlots, positiveCandidateCount)` |
| aboveCutPlayerIds | readonly string[] | Inequivocos sobre el corte |
| cutoffPlayerIds | readonly string[] | Empatados que cruzan el ultimo puesto |
| pendingSlots | integer | Cero si el resultado es definitivo |
| confirmedAt | ISO timestamp | Commit del recuento |

El orden roster hace estable la representacion, pero nunca rompe un empate: el grupo por conteo se
evalua antes de ordenar IDs.

## ConfirmedVotingResult

```ts
type ConfirmedVotingResult =
  | {
      readonly resultId: string
      readonly outcome: 'eliminated'
      readonly eliminatedPlayerIds: readonly string[]
      readonly reason: 'verbal-selection' | 'first-count' | 'tiebreak-count'
      readonly confirmedAt: string
    }
  | {
      readonly resultId: string
      readonly outcome: 'persistent-tie'
      readonly eliminatedPlayerIds: readonly []
      readonly reason: 'second-tie'
      readonly confirmedAt: string
    }
```

En `single`, eliminated contiene 1..`impostorCount`. En `successive`, contiene exactamente uno.
El resultado se confirma de una sola vez; nunca mezcla provisionales con empate persistente.

## VotingSnapshot

| Field | Type | Rules |
|---|---|---|
| schemaVersion | literal 1 | Validado al recuperar |
| identity | VotingIdentity | Estable |
| method | `verbal | secret` | De `PreparedGame` |
| elimination | `single | successive` | De `PreparedGame` |
| impostorCount | integer | 1..3; solo cardinalidad, no identidades |
| participantIds | readonly string[] | No vacios, unicos, canonicos |
| ballot | Ballot or null | Null para verbal y despues del resultado |
| votes | readonly SecretVote[] | Privado; solo secreto |
| tallies | readonly VoteTally[] | Maximo dos |
| result | ConfirmedVotingResult or null | Terminal e inmutable |
| createdAt / updatedAt | ISO timestamps | Inyectados |

### State transitions

```text
CluePhaseHandoff
  -> preparing
  -> verbal-open -> confirming-result -> result
  -> secret-ballot-1 -> ready-to-count -> counting
       -> result
       -> secret-ballot-2 -> ready-to-count -> counting
            -> result | persistent-tie
storage failure -> previous confirmed state + retry
revision conflict -> load current without replay
```

## PublicVotingSession

Contiene identidad, metodo, regla, participantes, progreso por votante, estado de papeleta,
candidatos de desempate cuando aplica, conteos agregados ya cerrados, resultado confirmado y
revision. Excluye `SecretVote`, selecciones, assignments, concepto, categoria y companions.

## PrivateBallotView

Contiene voterId, ballotNumber, candidate IDs/names publicos, minimo/maximo de selecciones y accion
de confirmacion. Solo se deriva para un votante pendiente y writer. Nunca incluye votos previos,
conteos, roles o concepto.

## VoteResolutionHandoff

```ts
interface VoteResolutionHandoff {
  readonly schemaVersion: 1
  readonly resultId: string
  readonly gameId: string
  readonly roundNumber: number
  readonly phaseNumber: number
  readonly participantIds: readonly string[]
  readonly outcome: 'eliminated' | 'persistent-tie'
  readonly eliminatedPlayerIds: readonly string[]
  readonly reason: 'verbal-selection' | 'first-count' | 'tiebreak-count' | 'second-tie'
  readonly confirmedAt: string
}
```

`resultId` es estable para identidad+resultado confirmado. ParticipantIds conserva orden. Un
resultado eliminated tiene lista no vacia y reason distinto de second-tie; persistent-tie tiene
lista vacia y reason second-tie.

## ActiveVotingRecovery

```ts
interface OpaqueResolutionLedgerEnvelope {
  readonly schemaVersion: 1
  readonly gameId: string
  readonly roundNumber: number
  readonly payload: unknown
}

interface ActiveVotingRecovery {
  readonly schemaVersion: 1
  readonly secretRound: SecretRoundSnapshot
  readonly resolutionLedger: OpaqueResolutionLedgerEnvelope | null
  readonly closedPhaseHandoffs: readonly CluePhaseHandoff[]
  readonly voting: VotingSnapshot
}
```

Se guarda en `RecoverySnapshot` con `phase: 'voting-active'`. No cruza el puerto publico. La
revision exterior es la unica revision; cada mutacion real la incrementa una vez.
IMP-7 valida solo schema/game/round del ledger propiedad de IMP-8 y preserva su payload exactamente;
nunca lo incluye en `PublicVotingSession`, papeletas, handoff, errores o logs.

## Invariants

- Identidad y participantes coinciden con el ultimo handoff cerrado y el juego preparado.
- `votes` tiene como maximo una entrada por votante/papeleta.
- Ready-to-count implica N/N votos durables.
- Solo hay ballot 2 si ballot 1 tuvo empate de corte.
- Tallies son contiguos y no se recalculan al recuperar.
- Result implica `resultId` persistido, ballot cerrado, comandos bloqueados y handoff derivable
  estable.
- Observer recibe solo `PublicVotingSession`.
