# Implementation Checklist: Asignacion secreta y revelacion segura de roles

**Date**: 2026-08-08

- [X] IMP-32: dominio random/balanced y preparacion atomica validados
- [X] IMP-33: revelacion durable, privada y de un solo uso validada
- [X] IMP-34: lista/observador seguros, compuerta N/N y handoff validados
- [X] IMP-35: awareness con uno, dos y tres impostores validado
- [ ] IMP-36: recuperacion cubierta sin repetir RNG validada
- [ ] IMP-37: integracion y entrega completadas
- [X] Migracion Dexie v2 y borrado total validados
- [X] Preparacion atomica e idempotente validada
- [X] Revelacion durable antes de proyectar el secreto
- [X] Lista compartida y modo observador sin secretos
- [X] Inicio bloqueado hasta N/N y handoff seguro
- [ ] Recuperacion offline siempre cubierta
- [X] Textos externalizados y layout movil implementado
- [X] `npm run format:check`
- [X] `npm run lint`
- [X] `npm run typecheck`
- [X] `npm run test`
- [X] `npm run build`
- [X] Bundle dentro de 180 KiB gzip
- [ ] Playwright E2E y reapertura offline
- [ ] Axe, teclado, privacidad DOM y overflow a 320 px
- [ ] Quickstart ejecutado y evidencia registrada
- [ ] PR fusionada, Pages desplegada y Jira reconciliado

## Evidence

- Local: format, lint, typecheck, 32 archivos / 230 pruebas y build verdes.
- Bundle: 118.24 KiB gzip de 180 KiB.
- Playwright: 18 casos IMP-5 descubiertos; ejecucion local bloqueada por `libnspr4.so`, pendiente CI.
