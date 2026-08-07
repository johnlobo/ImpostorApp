# Data Model: Asignacion secreta y revelacion segura de roles

Entidades reutilizadas sin redefinir: `PreparedGame` y `PreparedGameRules` (`impostorCount`,
`allocation`, `impostorAwareness`) de `specs/003-game-configuration/data-model.md`;
`PreparedContentSelection` y `DrawnConcept` (el "DrawResult" del spec) de
`specs/004-category-catalog/data-model.md`. Ninguna de las dos se copia ni se redefine; IMP-5 solo
las consume por valor.

## RoleAssignment

| Field | Type | Rules |
|---|---|---|
| playerId | string | Debe existir en `content.game.roster.players` |
| role | `'citizen' \| 'impostor'` | Exactamente `impostorCount` entradas con `role: 'impostor'`, sin `playerId` repetido |

Generada por la funcion de dominio pura `assignRoles(roster, impostorCount, allocation, history,
random)`. Para `allocation: 'random'` es una muestra uniforme sin reemplazo del tamano
`impostorCount`. Para `allocation: 'balanced'` prioriza a los jugadores con menor conteo acumulado
en `ImpostorAllocationHistory`, deshaciendo empates con el RNG inyectado.

## ImpostorAllocationHistory

| Field | Type | Rules |
|---|---|---|
| scopeId | string | Exactamente `PreparedGame.id` |
| schemaVersion | integer | Version actual soportada |
| impostorCounts | `Readonly<Record<string, number>>` | Conteo de veces que cada `playerId` fue impostor en rondas previas de esta partida; ausente equivale a 0 |
| roundsPlayed | integer | Numero de rondas preparadas con exito para esta partida |
| updatedAt | ISO timestamp | Ultima preparacion de ronda durable |

Persistido en la tabla Dexie `role-assignment-history` (migracion version 2), un registro por
partida, actualizado atomicamente en la misma transaccion que el draw y el snapshot secreto. Nunca
contiene texto de concepto ni nombres; solo IDs de jugador y conteos.

## SecretRoundSnapshot

| Field | Type | Rules |
|---|---|---|
| schemaVersion | integer | Inicialmente 1 |
| content | PreparedContentSelection | Copia inmutable confirmada por IMP-4; permite repetir el sorteo en la siguiente ronda |
| roundNumber | integer | `ImpostorAllocationHistory.roundsPlayed` previo mas uno |
| assignments | readonly RoleAssignment[] | Exactamente `content.game.rules.impostorCount` impostores, sin IDs repetidos |
| concept | DrawnConcept | Concepto sorteado; su `conceptId` ya esta en `used-concepts` antes de exponerse |
| impostorAwareness | `'unknown' \| 'known'` | Copiado de `content.game.rules.impostorAwareness` en el momento de preparar la ronda |
| reveals | readonly RevealStateEntry[] | Una entrada por jugador de `content.game.roster.players`, mismo orden |
| createdAt | ISO timestamp | Reloj inyectado en la preparacion |

Unica fuente de verdad secreta de la ronda. Se persiste en `recoverySnapshots` (`id: 'active-game'`)
bajo la fase `round-prepared`, reemplazando la fase `content-selected` de IMP-4. Es inmutable salvo
por la transicion de cada `RevealStateEntry.status` de `pending` a `completed`.

## RevealStateEntry (RevealState)

| Field | Type | Rules |
|---|---|---|
| playerId | string | Debe existir en `content.game.roster.players` |
| status | `'pending' \| 'completed'` | Solo transiciona una vez, de `pending` a `completed`; nunca regresa |

No almacena que contenido vio el jugador, solo si ya completo su consulta. `completed` es
irreversible dentro de una ronda: una nueva ronda genera un `SecretRoundSnapshot` nuevo con todas las
entradas en `pending`.

## PublicRoundProgress

| Field | Type | Rules |
|---|---|---|
| total | integer | Numero de jugadores de la ronda |
| completed | integer | Cuenta de `reveals` con `status: 'completed'` |
| players | readonly `{ id, name, position, status }`[] | Proyeccion de `content.game.roster.players` + `reveals`; nunca incluye `role`, `concept` ni `impostorAwareness` |

Vista derivada y segura calculada por `derivePublicProgress(snapshot)`. Es la unica proyeccion que
puede alimentar la superficie compartida y el modo observador (FR-008, FR-016). No se persiste de
forma independiente; se recalcula siempre a partir de `SecretRoundSnapshot`.

## PrivateRoleView

```ts
type PrivateRoleView =
  | { readonly kind: 'citizen'; readonly category: string; readonly concept: string }
  | { readonly kind: 'impostor'; readonly category: string; readonly companions: readonly string[] }
```

Calculada por `resolvePrivateRoleView(snapshot, playerId)`. `companions` solo contiene nombres de
otros jugadores con `role: 'impostor'` cuando `impostorAwareness === 'known'`; en cualquier otro caso
(`unknown`, o un unico impostor configurado) es `[]`. Un ciudadano nunca recibe `companions`. Esta es
la unica funcion autorizada a exponer `concept.text` o nombres de companeros impostores, y solo debe
invocarse tras persistir `status: 'completed'` para ese `playerId` (FR-010).

## RoundHandoff

| Field | Type | Rules |
|---|---|---|
| gameId | string | `content.game.id` |
| roundNumber | integer | Igual a `SecretRoundSnapshot.roundNumber` |
| preparedAt | ISO timestamp | Momento de la entrega; no persistido, no afecta la idempotencia |

Calculado por `confirmHandoff(snapshot)`, que devuelve `RoundHandoff` solo si todas las entradas de
`reveals` estan `completed`, o `null` en caso contrario. No contiene roles ni concepto (FR-015). No
provoca ninguna escritura de almacenamiento; repetir la llamada devuelve un valor equivalente sin
duplicar el reparto (FR-014).

## RecoverySnapshot mapping

| RecoverySnapshot field | Value |
|---|---|
| id | `active-game` |
| schemaVersion | `SecretRoundSnapshot.schemaVersion` |
| revision | Revision previa mas exactamente uno por cada preparacion o revelacion confirmada |
| phase | `round-prepared` |
| payload | `SecretRoundSnapshot` versionado |
| integrity | `confirmed` |

Una preparacion fallida no incrementa la revision ni dejar un payload parcial: la escritura Dexie
solo se confirma si el draw, el historial de reparto y el snapshot se completan juntos. Una
revelacion fallida (conflicto de revision, cuota, perdida de escritor) deja el payload previo
intacto.

## State transitions

```text
content-selected (IMP-4) -> prepare-round -> round-prepared snapshot (reveals: all pending)
                                       \-> draw exhausted or storage failure -> unchanged content-selected

round-prepared -> reveal(playerId) -> persist completed -> content shown -> hide -> shared list
                                \-> playerId already completed -> no-op (idempotent)
                                \-> storage failure -> unchanged reveals -> retry

round-prepared, N/N completed -> confirmHandoff -> RoundHandoff (idempotent, no write)
round-prepared, < N/N completed -> confirmHandoff -> null ("Empezar ronda" disabled)

round-prepared (game G) -> next round -> prepare-round again with same `content`
                                       -> role-assignment-history.roundsPlayed + 1
```
