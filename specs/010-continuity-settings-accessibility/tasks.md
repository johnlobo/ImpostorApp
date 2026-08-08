# Tasks: Continuidad, ayuda, ajustes y accesibilidad

**Input**: Artefactos de `specs/010-continuity-settings-accessibility/`

Todas las tareas permanecen pendientes. `[IMP-62]`..`[IMP-68]` son los hijos Jira creados bajo IMP-10.

## Phase 1: Setup and traceability

- [ ] T001 Verificar la rama `010-continuity-settings-accessibility` y actualizar `.specify/feature.json`
- [ ] T002 [P] Validar spec, checklist de requisitos, plan, research, data model, contrato y quickstart de IMP-10
- [ ] T003 Crear la matriz FR-001..FR-023 y SC-001..SC-008 en `specs/010-continuity-settings-accessibility/checklists/implementation.md`
- [ ] T004 [P] Inventariar adapters, discriminante versionado y cardinalidad exact-one en `specs/010-continuity-settings-accessibility/contracts/continuity-settings-accessibility.md`
- [ ] T005 [IMP-68] Verificar trazabilidad y parentage de IMP-62..IMP-68 en Jira

## Phase 2: Foundational contracts and persistence

- [ ] T006 Crear tipos, guards, defaults y copias defensivas en `src/domain/entities/continuity.ts`
- [ ] T007 [P] Cubrir resumen, rutas, preferencias, scopes destructivos e inventario en `src/domain/entities/continuity.test.ts`
- [ ] T008 [P] Definir puertos de continuidad, preferencias, feedback, ayuda y borrado en `src/domain/ports/continuity.ts`
- [ ] T009 Extender `UserPreferences` y sus guards versionados en `src/domain/entities/platform.ts`
- [ ] T010 [P] Cubrir compatibilidad, defaults y datos futuros de preferencias en `src/domain/entities/platform.test.ts`
- [ ] T011 Implementar upgrade de value `UserPreferences` v1->v2 en `src/infrastructure/persistence/migrations.ts` sin crear store nuevo
- [ ] T012 Implementar `PreferencesRepository` con merge optimista en `src/infrastructure/persistence/preferencesRepository.ts`
- [ ] T013 Modelar ActiveGameDataInventory, deleters game-scoped y marker protocol en `src/infrastructure/persistence/localDataRepository.ts`
- [ ] T014 [P] Probar migracion, round-trip, revision, lease y rollback en `tests/integration/continuityRepositories.spec.ts`

## Phase 3: User Story 1 - Home y continuidad segura [IMP-62]

**Independent test**: Home solo ofrece continuidad con un snapshot confirmado y continuar abre la
ultima superficie compartida o cubierta sin transportar secretos ni repetir comandos.

- [ ] T015 [IMP-62] Implementar registry y seleccion de adaptadores en `src/features/continuity/services/continuityService.ts`
- [ ] T016 [IMP-62] Implementar derivacion de `SafeResumeSummary` y `SafeResumeRoute` sin payload secreto en `src/features/continuity/services/continuityService.ts`
- [ ] T017 [P] [IMP-62] Registrar adapters feature-owned IMP-2..9 en
  `src/features/continuity/services/continuityAdapters.ts` y probar exact-one/zero/multiple en
  `src/features/continuity/services/continuityAdapters.test.ts`
- [ ] T018 [IMP-62] Crear `useContinuity` con estados empty, recoverable, observer, safe-mode y error en `src/features/continuity/hooks/useContinuity.ts`
- [ ] T019 [IMP-62] Crear Home real con readiness, nueva partida, grupos, ayuda, ajustes y continuidad en `src/features/continuity/components/HomeScreen.tsx`
- [ ] T020 [P] [IMP-62] Probar no-game, resumen public-only, private recovery cubierta y observer en `src/features/continuity/components/HomeScreen.test.tsx`
- [ ] T021 [P] [IMP-62] Probar seleccion de adaptador, reload sin replay y errores seguros en `src/features/continuity/services/continuityService.test.ts`

## Phase 4: User Story 2 - Pausa, abandono y descarte [IMP-63]

