# Tasks: Puntuacion y continuidad multirronda

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/scoring-multiround.md` y `quickstart.md`
**Jira Epic**: IMP-9
**Children**: `[IMP-56]`, `[IMP-57]`, `[IMP-58]`, `[IMP-59]`, `[IMP-60]`, `[IMP-61]` pendientes de asignacion

`[P]` indica trabajo paralelizable. Las pruebas de cada historia preceden su implementacion.

## Phase 1 - Setup and traceability

- [ ] T001 Verificar rama, `.specify/feature.json` y artefactos IMP-9.
- [ ] T002 [P] Reconciliar Scoreboard, Final ranking y Rematch en `specs/screen-inventory.md`.
- [ ] T003 Verificar mapeo IMP-56..IMP-61 a FR-001..030 y SC-001..010.
- [ ] T004 [P] Mantener `checklists/implementation.md` con gates pendientes.
- [ ] T005 Confirmar allowlist, tabla normativa y ownership IMP-4/5 antes de codigo.

## Phase 2 - Foundational

- [ ] T006 [P] Probar migracion v3 `game-scoreboards` en `tests/integration/persistenceMigrations.spec.ts` (FR-024..025).
- [ ] T007 [P] Probar guards/allowlist/invariantes en `src/domain/entities/scoringMultiround.test.ts` (FR-001..003).
- [ ] T008 [P] Probar transaccion, rollback, lease y proyeccion en `tests/integration/scoringMultiroundRepository.spec.ts` (FR-007..008, FR-023..027).
- [ ] T009 Implementar tipos y guards exactos en `src/domain/entities/scoringMultiround.ts` (FR-001..003).
- [ ] T010 Crear puerto publico en `src/domain/ports/scoringMultiround.ts` (FR-023..027).
- [ ] T011 Añadir migracion v3 y `game-scoreboards` al StoreRegistry/clearAllData en
  `src/infrastructure/persistence/migrations.ts`, con `persistenceMigrations.spec.ts` y `persistenceGateway.spec.ts` (FR-024..025).
- [ ] T012 Implementar envelope/proyeccion en `src/infrastructure/persistence/scoringMultiroundRepository.ts` (FR-007..009, FR-024..027).
- [ ] T013 Integrar `scoreboard-active` en `src/features/platform/services/recoveryRuntime.ts` y tests (FR-023..025).

## Phase 3 - [IMP-56] Registrar una ronda una sola vez

- [ ] T014 [P] [IMP-56] Probar tabla para 1, 2 y 3 impostores en `src/domain/entities/scoringMultiround.test.ts` (FR-004..006, SC-001).
- [ ] T015 [P] [IMP-56] Probar attempts, autores invalidos y movimientos unicos en `src/domain/entities/scoringMultiround.test.ts` (FR-004..006, FR-009).
- [ ] T016 [P] [IMP-56] Probar retry, colision, ronda inesperada y agregado final en `tests/integration/scoringMultiroundRepository.spec.ts` (FR-003, FR-008).
- [ ] T017 [P] [IMP-56] Probar apply atomico/no-op/rollback en `tests/integration/scoringMultiroundRepository.spec.ts` (FR-007..008, SC-002).
- [ ] T018 [IMP-56] Implementar movimientos normativos multi-impostor en `src/domain/entities/scoringMultiround.ts` (FR-004..006, FR-009).
- [ ] T019 [IMP-56] Implementar `AppliedResultRecord`, RoundPreparationSource, ledger, totales e idempotencia en `src/domain/entities/scoringMultiround.ts` (FR-007..009).
- [ ] T020 [IMP-56] Implementar `applyResult` transaccional y `ResolutionScoringCoordinator` interno en `src/infrastructure/persistence/scoringMultiroundRepository.ts` (FR-007..009).
- [ ] T021 [IMP-56] Crear servicio public-only con `refreshAfterResolution` y tests en `src/features/scoring-multiround/services/scoringMultiroundService.ts` (FR-007..008, FR-023).

## Phase 4 - [IMP-57] Marcador y ranking estables

- [ ] T022 [P] [IMP-57] Probar orden, roster, `1,1,3` y empates maximos en dominio (FR-010..011, SC-003).
- [ ] T023 [P] [IMP-57] Probar proyeccion sin roles/intentos/eliminados/movimientos (FR-012, FR-026..027, SC-008).
- [ ] T024 [P] [IMP-57] Probar loading/ready/final/shared-winners en `src/features/scoring-multiround/components/ScoringMultiroundScreen.test.tsx` (FR-012, FR-028).
- [ ] T025 [IMP-57] Implementar ranking, posiciones y leader/winner en dominio (FR-010..012).
- [ ] T026 [IMP-57] Implementar proyeccion y validacion totals-ledger en repositorio (FR-010..012, FR-025..027).
- [ ] T027 [IMP-57] Crear `src/features/scoring-multiround/components/ScoringMultiroundScreen.tsx` y `hooks/useScoringMultiround.ts` (FR-012, FR-028..029).

## Phase 5 - [IMP-58] Coordinador IMP-4 -> IMP-5

- [ ] T028 [P] [IMP-58] Probar `next-round`/`final-ranking` solo por numero/total (FR-013, SC-004).
- [ ] T029 [P] [IMP-58] Probar orden, llamada unica, doble click y stale en `src/features/scoring-multiround/services/roundPreparationCoordinator.test.ts` (FR-014..017).
- [ ] T030 [P] [IMP-58] Probar agotamiento/RNG/roles/quota/writer en `tests/integration/scoringMultiroundRepository.spec.ts` (FR-017).
- [ ] T031 [IMP-58] Implementar `createNextRoundRequest` e invariantes (FR-013..015).
- [ ] T032 [IMP-58] Implementar confirmacion idempotente en `scoringMultiroundRepository.ts` y `scoringMultiroundService.ts` (FR-014..015).
- [ ] T033 [IMP-58] Crear `src/features/scoring-multiround/services/roundPreparationCoordinator.ts` y `prepareNextFromScoreboard` atomico sobre
  game-scoreboards/used-concepts/role-history/recovery/metadata (FR-014..017).
- [ ] T034 [IMP-58] Integrar retry y handoff publico IMP-5 en `roundPreparationCoordinator.ts` sin tocar allocation history (FR-016..017).

## Phase 6 - [IMP-59] Final, revancha y nueva partida

- [ ] T035 [P] [IMP-59] Probar final, bloqueo de ronda extra y recovery del ranking (FR-013, FR-018).
- [ ] T036 [P] [IMP-59] Probar preserve/reset y nuevo gameId de RematchSeed (FR-019..022, SC-007).
- [ ] T037 [P] [IMP-59] Probar ruta UI jugadores -> configuracion -> contenido (FR-019..022).
- [ ] T038 [IMP-59] Implementar `confirmFinal` y ganadores compartidos durables (FR-018).
- [ ] T039 [IMP-59] Implementar RematchSeed publico atomico sin ledger/secrets/histories (FR-019..020).
- [ ] T040 [IMP-59] Integrar rematch/new-game en `src/app/App.tsx` reutilizando IMP-2/3/4 (FR-019..022).

## Phase 7 - [IMP-60] Recovery, observer and privacy

- [ ] T041 [P] [IMP-60] Probar recovery scoreboard/final, revision y callback unico en integration (FR-023..025, SC-006).
- [ ] T042 [P] [IMP-60] Probar observer y future/partial data sin borrado (FR-023..025).
- [ ] T043 [P] [IMP-60] Auditar URL/navigation/error/consola/payloads en E2E (FR-026..027, SC-008).
- [ ] T044 [IMP-60] Implementar load por recovery reference, stale reload y safe mode (FR-023..025).
- [ ] T045 [IMP-60] Implementar observer publico en service/hook/screen (FR-023, FR-026).
- [ ] T046 [IMP-60] Crear `src/features/scoring-multiround/services/scoringContinuityAdapter.ts` y su
  test `src/features/scoring-multiround/services/scoringContinuityAdapter.test.ts` public-only;
  exponer capability/slot sin renderizar Game Menu (FR-023..028).

## Phase 8 - [IMP-61] Integration and gates

- [ ] T047 [IMP-61] Completar `src/i18n/es.ts` y `src/styles/global.css` (FR-028..029).
- [ ] T048 [P] [IMP-61] Crear `tests/e2e/scoring-multiround.spec.ts` (SC-001..008).
- [ ] T049 [P] [IMP-61] Crear `tests/accessibility/scoring-multiround.spec.ts` (SC-009..010).
- [ ] T050 [P] [IMP-61] Añadir privacy E2E y verificar bundle <= 180 KiB gzip (FR-027..030).
- [ ] T051 [IMP-61] Ejecutar quickstart y todos los gates; registrar evidencia.
- [ ] T052 [IMP-61] Reconciliar docs, PR, CI/Pages y estados IMP-9/IMP-56..61.

## Dependencies and parallel work

Phase 2 bloquea todas las historias. [IMP-56] desbloquea [IMP-57]/[IMP-58]; [IMP-58] precede multirronda y
[IMP-59]. [IMP-60] puede avanzar tras el repositorio de [IMP-56], pero requiere [IMP-57]/[IMP-59] para su matriz
final. [IMP-61] sigue a las cinco historias. `[P]` es seguro solo cuando no comparte archivo; las
implementaciones en dominio, repositorio, servicio, `App.tsx`, i18n y CSS se serializan.

## MVP

T001-T021 acepta, puntua una vez y recupera proyeccion publica. T022-T034 completa marcador y
siguiente ronda. T035-T052 cierra lifecycle y entrega.
