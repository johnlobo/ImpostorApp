# Data Model: Puntuacion y continuidad multirronda

## RoundResolutionHandoff

Entrada interna exacta de IMP-8; el guard rechaza propiedades adicionales.

| Field | Type | Validation |
|---|---|---|
| schemaVersion | integer | version soportada |
| resultId | string | no vacio, estable |
| gameId | string | juego activo |
| roundNumber | integer | siguiente esperada, 1..rondas |
| participantIds | string[] | roster canonico y unico |
| originalRoles | role[] | exactamente uno por participante |
| winner | citizens / impostors | unico |
| reason | resolution reason | compatible con winner |
| eliminatedPlayerIds | string[] | subconjunto unico |
| activePlayerIds | string[] | canonico y disjunto de eliminados |
| attemptOutcomes | `{playerId,outcome}`[] | autor impostor eliminado, uno por autor |
| resolvedAt | ISO string | no vacio |

`outcome` es `correct`, `incorrect` o `declined`. Concepto, respuesta y votos quedan excluidos.

## ScoreMovement

```ts
interface ScoreMovement {
  readonly resultId: string
  readonly roundNumber: number
  readonly playerId: string
  readonly points: 1 | 2
  readonly reason: 'citizen-win' | 'impostor-win' | 'last-stand-correct'
}
```

Inmutable; clave logica `(resultId, playerId, reason)`.

## AppliedResultRecord

```ts
interface AppliedResultRecord {
  readonly result: RoundResolutionHandoff
  readonly movements: readonly ScoreMovement[]
  readonly appliedAt: string
}
```

Interno y secreto. Permite comparar retries y nunca cruza el repositorio.

```ts
interface RoundPreparationSource {
  readonly game: PreparedGame
  readonly content: PreparedContentSelection
}
```

IMP-8 lo deriva del envelope secreto al entregar el terminal por canal interno. IMP-9 valida gameId
y lo conserva solo en `InternalGameScoreboard`; servicio, UI, observer y request publico no lo ven.

## InternalGameScoreboard

```ts
interface InternalGameScoreboard {
  readonly schemaVersion: 1
  readonly gameId: string
  readonly roster: PreparedRoster
  readonly configuredRounds: number
  readonly preparationSource: RoundPreparationSource
  readonly appliedResults: readonly AppliedResultRecord[]
  readonly totals: Readonly<Record<string, number>>
  readonly status: 'in-progress' | 'final'
  readonly nextAction: 'next-round' | 'final-ranking' | 'rematch-review' | 'new-game'
  readonly revision: number
  readonly updatedAt: string
}
```

Resultados son contiguos desde 1 y unicos por ID/ronda. Totales contienen exactamente el roster e
igualan el ledger. Antes de la ronda configurada final: `in-progress/next-round`; al alcanzarla:
`final/final-ranking`. Persistencia: `{key: gameId, value}` en `game-scoreboards`.

## PublicGameScoreboard

```ts
interface PublicGameScoreboard {
  readonly gameId: string
  readonly completedRound: number
  readonly configuredRounds: number
  readonly status: 'in-progress' | 'final'
  readonly nextAction: 'next-round' | 'final-ranking' | 'rematch-review' | 'new-game'
  readonly entries: readonly {
    playerId: string
    name: string
    points: number
    position: number
    leader: boolean
    winner: boolean
  }[]
  readonly revision: number
}
```

No contiene roles, movimientos, eliminados, intentos, concepto, categoria ni votos. `winner` solo
aplica en final y admite multiples entradas.

## ScoringRecoveryReference

```ts
interface ScoringRecoveryReference {
  readonly schemaVersion: 1
  readonly gameId: string
  readonly scoreboardRevision: number
  readonly surface: 'scoreboard' | 'final-ranking'
}
```

Payload de `RecoverySnapshot` fase `scoreboard-active`. El repositorio carga y valida el agregado por
referencia antes de proyectar.

## NextRoundRequest

```ts
interface NextRoundRequest {
  readonly gameId: string
  readonly roundNumber: number
  readonly scoreboardRevision: number
}
```

El coordinador valida `roundNumber = completedRound + 1`, confirma intencion y ejecuta preparacion
atomica IMP-4 -> IMP-5.

## RematchSeed

```ts
interface RematchSeed {
  readonly sourceGameId: string
  readonly newGameId: string
  readonly rosterDraft: PreparedRosterDraft
  readonly configurationDraft: GameConfigurationDraft
  readonly contentSelectionDraft: ContentSelectionDraft
}
```

Los tres drafts son editables y no confirmados. Excluye resultados, puntos, roles, conceptos usados,
historiales y recovery.

## Transitions

```text
RoundResolutionHandoff -> applyResult -> scoreboard-active
  round < configured -> NextRoundRequest -> IMP-4 draw -> IMP-5 roles
  round = configured -> final-ranking
final-ranking -> rematch -> players -> configuration -> content -> IMP-5
final-ranking -> new-game -> reusable local collections only
```
