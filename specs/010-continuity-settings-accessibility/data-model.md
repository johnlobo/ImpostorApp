# Data Model: Continuidad, ayuda, ajustes y accesibilidad

## SafeResumeSummary

```ts
interface SafeResumeSummary {
  readonly schemaVersion: 1
  readonly gameId: string
  readonly roundNumber: number | null
  readonly totalRounds: number | null
  readonly participantNames: readonly string[]
  readonly phase: PublicResumePhase
  readonly updatedAt: string
}

type PublicResumePhase =
  | 'setup'
  | 'role-reveal'
  | 'clues'
  | 'voting'
  | 'resolution'
  | 'scoreboard'
  | 'final-ranking'
```

```ts
interface PublicRecoveryDiscriminator {
  readonly feature: SafeResumeRoute['feature']
  readonly phase: PublicResumePhase
  readonly schemaVersion: number
  readonly revision: number
  readonly integrity: 'confirmed'
}
```

El registry exige exactamente un adapter compatible; cero o varios producen safe mode.

No contiene categoria, concepto, asignaciones, roles, companions, votos, respuesta de ultimo intento
ni resultado aun privado. Se deriva en lectura; no se persiste como segunda fuente.

## SafeResumeRoute

```ts
interface SafeResumeRoute {
  readonly feature: 'setup' | 'roles' | 'clues' | 'voting' | 'resolution' | 'scoring'
  readonly surface:
    | 'shared-list'
    | 'round-ready'
    | 'shared-phase'
    | 'private-handoff'
    | 'public-resolution'
    | 'scoreboard'
    | 'final-ranking'
  readonly gameId: string
}
```

Es navigation state publico. `private-handoff` significa cubierta sin contenido/entrada previa.

## ContinuityCapability

```ts
interface ContinuityCapability {
  readonly feature: SafeResumeRoute['feature']
  readonly canPause: boolean
  readonly canAbandon: boolean
  readonly isPrivateSurface: boolean
}
```

El menu solo aparece cuando `isPrivateSurface` es false y existe al menos un comando permitido.

## GamePauseRequest and result

```ts
interface GamePauseRequest {
  readonly gameId: string
  readonly expectedRevision: number
  readonly confirmedAt: string
}

type PauseForHomeResult =
  | { readonly status: 'paused'; readonly route: SafeResumeRoute; readonly revision: number }
  | { readonly status: 'already-safe'; readonly route: SafeResumeRoute; readonly revision: number }
```

Timer running debe quedar durablemente paused. Un estado expirado se conserva expired. `already-safe`
es no-op sin revision. Error/conflict nunca incluye snapshot ni navega.

## LocalPreferences

```ts
interface LocalPreferences {
  readonly id: 'preferences'
  readonly schemaVersion: 2
  readonly locale: 'es'
  readonly soundEnabled: boolean
  readonly vibrationEnabled: boolean
  readonly adultContentEnabled: boolean
  readonly highContrastEnabled: boolean
  readonly onboarding: OnboardingState
  readonly updatedAt: string
}

interface OnboardingState {
  readonly status: 'pending' | 'skipped' | 'completed'
  readonly version: number
  readonly decidedAt: string | null
}
```

Defaults: feedback habilitado solo si la politica existente asi lo define, adulto/contraste false y
onboarding pending. Adulto no equivale a confirmacion de IMP-4.

## FeedbackCue

```ts
interface FeedbackCue {
  readonly kind: 'generic-confirmation' | 'public-success' | 'public-warning'
}
```

No hay cues citizen/impostor/vote-option/result-private. Gateways degradan a no-op.

## LocalDataInventory

```ts
interface LocalDataInventory {
  readonly schemaVersion: 1
  readonly storeNames: readonly string[]
  readonly excludes: readonly ['cache-storage', 'service-worker', 'manifest']
}
```

`storeNames` se deriva del mismo registro usado por migraciones/database e incluye metadata,
recoverySnapshots, player-groups, custom-categories, used-concepts, preferences,
role-assignment-history y stores posteriores de IMP-6..9. No se mantiene una segunda lista manual.

```ts
interface ActiveGameDataInventory {
  readonly gameId: string
  readonly deleters: readonly GameScopedDataDeleterId[]
}

type GameScopedDataDeleterId =
  | 'recovery'
  | 'concept-history'
  | 'role-history'
  | 'voting'
  | 'resolution'
  | 'scoring'
  | 'multiround'

interface DeleteRecoveryMarker {
  readonly status: 'idle' | 'deleting'
  readonly operationId: string | null
  readonly startedAt: string | null
}
```

Los deleters eliminan solo registros del gameId. El marker vive temporalmente en `localStorage`,
fuera del StoreRegistry, para sobrevivir a `deleteDatabase`; permite retomar fallback, recreacion y
verificacion tras crash y se elimina unicamente despues de `verifyEmpty`. Un fallo al escribirlo o
eliminarlo mantiene el flujo bloqueado y recuperable.

```ts
interface RematchSeed {
  readonly sourceGameId: string
  readonly newGameId: string
  readonly rosterDraft: PreparedRosterDraft
  readonly configurationDraft: GameConfigurationDraft
  readonly contentSelectionDraft: ContentSelectionDraft
}
```

Es public-only y propiedad de IMP-9; contiene solo drafts no confirmados. No contiene score,
contenido sorteado/confirmado, historiales, recovery ni secretos.

## Destructive commands

```ts
interface ConfirmedDestructiveAction {
  readonly confirmed: true
  readonly expectedRevision: number
}

type DestructiveScope = 'active-game' | 'all-local-data'
```

`active-game` conserva colecciones/preferencias; `all-local-data` vacia todo el inventario. Ambos son
idempotentes. Cancelacion no crea comando.

## HelpContentVersion

```ts
interface HelpContentVersion {
  readonly version: number
  readonly locale: 'es'
  readonly sections: readonly string[]
}
```

Las secciones son claves i18n, no HTML remoto, y cubren setup, contenido, privacidad, pistas, voto,
resolucion y multirronda.

## State transitions

```text
platform ready + onboarding pending -> onboarding -> skipped|completed -> Home
confirmed recovery -> derive adapter summary -> Home recoverable
Home continue -> adapter safeResumeRoute -> shared|covered surface
shared game menu -> pause request -> feature durable commit -> Home
shared game menu -> abandon confirm -> clear active-game -> Home empty
Settings -> preference command -> durable preference -> reflected shell
Settings -> delete confirm -> clear all inventory -> Home initial/no data
final ranking -> rematch -> new gameId -> editable players -> config review -> content review
```

Stale conflict recarga sin replay. Dialog/menu abierto no se recupera. Observer solo lee summary y
route; no pausa, abandona ni borra.
