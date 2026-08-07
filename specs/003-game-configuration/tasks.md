# Tasks: Configuracion de partida

**Input**: Artefactos de `specs/003-game-configuration/`

## Phase 1: Setup

- [X] T001 Actualizar el puntero de feature en `.specify/feature.json`
- [X] T002 [P] Registrar el contrato de configuracion en `specs/003-game-configuration/contracts/game-configuration.md`
- [X] T003 [P] Validar los escenarios de `specs/003-game-configuration/quickstart.md`

## Phase 2: Foundational

- [X] T004 Crear tipos, constantes y validacion base en `src/domain/entities/gameConfiguration.ts`
- [X] T005 [P] Crear el puerto de snapshot en `src/domain/ports/gameConfiguration.ts`
- [X] T006 [P] Crear pruebas de limites y defaults en `src/domain/entities/gameConfiguration.test.ts`
- [X] T007 Implementar el adaptador RecoverySnapshot en `src/infrastructure/persistence/gameConfigurationRepository.ts`
- [X] T008 [P] Probar round-trip, revision y datos incompatibles en `tests/integration/gameConfigurationRepository.spec.ts`

## Phase 3: User Story 1 - Configuracion valida rapida

- [X] T009 [US1] Implementar creacion de draft y comandos de rondas/impostores en `src/domain/entities/gameConfiguration.ts`
- [X] T010 [P] [US1] Cubrir roster y maximo derivado en `src/domain/entities/gameConfiguration.test.ts`
- [X] T011 [US1] Crear servicio de configuracion en `src/features/game-configuration/services/gameConfigurationService.ts`
- [X] T012 [P] [US1] Probar estado y comandos del servicio en `src/features/game-configuration/services/gameConfigurationService.test.ts`
- [X] T013 [US1] Integrar el handoff PreparedRoster y navegacion en `src/app/App.tsx`

## Phase 4: User Story 2 - Ritmo, orden y votacion

- [X] T014 [US2] Implementar reglas de conversacion, orden, voto y ultimo intento en `src/domain/entities/gameConfiguration.ts`
- [X] T015 [P] [US2] Cubrir limites y modos en `src/domain/entities/gameConfiguration.test.ts`
- [X] T016 [US2] Crear controles accesibles en `src/features/game-configuration/components/GameConfigurationScreen.tsx`
- [X] T017 [P] [US2] Probar controles y errores en `src/features/game-configuration/components/GameConfigurationScreen.test.tsx`
- [X] T018 [US2] Exponer el servicio con `src/features/game-configuration/hooks/useGameConfiguration.ts`

## Phase 5: User Story 3 - Reglas multi-impostor

- [X] T019 [US3] Implementar normalizacion y matriz multi-impostor en `src/domain/entities/gameConfiguration.ts`
- [X] T020 [P] [US3] Cubrir combinaciones multi-impostor en `src/domain/entities/gameConfiguration.test.ts`
- [X] T021 [US3] Completar controles condicionales en `src/features/game-configuration/components/GameConfigurationScreen.tsx`
- [X] T022 [P] [US3] Probar estados de uno y varios impostores en `src/features/game-configuration/components/GameConfigurationScreen.test.tsx`

## Phase 6: User Story 4 - Revision y confirmacion

- [X] T023 [US4] Implementar PreparedGame y copia defensiva en `src/domain/entities/gameConfiguration.ts`
- [X] T024 [US4] Implementar revision, confirmacion y reintento en `src/features/game-configuration/services/gameConfigurationService.ts`
- [X] T025 [US4] Implementar resumen y confirmacion en `src/features/game-configuration/components/GameConfigurationScreen.tsx`
- [X] T026 [P] [US4] Cubrir flujo completo en `tests/e2e/game-configuration.spec.ts`

## Phase 7: Polish and delivery

- [X] T027 [P] Completar textos y estilos en `src/i18n/es.ts` y `src/styles/global.css`
- [X] T028 [P] Añadir axe y overflow en `tests/accessibility/game-configuration.spec.ts`
- [X] T029 Ejecutar quickstart, quality gates, bundle y CI y registrar evidencia en `specs/003-game-configuration/checklists/implementation.md`
- [X] T030 Reconciliar tareas, PR, Pages y Jira IMP-22 a IMP-26
