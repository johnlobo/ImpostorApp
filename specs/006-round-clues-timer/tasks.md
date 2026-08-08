# Tasks: Desarrollo de rondas, pistas y temporizador

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/round-session.md` y `quickstart.md`
**Jira**: IMP-38..IMP-43 bajo IMP-6

## Phase 1 - Setup and traceability

- [ ] T001 Verificar rama `006-round-clues-timer` y puntero `.specify/feature.json`.
- [ ] T002 [P] Validar artefactos IMP-6 y `specs/screen-inventory.md`.
- [ ] T003 Reconciliar trazabilidad de IMP-38..IMP-43 sin ampliar alcance.
- [ ] T004 [P] Mantener `checklists/implementation.md` con gates y evidencia.
- [ ] T005 Mapear FR-001..FR-029 y SC-001..SC-011 a tareas y pruebas.

## Phase 2 - Foundational

- [ ] T006 Crear tipos, guards, copias defensivas e invariantes en `src/domain/entities/roundSession.ts` (FR-001..007, FR-020..023, FR-027).
- [ ] T007 [P] Crear `RoundSessionRepository` en `src/domain/ports/roundSession.ts` (FR-014..021, FR-024).
- [ ] T008 [P] Crear matrices base en `src/domain/entities/roundSession.test.ts` (SC-001, SC-005, SC-008, SC-010).
- [ ] T009 Extender fases y guards de recovery en `src/domain/entities/platform.ts` y su test (FR-018..019, FR-021).
- [ ] T010 Implementar envelope, ledger de IMP-8 opaco y proyeccion publica en `src/infrastructure/persistence/roundSessionRepository.ts` (FR-006, FR-014..021).
- [ ] T011 [P] Cubrir round-trip, rollback, revision y lease en `tests/integration/roundSessionRepository.spec.ts`.
- [ ] T012 Integrar recovery en `src/features/platform/services/recoveryRuntime.ts` y
  `src/features/platform/services/recoveryService.ts`, con `src/features/platform/services/recoveryService.test.ts` (FR-018..019).
- [ ] T013 Verificar ausencia de migracion nueva, borrado y safe mode en `tests/integration/persistenceMigrations.spec.ts` y `tests/integration/persistenceGateway.spec.ts`.

## Phase 3 - US1 Orden e inicio durable (IMP-38)

- [ ] T014 [IMP-38] Implementar preparacion idempotente y `PreparedRound.totalRounds` (FR-001..003).
- [ ] T015 [IMP-38] Implementar roster/free y Fisher-Yates con RNG validado (FR-003..005).
- [ ] T016 [IMP-38] Implementar begin persist-first y ready a active (FR-002, FR-007..009).
- [ ] T017 [IMP-38] Implementar progreso durable y token `expectedTurnIndex` sin saltos (FR-024, FR-027).
- [ ] T018 [P] [IMP-38] Probar RNG, orden, free, doble advance y ultimo turno en `src/domain/entities/roundSession.test.ts` (SC-001, SC-005, SC-010).
- [ ] T019 [P] [IMP-38] Probar atomicidad, recovery y cero RNG repetido en integracion (SC-001, SC-010).

## Phase 4 - US2 Conversacion y reloj (IMP-39)

- [ ] T020 [IMP-39] Implementar deadline, maximum y expiracion efectiva (FR-007..012, FR-018).
- [ ] T021 [IMP-39] Implementar pause/resume persist-first y no-ops (FR-010, FR-017, FR-024).
- [ ] T022 [IMP-39] Rechazar reloj no finito y normalizar expiry antes de mutar (FR-010..012, FR-024).
- [ ] T023 [IMP-39] Crear scheduler inyectable para visibility/pageshow en `src/features/round-session/hooks/useRoundSession.ts` (FR-011..012, FR-018).
- [ ] T024 [P] [IMP-39] Probar free/timed/custom/background/saltos/no reset (SC-002..004, SC-007, SC-011).
- [ ] T025 [P] [IMP-39] Probar persistencia de pause/resume/expired/no-op/rollback (SC-002, SC-005..007).
- [ ] T026 [P] [IMP-39] Probar scheduler sin escrituras y anuncios por hitos (SC-002, SC-009).

## Phase 5 - US3 Cierre y handoff (IMP-40)

- [ ] T027 [IMP-40] Implementar solicitud/cancelacion de confirmacion sin escritura (FR-013).
- [ ] T028 [IMP-40] Implementar close durable, idempotente y motivo efectivo (FR-013..016, FR-024).
- [ ] T029 [IMP-40] Construir `CluePhaseHandoff` publico canonico hacia IMP-7 (FR-015).
- [ ] T030 [IMP-40] Implementar `src/features/round-session/services/roundSessionService.ts` serializado y sin replay (FR-016..017, FR-024).
- [ ] T031 [P] [IMP-40] Probar doble click, fallos, stale, expiry y callback post-commit (SC-004..006).
- [ ] T032 [P] [IMP-40] Probar close e invariantes exactas de handoffs (SC-005..006).

## Phase 6 - US4 Recovery seguro (IMP-41)

- [ ] T033 [IMP-41] Recuperar ready/clues/discussion/running/paused/expired/closed (FR-018).
- [ ] T034 [IMP-41] Implementar observer estrictamente publico sin comandos (FR-017..019).
- [ ] T035 [IMP-41] Implementar incompatible/safe mode sin borrado y errores tipados (FR-019, FR-024).
- [ ] T036 [P] [IMP-41] Probar reload offline, progreso, deadline, writer y stale (SC-005..008, SC-010).
- [ ] T037 [P] [IMP-41] Auditar URL, navegacion, errores, consola y payload publico (FR-006, FR-019, SC-006).

## Phase 7 - US5 Fases sucesivas (IMP-42)

- [ ] T038 [IMP-42] Implementar `NextCluePhaseRequest` como entrada de prepareNext (FR-020..023).
- [ ] T039 [IMP-42] Validar subconjunto estricto, unicidad, phase+1 y canonicalizacion (FR-020..021).
- [ ] T040 [IMP-42] Preparar nueva fase/orden/RNG sin inferir eliminaciones (FR-020..023).
- [ ] T041 [IMP-42] Conservar active snapshot y handoffs minimos exactos (FR-021).
- [ ] T042 [P] [IMP-42] Probar empty/full/duplicate/foreign/stale/open/gap y rollback (SC-008).
- [ ] T043 [P] [IMP-42] Probar varias fases, nuevo random, ledger opaco inalterado, historial y privacidad (SC-006, SC-008).

## Phase 8 - Integration and delivery (IMP-43)

- [ ] T044 [IMP-43] Integrar `RoundHandoff -> RoundSessionScreen -> CluePhaseHandoff` en `src/app/App.tsx` y
  crear `src/features/round-session/services/roundSessionContinuityAdapter.ts` public-only (FR-001, FR-015, FR-029).
- [ ] T045 [IMP-43] Crear `src/features/round-session/components/RoundSessionScreen.tsx` y test con inventario,
  CTA unica y capability/slot shared; solo IMP-10 renderiza Game Menu (FR-025, FR-027..029).
- [ ] T046 [IMP-43] Añadir textos en `src/i18n/es.ts` y estilos en `src/styles/global.css` (FR-025, FR-028).
- [ ] T047 [P] [IMP-43] Crear `tests/e2e/round-session.spec.ts` para roster/random/free/timer/close/reload/offline (SC-001..008, SC-010..011).
- [ ] T048 [P] [IMP-43] Crear `tests/accessibility/round-session.spec.ts` para teclado/axe/anuncios/320px/menu (SC-009, SC-011).
- [ ] T049 [IMP-43] Ejecutar `specs/006-round-clues-timer/quickstart.md` y gates; registrar evidencia en `specs/006-round-clues-timer/checklists/implementation.md`.
- [ ] T050 [IMP-43] Publicar PR, validar CI/Pages y reconciliar IMP-6/IMP-38..43 en Jira.

## Dependencies and parallel work

Phase 2 bloquea todas las historias. IMP-38 desbloquea reloj, cierre y UI; IMP-39 aporta el reloj
efectivo usado por IMP-40; IMP-40 desbloquea IMP-42. IMP-41 puede avanzar parcialmente tras IMP-38.
Los pares marcados `[P]` pueden ejecutarse en paralelo cuando sus prerrequisitos esten completos.
