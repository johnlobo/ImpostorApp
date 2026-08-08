# Contract: Continuity, settings and accessible shell

## Public feature continuity port

```ts
interface PublicContinuityAdapter {
  readonly feature: SafeResumeRoute['feature']

  canHandle(discriminator: PublicRecoveryDiscriminator): boolean
  summarize(): Promise<StorageResult<SafeResumeSummary>>
  safeResumeRoute(): Promise<StorageResult<SafeResumeRoute>>
  capability(): ContinuityCapability

  pauseForHome(request: GamePauseRequest): Promise<StorageResult<PauseForHomeResult>>
}

interface PublicRecoveryDiscriminator {
  readonly feature: SafeResumeRoute['feature']
  readonly phase: PublicResumePhase
  readonly schemaVersion: number
  readonly revision: number
  readonly integrity: 'confirmed'
}
```

- El registry resuelve `exactly-one | unsupported | ambiguous`; los dos ultimos activan safe mode.
  Home nunca recibe payload interno.
- Cada adaptador lee/valida su propio estado desde su repositorio y proyecta una copia publica.
- `safeResumeRoute` nunca apunta a un secreto descubierto, papeleta, private-entry o dialogo.
- `pauseForHome` confirma antes de retornar. Conflict provoca reload sin replay.
- Observer puede summarize/route, pero los comandos retornan writer-unavailable.

## Continuity coordinator

```ts
interface ContinuityCoordinator {
  loadHome(): Promise<HomeState>
  continueGame(): Promise<StorageResult<SafeResumeRoute>>
  pauseGame(request: GamePauseRequest): Promise<StorageResult<SafeResumeRoute>>
  abandonGame(
    confirmation: ConfirmedDestructiveAction,
  ): Promise<StorageResult<'abandoned'>>
}

type HomeState =
  | { readonly status: 'empty'; readonly offlineReady: boolean }
  | {
      readonly status: 'recoverable'
      readonly offlineReady: boolean
      readonly summary: SafeResumeSummary
      readonly observer: boolean
    }
  | { readonly status: 'safe-mode'; readonly error: PublicPlatformError }
  | { readonly status: 'error'; readonly error: PublicPlatformError }
```

Ningun estado Home transporta el snapshot. Navegacion ocurre despues del resultado exitoso.
`abandonGame` usa exclusivamente `LocalDataRepository.clearActiveGame`; ningun adapter borra datos.

## Preferences port

```ts
interface PreferencesRepository {
  load(): Promise<StorageResult<LocalPreferences>>
  update(
    expectedUpdatedAt: string,
    change: PreferenceChange,
  ): Promise<StorageResult<LocalPreferences>>
}

type PreferenceChange =
  | { readonly type: 'sound'; readonly enabled: boolean }
  | { readonly type: 'vibration'; readonly enabled: boolean }
  | { readonly type: 'adult-content'; readonly enabled: boolean }
  | { readonly type: 'high-contrast'; readonly enabled: boolean }
  | { readonly type: 'onboarding'; readonly status: 'skipped' | 'completed'; readonly version: number }
```

Cambios se fusionan sobre el ultimo registro, son idempotentes y no alteran confirmaciones de juego.

## Optional feedback gateways

```ts
interface AudioFeedbackGateway {
  tryPlay(cue: FeedbackCue): Promise<void>
}

interface HapticFeedbackGateway {
  tryVibrate(cue: FeedbackCue): Promise<void>
}
```

Nunca rechazan hacia UI. Cues privados son genericos e indistinguibles en patron, duracion y timing.

## Local deletion port

```ts
interface LocalDataRepository {
  inventory(): LocalDataInventory
  activeGameInventory(gameId: string): ActiveGameDataInventory
  clearActiveGame(
    gameId: string,
    confirmation: ConfirmedDestructiveAction,
  ): Promise<StorageResult<'cleared'>>
  clearAllLocalData(
    confirmation: ConfirmedDestructiveAction,
  ): Promise<StorageResult<'cleared'>>
  verifyEmpty(): Promise<StorageResult<boolean>>
}
```

- Ambos comandos exigen writer lease y confirmacion; repetir sobre estado vacio es success sin efecto.
- `clearActiveGame` ejecuta una sola transaccion con todos los deleters game-scoped registrados; no
  borra grupos, custom categories ni preferences. El gameId debe coincidir con recovery y revision
  mostrados al confirmar; cualquier divergencia falla sin borrar.
- `clearAllLocalData` usa una transaccion sobre `inventory.storeNames`; exito requiere verifyEmpty.
- Cache Storage, service worker registration, manifest y assets no forman parte del inventario.
- Fallo devuelve `PublicPlatformError` sin nombres/valores de payload y permite retry/safe exit.

```ts
interface StoreRegistry {
  readonly storeNames: readonly string[]
  readonly gameScopedDeleters: readonly GameScopedDataDeleter[]
}

interface GameScopedDataDeleter {
  readonly id: GameScopedDataDeleterId
  clearGame(gameId: string, transaction: PersistenceTransaction): Promise<void>
}
```

El mismo registry alimenta migrations, database, gateway e inventario. Delete-all usa transaccion
normal; su fallback escribe un marker minimo en `localStorage`, fuera de StoreRegistry para
sobrevivir a `deleteDatabase`, recrea/reinicializa, verifica y elimina el marker antes de Home.
Fallo al escribir o eliminar el marker no declara exito.

## Rematch shell port

```ts
interface RematchShellPort {
  start(seed: RematchSeed): StorageResult<PreparedRematchDraft>
}
```

Requiere `newGameId !== sourceGameId` y devuelve un draft editable. IMP-9 posee el seed y la politica;
IMP-10 solo enruta por jugadores, configuracion y contenido.

## Help and onboarding

```ts
interface HelpContentProvider {
  current(): HelpContentVersion
}

interface OnboardingService {
  shouldOffer(): Promise<StorageResult<boolean>>
  skip(): Promise<StorageResult<LocalPreferences>>
  complete(): Promise<StorageResult<LocalPreferences>>
}
```

Contenido local, externalizado y offline. Cerrar ayuda retorna a `SafeResumeRoute` previa o Home,
nunca a una vista privada.

## Accessible shell contract

```ts
interface AccessibleShellProps {
  readonly titleKey: string
  readonly primaryAction?: PublicShellAction
  readonly gameMenu?: ContinuityCapability
  readonly returnRoute?: SafeResumeRoute
}
```

- Full viewport sin phone frame; safe areas; header compacto; main scrollable; footer estable.
- Una sola accion primaria por estado. Icon buttons tienen nombre accesible y target 44x44 px.
- Dialog/sheet: foco inicial, trap, Escape, background inert y restore al trigger.
- Toggle/segmented/progress/toast exponen rol/estado; estados no dependen solo de color.
- 320 px, zoom 200 %, teclado, lector, WCAG A/AA y reduced motion son gates.
- Game menu solo se inyecta con capability publica no privada; no recibe children secretos.

## Privacy matrix

Tests inspeccionan `SafeResumeSummary`, `SafeResumeRoute`, Home DOM, menu, settings, help, URL,
navigation state, errors, toasts, console y payloads serializados. Deben excluir concepto, categoria,
roles, companions, votos, respuestas y resultados privados. IMP-10 no introduce telemetria.
