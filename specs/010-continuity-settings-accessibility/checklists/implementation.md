# Implementation Checklist: Continuidad, ayuda, ajustes y accesibilidad

**Date**: 2026-08-08

- [ ] [IMP-62] Home, resumen public-only y safe resume implementados
- [ ] [IMP-63] Pausa persist-first, abandono y descarte confirmados implementados
- [ ] [IMP-64] Onboarding omisible y ayuda offline versionada implementados
- [ ] [IMP-65] Preferencias y feedback opcional secret-independent implementados
- [ ] [IMP-66] Borrado global transaccional y preservacion PWA implementados
- [ ] [IMP-67] Shell accesible y rematch revalidado implementados
- [ ] [IMP-68] Backlog Jira reconciliado con los placeholders de historia
- [ ] Adaptadores IMP-2..IMP-9 exponen solo resumen, ruta y comandos publicos
- [ ] Registry selecciona exactamente un adapter por discriminante versionado; cero/multiples entran safe mode
- [ ] Adapter IMP-6 pausa running, preserva expired, hace no-op paused y bloquea observer
- [ ] LocalDataRepository es la unica autoridad de abandono; ningun feature adapter borra datos
- [ ] Abandono elimina registros game-scoped del gameId y conserva colecciones/preferencias
- [ ] Home, navigation state, errores, toasts y logs no reciben snapshots secretos
- [ ] Resume privado vuelve siempre a lista compartida o handoff cubierto
- [ ] Timer running queda paused durable antes de navegar a Home
- [ ] Observer no puede pausar, abandonar, descartar ni borrar
- [ ] Abandono conserva grupos, categorias personalizadas y preferencias
- [ ] Preferencias versionadas migran y se restauran offline por separado
- [ ] Audio y vibracion degradan sin error y no distinguen secretos
- [ ] Preferencia adulta no sustituye confirmacion por partida de IMP-4
- [ ] Onboarding no contiene delays artificiales ni controles de preview
- [ ] Ayuda refleja reglas aprobadas de IMP-2..IMP-9 y funciona offline
- [ ] Inventario de stores se comparte con migraciones y no omite metadata/historiales
- [ ] Un unico StoreRegistry alimenta migrations, database, gateway e inventario
- [ ] Delete marker permite retomar fallback/recreacion y verificar antes de Home
- [ ] UserPreferences v1 se actualiza a v2 como value upgrade sin store duplicado
- [ ] Delete-all vacia todos los stores registrados y verifica el resultado
- [ ] Cache Storage, service worker, manifest y shell offline sobreviven al borrado
- [ ] Rematch crea gameId nuevo y pasa por reviews editables de jugadores/config/contenido
- [ ] Rematch consume RematchSeed de IMP-9 y no reimplementa su data policy
- [ ] Solo IMP-10 renderiza GameMenu; IMP-6..9 exponen capability/slot publicos
- [ ] AppShell usa full viewport, safe areas, landmarks y CTA estable
- [ ] Dialogos/sheets implementan foco inicial, Escape, inert y restauracion
- [ ] Controles principales alcanzan 44x44 px y no dependen solo del color
- [ ] 320 px, zoom 200 %, alto contraste y reduced motion validados
- [ ] Todos los textos visibles estan externalizados y no existe selector de idioma inoperante
- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test`
- [ ] `npm run build`
- [ ] Bundle dentro de 180 KiB gzip sin Tailwind ni assets remotos
- [ ] Playwright E2E cubre continuidad, pausa, preferencias, borrado y reapertura offline
- [ ] Axe, teclado, lector, foco, privacidad DOM y overflow validados
- [ ] Quickstart A-G ejecutado y evidencia registrada
- [ ] PR, CI, Pages y Jira reconciliados

## Traceability

| Requirements | Tasks | Evidence |
|---|---|---|
| FR-001..003 / SC-001 | T015-T021, T049, T052, T054 | continuity service, Home, App y E2E |
| FR-004..006 / SC-002..003 | T017, T022-T028, T049, T054 | adapter, menu, active-game y E2E |
| FR-007..008 | T029-T034, T049, T054 | onboarding/help unitarios y E2E |
| FR-009..012 / SC-004..005 | T009-T012, T035-T040, T051 | upgrade, preferencias, feedback y Settings |
| FR-013..014 / SC-006 | T013-T014, T041-T046 | StoreRegistry, marker, integracion y PWA E2E |
| FR-015..016 | T015-T028, T041-T046, T052, T054 | revision, writer y privacy matrix |
| FR-017..020 / SC-007 | T024-T025, T031-T032, T037-T040, T047-T054 | shell, dialogos y accesibilidad |
| FR-021..022 / SC-001, SC-008 | T006-T021, T046, T054-T055 | public ports, offline y bundle |
| FR-023 | T048-T052, T054 | RematchSeed, nuevo gameId y review route |

## Evidence

- Pendiente de implementacion.
