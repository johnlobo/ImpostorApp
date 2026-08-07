# Tasks: Catalogo de categorias y conceptos

**Input**: Artefactos de `specs/004-category-catalog/`

## Phase 1: Setup

- [X] T001 Actualizar el puntero de feature en `.specify/feature.json`
- [ ] T002 [P] Crear el catalogo general versionado en `src/features/content-catalog/data/esCatalog.ts`
- [ ] T003 [P] Crear el catalogo adulto separado en `src/features/content-catalog/data/esAdultCatalog.ts`
- [X] T004 [P] Validar los escenarios de `specs/004-category-catalog/quickstart.md`

## Phase 2: Foundational

- [ ] T005 Crear tipos, validacion y seleccion pura en `src/domain/entities/contentCatalog.ts`
- [ ] T006 [P] Definir puertos de catalogo, preferencias, snapshot e historial en `src/domain/ports/contentCatalog.ts`
- [ ] T007 [P] Cubrir integridad del corpus, normalizacion, filtrado adulto y modos en `src/domain/entities/contentCatalog.test.ts`
- [ ] T008 Implementar repositorios de categorias y preferencias en `src/infrastructure/persistence/customCategoriesRepository.ts` y `contentPreferencesRepository.ts`
- [ ] T009 Implementar snapshot confirmado en `src/infrastructure/persistence/contentSelectionRepository.ts`
- [ ] T010 Implementar draw/reset atomico en `src/infrastructure/persistence/conceptDrawRepository.ts`
- [ ] T011 [P] Cubrir round-trip, incompatibilidad, fallos y atomicidad en `tests/integration/contentCatalogRepositories.spec.ts`

## Phase 3: User Story 1 - Seleccionar contenido (IMP-27)

- [ ] T012 [US1] Implementar borrador, resolucion elegible y confirmacion en `src/domain/entities/contentCatalog.ts`
- [ ] T013 [P] [US1] Cubrir seleccion explicita, todas, aleatoria y suficiencia en `src/domain/entities/contentCatalog.test.ts`
- [ ] T014 [US1] Crear el servicio de catalogo en `src/features/content-catalog/services/contentCatalogService.ts`
- [ ] T015 [P] [US1] Probar carga, comandos, revision y confirmacion en `src/features/content-catalog/services/contentCatalogService.test.ts`
- [ ] T016 [US1] Crear pantalla y hook en `src/features/content-catalog/components/ContentCatalogScreen.tsx` y `hooks/useContentCatalog.ts`
- [ ] T017 [P] [US1] Probar modos, errores y revision en `src/features/content-catalog/components/ContentCatalogScreen.test.tsx`

## Phase 4: User Story 2 - Conceptos sin repeticion (IMP-28)

- [ ] T018 [US2] Implementar seleccion determinista y agotamiento tipado en `src/domain/entities/contentCatalog.ts`
- [ ] T019 [P] [US2] Cubrir matriz sin repeticion, scopes y limites RNG en `src/domain/entities/contentCatalog.test.ts`
- [ ] T020 [US2] Exponer draw serializado y reset confirmado desde `src/features/content-catalog/services/contentCatalogService.ts`
- [ ] T021 [P] [US2] Probar persistencia antes de exposicion, reintento y agotamiento en `src/features/content-catalog/services/contentCatalogService.test.ts`

## Phase 5: User Story 3 - Categorias personalizadas (IMP-31)

- [ ] T022 [US3] Implementar CRUD preservando IDs en `src/features/content-catalog/services/contentCatalogService.ts`
- [ ] T023 [US3] Crear editor accesible en `src/features/content-catalog/components/CustomCategoryEditor.tsx`
- [ ] T024 [P] [US3] Probar validacion, reintento, edicion y eliminacion en `src/features/content-catalog/components/CustomCategoryEditor.test.tsx`

## Phase 6: User Story 4 - Contenido adulto (IMP-30)

- [ ] T025 [US4] Implementar preferencia adulta con confirmacion y filtrado inmediato en servicio y pantalla
- [ ] T026 [P] [US4] Cubrir valor inicial, persistencia y exclusion en dominio, servicio y componente

## Phase 7: Integration and delivery (IMP-29)

- [ ] T027 Integrar el handoff `PreparedGame` -> catalogo -> `PreparedContentSelection` en `src/app/App.tsx` y `src/features/platform/services/recoveryRuntime.ts`
- [ ] T028 [P] Completar textos y estilos en `src/i18n/es.ts` y `src/styles/global.css`
- [ ] T029 [P] Cubrir flujo offline, CRUD, agotamiento y reset en `tests/e2e/content-catalog.spec.ts`
- [ ] T030 [P] Cubrir axe, teclado, privacidad y overflow en `tests/accessibility/content-catalog.spec.ts`
- [ ] T031 Ejecutar quickstart, quality gates, bundle y CI y registrar evidencia en `specs/004-category-catalog/checklists/implementation.md`
- [ ] T032 Reconciliar tareas, PR, Pages y Jira IMP-27, IMP-28, IMP-31, IMP-30 e IMP-29

## Dependencies

- Phase 2 depende de Phase 1 y bloquea todas las historias.
- US1 entrega el pool confirmado que consume US2.
- US2 puede desarrollarse en paralelo con US3 y US4 despues de los contratos foundational.
- US3 y US4 deben completarse antes de la integracion final porque alteran la elegibilidad.
- T027 depende de US1-US4; T031 depende de T027-T030; T032 depende de la entrega publicada.

## Parallel examples

- T002, T003 y T004 pueden ejecutarse en paralelo.
- T006, T007 y el diseno de T011 pueden ejecutarse en paralelo despues de T005.
- Dentro de cada historia, las pruebas marcadas [P] pueden prepararse en paralelo con el servicio o componente correspondiente.
- T028, T029 y T030 pueden ejecutarse en paralelo tras estabilizar T027.