**Independent test**: Pausar confirma primero el estado de la feature y solo despues navega a Home;
abandonar y descartar comparten un borrado confirmado del agregado activo.

- [ ] T022 [IMP-63] Implementar orquestacion `pauseForHome` persist-before-navigation en `src/features/continuity/services/continuityService.ts`
- [ ] T023 [IMP-63] Implementar la unica autoridad `clearActiveGame` con deleters game-scoped, conservando colecciones y preferencias
- [ ] T024 [IMP-63] Crear Game Menu y dialogo de abandono accesible en `src/features/continuity/components/GameMenu.tsx`
- [ ] T025 [IMP-63] Integrar el slot de Game Menu solo en superficies compartidas mediante `src/app/AppShell.tsx`
- [ ] T026 [P] [IMP-63] Probar timer pause, other-phase checkpoint, stale sin replay y fallo sin navegacion en `src/features/continuity/services/continuityService.test.ts`
- [ ] T027 [P] [IMP-63] Probar visibilidad shared/private, foco, cancelacion, doble pulsacion y copy destructivo en `src/features/continuity/components/GameMenu.test.tsx`
- [ ] T028 [P] [IMP-63] Probar scope active-game, rollback, lease e idempotencia en `tests/integration/continuityRepositories.spec.ts`

## Phase 5: User Story 3 - Onboarding y ayuda [IMP-64]

**Independent test**: La introduccion aparece segun preferencia, puede omitirse y la ayuda completa
permanece disponible offline con retorno a una superficie segura.

- [ ] T029 [IMP-64] Crear contenido local versionado y externalizado en `src/features/continuity/data/esHelpContent.ts`
- [ ] T030 [IMP-64] Implementar servicio de onboarding sobre preferencias en `src/features/continuity/services/preferencesService.ts`
- [ ] T031 [IMP-64] Crear introduccion omisible sin delays ni controles debug en `src/features/continuity/components/OnboardingScreen.tsx`
- [ ] T032 [IMP-64] Crear ayuda offline y retorno seguro en `src/features/continuity/components/HelpScreen.tsx`
- [ ] T033 [P] [IMP-64] Probar pending, skip, complete, version y reapertura offline en `src/features/continuity/services/preferencesService.test.ts`
- [ ] T034 [P] [IMP-64] Probar contenido, teclado, retorno shared/covered y ausencia de reglas mock en `src/features/continuity/components/HelpScreen.test.tsx`

## Phase 6: User Story 4 - Preferencias y feedback [IMP-65]

**Independent test**: Sonido, vibracion, adulto y contraste se restauran por separado; APIs ausentes
no bloquean y ningun feedback permite inferir un secreto.

- [ ] T035 [IMP-65] Implementar carga y comandos independientes de preferencias en `src/features/continuity/services/preferencesService.ts`
- [ ] T036 [IMP-65] Crear deliberadamente `src/infrastructure/device/browserFeedback.ts` para gateways opcionales de audio y vibracion
- [ ] T037 [IMP-65] Crear Settings con toggles semanticos, ayuda y danger zone en `src/features/continuity/components/SettingsScreen.tsx`
- [ ] T038 [IMP-65] Aplicar alto contraste y reduced motion desde preferencias en `src/app/AppShell.tsx` y `src/styles/global.css`
- [ ] T039 [P] [IMP-65] Probar merge, offline, API ausente/denegada y cues secret-independent en `src/features/continuity/services/preferencesService.test.ts`
- [ ] T040 [P] [IMP-65] Probar toggles, adulto sin bypass, contraste y sin selector de idioma en `src/features/continuity/components/SettingsScreen.test.tsx`

## Phase 7: User Story 5 - Borrado global seguro [IMP-66]

**Independent test**: Confirmar vacia todos los stores registrados y conserva la PWA instalada;
cancelar o fallar no declara un reset completo.

- [ ] T041 [IMP-66] Crear `src/infrastructure/persistence/storeRegistry.ts` y consumirlo desde
  `src/infrastructure/persistence/migrations.ts`, `src/infrastructure/persistence/database.ts`,
  `src/infrastructure/persistence/dexiePersistenceGateway.ts` y `src/infrastructure/persistence/localDataRepository.ts`
