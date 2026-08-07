# Tasks: Asignacion secreta y revelacion segura de roles

**Input**: Artefactos de `specs/005-secret-role-assignment/`

## Phase 1: Setup and traceability

- [X] T001 Crear la rama `005-secret-role-assignment` y actualizar `.specify/feature.json`
- [X] T002 [P] Completar spec, checklist de requisitos, plan, research, data model, contrato y quickstart
- [X] T003 Crear y vincular en Jira IMP-32..IMP-37 bajo la epica IMP-5
- [X] T004 [P] Crear el checklist de implementacion de IMP-5
- [X] T005 Reconciliar las casillas documentales pendientes de IMP-3 e IMP-4 con GitHub, Pages y Jira

## Phase 2: Foundational

- [X] T006 Crear tipos, guards, invariantes y copias defensivas en `src/domain/entities/secretRoleAssignment.ts`
- [X] T007 [P] Definir `SecretRoundRepository` e historial de reparto en `src/domain/ports/secretRoleAssignment.ts`
- [X] T008 [P] Cubrir asignacion, proyecciones, privacidad e idempotencia en `src/domain/entities/secretRoleAssignment.test.ts`
- [X] T009 Anadir migracion Dexie v2 con `role-assignment-history` en `src/infrastructure/persistence/migrations.ts`
- [X] T010 Incluir el historial de reparto en el borrado total y pruebas de migracion/safe mode
- [X] T011 Implementar `SecretRoundRepository` transaccional en `src/infrastructure/persistence/secretRoundRepository.ts`
- [X] T012 [P] Cubrir round-trip, rollback, revision, lease, incompatibilidad y concurrencia en integracion

## Phase 3: User Story 1 - Preparar reparto atomico (IMP-32)

**Independent test**: Desde `PreparedContentSelection`, preparar una ronda confirma exactamente un
draw, la asignacion y ambos historiales, o no modifica ninguna tabla.

- [X] T013 [US1] Implementar reparto random sin reemplazo y balanced por conteo historico
- [X] T014 [P] [US1] Validar RNG, cardinalidad, IDs unicos y matriz de 3 a 20 jugadores
- [X] T015 [US1] Integrar `drawNextConcept` dentro de la transaccion multi-store
- [X] T016 [US1] Persistir `SecretRoundSnapshot` e `ImpostorAllocationHistory` en la misma confirmacion
- [X] T017 [P] [US1] Probar agotamiento y rollback ante fallos en cada escritura
- [X] T018 [US1] Hacer idempotente la repeticion de `prepare` para una ronda ya confirmada

## Phase 4: User Story 2 - Revelacion privada (IMP-33)

**Independent test**: Cada jugador pasa de pendiente a completado una sola vez; el secreto solo se
proyecta despues de persistir y desaparece del DOM al ocultarlo.

- [X] T019 [US2] Implementar estado de feature `shared -> private-covered -> private-revealed`
- [X] T020 [US2] Persistir `completed` antes de resolver `PrivateRoleView`
- [X] T021 [US2] Crear hook con purga en `pagehide` y `visibilitychange`
- [X] T022 [US2] Crear lista compartida y cortinilla privada accesibles
- [X] T023 [P] [US2] Probar lista sin secretos, cortinilla, revelacion y desmontaje
- [X] T024 [US2] Cubrir conflictos, doble pulsacion, reintento y bloqueo tras recarga

## Phase 5: User Story 3 - Inicio seguro (IMP-34)

**Independent test**: `Empezar ronda` permanece bloqueado con menos de N/N y entrega un
`RoundHandoff` sin secretos al completar todos.

- [X] T025 [US3] Derivar progreso publico y compuerta N/N desde el snapshot confirmado
- [X] T026 [US3] Implementar `RoundHandoff` idempotente sin roles ni concepto
- [X] T027 [US3] Integrar el handoff IMP-4 -> IMP-5 -> IMP-6 en `src/app/App.tsx`
- [X] T028 [P] [US3] Probar inicio bloqueado, inicio N/N, repeticion y modo observador

## Phase 6: User Story 4 - Multiples impostores (IMP-35)

**Independent test**: La matriz de uno, dos y tres impostores respeta `known`/`unknown` sin filtrar
companeros en vistas publicas o ciudadanas.

- [X] T029 [US4] Resolver proyeccion privada con awareness `known` y `unknown`
- [X] T030 [US4] Normalizar companeros a vacio con un unico impostor
- [X] T031 [P] [US4] Cubrir ciudadanos e impostores con uno, dos y tres impostores
- [X] T032 [US4] Cubrir la matriz multi-impostor en componentes y E2E

## Phase 7: User Story 5 - Recuperacion segura (IMP-36)

**Independent test**: Cerrar y reabrir offline conserva reparto y completados, pero siempre vuelve
a la lista compartida y nunca ejecuta de nuevo RNG.

- [X] T033 [US5] Reconocer y validar `round-prepared` en la recuperacion de `App`
- [X] T034 [US5] Restaurar el servicio desde el snapshot sin preparar otra ronda
- [X] T035 [US5] Bloquear mutaciones privadas en observador y datos incompatibles
- [X] T036 [P] [US5] Probar reload cubierto, writer loss, revision conflict y safe mode

## Phase 8: Integration and delivery (IMP-37)

- [X] T037 Integrar repositorio runtime, servicio, hook, pantalla, textos y estilos
- [X] T038 [P] Completar pruebas de servicio, componentes y `App`
- [X] T039 [P] Crear E2E de dispositivo compartido, awareness, privacidad DOM y reload offline
- [X] T040 [P] Cubrir axe, teclado, targets tactiles y overflow a 320 px
- [X] T041 Ejecutar quickstart, format, lint, typecheck, unitarios, build, bundle y Playwright
- [X] T042 Publicar PR, validar CI/Pages y reconciliar IMP-5 e IMP-32..IMP-37 en Jira

## Dependencies

- Phase 2 bloquea todas las historias; T011 depende de T006-T010.
- IMP-32 entrega el snapshot que consume IMP-33.
- IMP-34 depende de la proyeccion publica y finalizacion de IMP-33.
- IMP-35 puede probarse en paralelo tras T006; IMP-36 depende de T011 y T019.
- IMP-37 depende de todas las historias y de la matriz de recuperacion/privacidad.

## Parallel examples

- T007, T008 y T009 pueden avanzar en paralelo despues de fijar los tipos T006.
- Las pruebas T014, T017 y T023 pueden prepararse junto a dominio, repositorio y UI.
- T032, T036, T039 y T040 pueden dividirse por navegador y superficie tras estabilizar la integracion.
