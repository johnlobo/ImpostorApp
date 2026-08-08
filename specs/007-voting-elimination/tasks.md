# Tasks: Votacion, empates y eliminacion

**Input**: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/voting-elimination.md` y `quickstart.md`
**Jira Epic**: IMP-7
**Children**: `[IMP-44]`, `[IMP-45]`, `[IMP-46]`, `[IMP-47]`, `[IMP-48]`, `[IMP-49]` pendientes de asignacion

`[P]` indica trabajo paralelizable. Las pruebas de cada historia preceden su implementacion.

## Phase 1 - Setup and traceability

- [ ] T001 Verificar rama `007-voting-elimination`, `.specify/feature.json` y artefactos finales.
- [ ] T002 [P] Reconciliar Shared voting, Private ballot y Tiebreak con `specs/screen-inventory.md`.
- [ ] T003 Verificar mapeo IMP-44..IMP-49 a FR-001..029 y SC-001..009.
- [ ] T004 [P] Mantener `checklists/implementation.md` con gates pendientes.
- [ ] T005 Confirmar contrato `VoteResolutionHandoff`, cardinalidades single/successive y privacidad antes de codigo.

## Phase 2 - Foundational envelope and ports

- [ ] T006 [P] Probar guards, cardinalidades y allowlists en `src/domain/entities/votingElimination.test.ts` (FR-001..006, FR-017).
- [ ] T007 [P] Probar prepare/round-trip/rollback/revision/lease en `tests/integration/votingEliminationRepository.spec.ts` (FR-018..023).
- [ ] T008 [P] Probar proyeccion publica y papeleta privada sin elecciones previas en integration (FR-007..010, FR-021..023).
- [ ] T009 Implementar tipos, guards y copias defensivas en `src/domain/entities/votingElimination.ts` (FR-001..006, FR-017).
- [ ] T010 Crear puerto publico y acceso privado minimo en `src/domain/ports/votingElimination.ts` (FR-007..010, FR-021).
- [ ] T011 Implementar envelope `voting-active` preservando ResolutionLedger opaco en `src/infrastructure/persistence/votingEliminationRepository.ts` (FR-018..023).
- [ ] T012 Integrar repositorio en `src/features/platform/services/recoveryRuntime.ts` y tests de recovery (FR-022..023).
- [ ] T013 Confirmar en tests de `persistenceMigrations.spec.ts` que IMP-7 no añade tabla/migracion y clear-all sigue cubriendo stores.

## Phase 3 - [IMP-44] Decision verbal single/successive

- [ ] T014 [P] [IMP-44] Probar verbal successive y un impostor con exactamente un sospechoso (FR-005, FR-024..025).
- [ ] T015 [P] [IMP-44] Probar verbal single multi-impostor con 1..impostorCount IDs simultaneos, duplicados y fuera de roster (FR-005, FR-024).
- [ ] T016 [P] [IMP-44] Probar draft/cancel sin write y confirmacion persist-first idempotente en service/repository (FR-018..020).
- [ ] T017 [IMP-44] Implementar validacion y resultado verbal agregado en `src/domain/entities/votingElimination.ts` (FR-005, FR-024..026).
- [ ] T018 [IMP-44] Implementar confirmacion verbal atomica y `VoteResolutionHandoff` en repository (FR-017..020, FR-024).
- [ ] T019 [IMP-44] Crear estado verbal en `src/features/voting-elimination/services/votingEliminationService.ts` y tests (FR-005, FR-018..020).
- [ ] T020 [IMP-44] Implementar seleccion verbal simultanea en `src/features/voting-elimination/components/VotingScreen.tsx` y test (FR-005, FR-024, FR-027).

## Phase 4 - [IMP-45] Papeletas secretas privadas

- [ ] T021 [P] [IMP-45] Probar approval sets: uno en successive y 1..impostorCount en single (FR-003..006, SC-001).
- [ ] T022 [P] [IMP-45] Probar auto-seleccion, duplicados, votante/candidato ajeno y cardinalidad invalida (FR-004..006).
- [ ] T023 [P] [IMP-45] Probar persist-before-completed, irrevocabilidad y doble confirmacion en integration (FR-008..009, FR-018..020, SC-002).
- [ ] T024 [P] [IMP-45] Probar covered/selecting/confirming/saving/concealed y desmontaje DOM en `PrivateBallot.test.tsx` (FR-007..010).
- [ ] T025 [IMP-45] Implementar creacion/confirmacion de `SecretVote` canonico en dominio y repositorio (FR-003..009).
- [ ] T026 [IMP-45] Implementar open/confirm/conceal serializado en `votingEliminationService.ts` (FR-007..010, FR-018..020).
- [ ] T027 [IMP-45] Crear `src/features/voting-elimination/components/PrivateBallot.tsx` sin Game Menu (FR-007..010, FR-027..028).
- [ ] T028 [IMP-45] Implementar progreso compartido N/N bloqueado hasta votos durables en `VotingScreen.tsx` (FR-010..011, FR-027).

## Phase 5 - [IMP-46] Aprobaciones, corte y desempate

- [ ] T029 [P] [IMP-46] Probar conteo de aprobaciones, positivos, maxSlots y prefijo sin empate (FR-012, SC-004).
- [ ] T030 [P] [IMP-46] Probar empate que cruza corte con provisionales y pendingSlots en single 2/3 (FR-013..015, SC-005).
- [ ] T031 [P] [IMP-46] Probar papeleta de desempate, auto-voto y cantidad `min(pendingSlots,candidatesExceptSelf)` (FR-013..016).
- [ ] T032 [P] [IMP-46] Probar segundo empate: descartar provisionales, cero eliminados y `persistent-tie/second-tie` (FR-015..017).
- [ ] T033 [IMP-46] Implementar recuento puro, orden por aprobaciones y deteccion de corte en dominio (FR-012..013).
- [ ] T034 [IMP-46] Implementar creacion/recuento de unico desempate y union de provisionales (FR-013..016).
- [ ] T035 [IMP-46] Implementar count/result persist-first y callback unico hacia IMP-8 en repository/service (FR-017..020).
- [ ] T036 [IMP-46] Integrar estados ready-to-count/counting/tiebreak/result en `VotingScreen.tsx` y tests (FR-027..028).

## Phase 6 - [IMP-47] Successive handoff sin resolver victoria

- [ ] T037 [P] [IMP-47] Probar handoff single 1..K y successive exactamente uno, listas canonicas y motivos (FR-017, FR-024..025).
- [ ] T038 [P] [IMP-47] Probar que IMP-7 no consulta roles, no deriva supervivientes y espera nuevo `CluePhaseHandoff` (FR-025..026).
- [ ] T039 [IMP-47] Implementar `VoteResolutionHandoff` exacto y validacion eliminated/persistent-tie (FR-017, FR-024..025).
- [ ] T040 [IMP-47] Implementar cierre de fase y espera successive en service sin preparar pistas/victoria (FR-025..026).
- [ ] T041 [IMP-47] Integrar callback durable IMP-8 y reentrada por siguiente handoff en `src/app/App.tsx` (FR-017, FR-025..026).

## Phase 7 - [IMP-48] Recovery, observer and privacy

- [ ] T042 [P] [IMP-48] Probar reload offline de draft publico, votos, tiebreak y resultado sin abrir papeleta (FR-022, SC-007).
- [ ] T043 [P] [IMP-48] Probar observer sin comandos/private access y future/partial safe mode (FR-021..023, SC-008).
- [ ] T044 [P] [IMP-48] Auditar DOM compartido, URL, navigation, errores, consola y payloads en E2E (FR-010, FR-023, SC-003).
- [ ] T045 [IMP-48] Implementar recovery siempre a lista compartida, stale reload y safe mode en repository/service (FR-020..023).
- [ ] T046 [IMP-48] Crear `src/features/voting-elimination/services/votingContinuityAdapter.ts` y su
  test `src/features/voting-elimination/services/votingContinuityAdapter.test.ts` con ruta
  shared/checkpoint sin voto; exponer capability/slot, sin renderizar Game Menu (FR-021..023, FR-027).

## Phase 8 - [IMP-49] Integration and gates

- [ ] T047 [IMP-49] Completar textos en `src/i18n/es.ts` y estilos en `src/styles/global.css` (FR-028).
- [ ] T048 [P] [IMP-49] Crear `tests/e2e/voting-elimination.spec.ts` para verbal, secreto, simultaneous single, corte, tiebreak, reload y offline (SC-001..007).
- [ ] T049 [P] [IMP-49] Crear `tests/accessibility/voting-elimination.spec.ts` para axe, teclado, foco, dialogs, 320 px y Game Menu (SC-009).
- [ ] T050 [P] [IMP-49] Validar observer/privacy y bundle <= 180 KiB gzip (FR-021..029, SC-003/008/009).
- [ ] T051 [IMP-49] Ejecutar `quickstart.md`, format, lint, typecheck, unit, integration, build, E2E y offline smoke.
- [ ] T052 [IMP-49] Reconciliar docs/checklist, PR, CI/Pages y estados IMP-7/IMP-44..49.

## Dependencies and parallel work

Phase 2 bloquea todas las historias. [IMP-44] y [IMP-45] pueden avanzar en paralelo tras los contratos;
[IMP-46] depende de papeletas secretas [IMP-45]. [IMP-47] depende del resultado durable [IMP-44]/[IMP-46]. [IMP-48]
puede comenzar tras el envelope, pero su matriz final requiere [IMP-46]/[IMP-47]. [IMP-49] sigue a las
cinco historias. `[P]` solo es seguro sin archivos compartidos; dominio, repositorio, servicio,
`VotingScreen.tsx`, `App.tsx`, i18n y CSS se serializan.

## MVP

T001-T020 entrega votacion verbal durable. T021-T036 añade secreto, aprobaciones, corte y desempate.
T037-T052 completa successive, recovery y entrega.