- [ ] T042 [IMP-66] Implementar `clearAllLocalData`, marker, fallback/reinitialize y `verifyEmpty` en
  `src/infrastructure/persistence/localDataRepository.ts`
- [ ] T043 [IMP-66] Integrar delete-all con recovery y writer lease en `src/features/platform/services/recoveryService.ts`
- [ ] T044 [IMP-66] Crear dialogo con inventario y estados deleting/error/retry en `src/features/continuity/components/SettingsScreen.tsx`
- [ ] T045 [P] [IMP-66] Probar todos los stores, fallback recuperable, metadata, historiales e idempotencia en `tests/integration/continuityRepositories.spec.ts`
- [ ] T046 [P] [IMP-66] Probar cache/service worker preservados y reapertura offline en `tests/e2e/continuity-settings.spec.ts`

## Phase 8: User Story 6 - Shell accesible y rematch [IMP-67]

**Independent test**: El inventario completo funciona a 320 px y zoom 200 %, con foco y semantica;
revancha crea gameId nuevo y recorre las tres revisiones editables.

- [ ] T047 [IMP-67] Refactorizar `src/app/AppShell.tsx` con skip link, landmarks, safe areas, body y CTA estable
- [ ] T048 [IMP-67] Extender `src/app/navigation.ts` con Home, settings, help, safe resume y rematch publicos
- [ ] T049 [IMP-67] Integrar Home, onboarding, settings, menu y safe routes en `src/app/App.tsx`
- [ ] T050 [IMP-67] Consumir `RematchSeed` publico de IMP-9 y enrutar reviews IMP-2/3/4 en `src/app/App.tsx`, sin implementar data policy
- [ ] T051 [IMP-67] Externalizar copy nuevo en `src/i18n/es.ts` y completar tokens/layout en `src/styles/global.css`
- [ ] T052 [P] [IMP-67] Probar shell, navigation, rematch y privacidad de navigation state en `src/app/App.test.tsx`
- [ ] T053 [P] [IMP-67] Crear matriz axe, teclado, dialogs, zoom, contraste y reduced motion en `tests/accessibility/app-shell.spec.ts`

## Phase 9: Integration and delivery [IMP-68]

- [ ] T054 [P] [IMP-68] Crear E2E de Home, pause, resume, abandon, onboarding, settings y privacy sinks en `tests/e2e/continuity-settings.spec.ts`
- [ ] T055 [IMP-68] Ejecutar quickstart, format, lint, typecheck, unitarios, integracion, build, bundle y Playwright; registrar evidencia en `specs/010-continuity-settings-accessibility/checklists/implementation.md`

## Dependencies

- Phase 2 bloquea todas las historias; T012 depende de T006, T008, T009 y T011.
- [IMP-62] entrega registry, summary y safe route que consumen [IMP-63], [IMP-64] y la integracion final.
- [IMP-63] depende de T013 y de los comandos publicos de pausa de cada feature implementada.
- [IMP-64] y [IMP-65] pueden avanzar en paralelo despues de T012.
- [IMP-66] depende del inventario T013 y debe completarse despues de registrar stores de IMP-6..IMP-9.
- [IMP-67] depende de Home/safe routes, preferencias y Game Menu; rematch depende del handoff publico de IMP-9.
- [IMP-68] depende de las seis historias y de la matriz de privacidad/accesibilidad.

## Parallel examples

- T007, T008 y T010 pueden avanzar en paralelo tras definir T006/T009.
- T017, T020 y T021 pueden dividir adaptadores, componente y servicio de [IMP-62].
- T026, T027 y T028 cubren servicio, UI e infraestructura de [IMP-63] en paralelo.
- T033/T034 y T039/T040 pueden ejecutarse por separado para onboarding/help y preferencias/UI.
- T045 y T046 separan atomicidad local de preservacion PWA.
- T052, T053 y T054 separan integracion React, accesibilidad y recorrido E2E.
