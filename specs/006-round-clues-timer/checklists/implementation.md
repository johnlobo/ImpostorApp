# Implementation Checklist: Desarrollo de rondas, pistas y temporizador

**Purpose**: Track implementation and delivery evidence for IMP-6
**Feature**: [spec.md](../spec.md)

- [x] IMP-38 orden, ready e inicio durable completados.
- [x] IMP-39 conversacion libre/temporizada completada.
- [x] IMP-40 cierre durable y handoff a IMP-7 completados.
- [x] IMP-41 recovery, observer y conflictos completados.
- [x] IMP-42 fases sucesivas completadas.
- [ ] IMP-43 integracion y entrega completadas.
- [x] Roster, free y Fisher-Yates tienen matriz determinista.
- [x] Progreso de turno es durable, idempotente y sin saltos visuales.
- [x] Timer usa duracion exacta, deadline y maximum durable.
- [x] Pause/resume son persist-first y no existe reset.
- [x] Expiry efectivo se normaliza antes de cada mutacion.
- [x] Close es persist-first, confirmado e idempotente.
- [x] `CluePhaseHandoff` es publico, canonico y sin secretos.
- [x] Fase sucesiva usa subconjunto estricto como entrada directa.
- [x] Historial minimo tiene identidad, orden y cardinalidad exactos.
- [x] Recovery offline cubre todos los estados y progreso.
- [x] Observer y safe mode no ofrecen mutaciones ni borran datos.
- [x] URL, navegacion, errores, consola y payloads pasan auditoria de privacidad.
- [x] Inventario de pantallas, CTA unica y limite de Game Menu estan implementados.
- [x] Adaptador IMP-6 public-only cubre summary, safe route y pauseForHome sin secretos.
- [x] Solo IMP-10 renderiza Game Menu; IMP-6 expone capability/slot.
- [x] Textos externos, teclado, foco, tacto, 320px y contraste validados.
- [x] Format, lint y typecheck verdes.
- [x] Unit, integration, build y bundle verdes.
- [x] E2E, axe y offline smoke verdes.
- [ ] Quickstart, PR, CI, Pages y Jira reconciliados con evidencia.

## Evidence

- Rama: `006-round-clues-timer`.
- Unit/integration: 38 archivos y 264 tests verdes (`npm run test`).
- Format: `npm run format:check` verde.
- Lint y typecheck globales verdes (`npm run lint`, `npm run typecheck`), tras excluir el
  prototipo standalone `ProposedUI/` (herramienta de diseno independiente, sin relacion con
  IMP-6) de ambas configuraciones.
- Build: Vite completo; bundle total 125.4 KiB gzip sobre presupuesto de 180 KiB (`npm run build`,
  `node scripts/check-bundle-size.mjs`).
- PR: [#9](https://github.com/johnlobo/ImpostorApp/pull/9), head funcional `78cae51`.
- CI PR: [run 31247024697](https://github.com/johnlobo/ImpostorApp/actions/runs/31247024697), con `quality`, `offline-smoke` y `e2e` verdes.
- Playwright CI: 118 passed y 19 skipped por matriz; axe, teclado, foco, 320 px, reload y offline cubiertos.
- Playwright local no pudo abrir Chromium por ausencia de `libnspr4.so`; CI ejecuto la matriz con dependencias instaladas.
- Jira: IMP-38..42 `Listo`; IMP-43 `En revision` hasta fusion, main CI y Pages.
