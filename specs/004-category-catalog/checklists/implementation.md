# Implementation Checklist: Catalogo de categorias y conceptos

**Date**: 2026-08-07

- [X] Catalogo integrado: 15 categorias y 150 conceptos con IDs estables
- [X] Dominio, filtros adultos, seleccion y agotamiento validados
- [X] Persistencia de categorias, preferencias, snapshot e historial validada
- [X] Draw transaccional persiste IDs antes de exponer texto
- [X] Handoff `configured` -> `content-selected` conserva revision optimista
- [X] Textos externalizados y layout movil implementado
- [X] `npm run format:check`
- [X] `npm run lint`
- [X] `npm run typecheck`
- [X] `npm run test`: 28 archivos, 191 pruebas
- [X] `npm run build`
- [X] Bundle: 114.4 KiB gzip de 180 KiB
- [X] Playwright E2E y accesibilidad en CI
- [X] PR fusionada, Pages desplegada y Jira reconciliado

## Local environment note

Chromium no puede arrancar localmente porque el host no incluye `libnspr4.so` y la instalacion de
dependencias requiere privilegios sudo no disponibles. Los archivos Playwright pasan typecheck,
ESLint y discovery; su ejecucion completa queda asignada al workflow CI, que instala las
dependencias del navegador.

## CI evidence

- PR: https://github.com/johnlobo/ImpostorApp/pull/6
- Workflow verde: https://github.com/johnlobo/ImpostorApp/actions/runs/31175982001
- Jobs: quality 46 s, offline-smoke 51 s y E2E 2 min 37 s.
- Merge en `main`: `380d835c20b97c5ccb0c49bf67b07d6904a5ed67`.
- CI posterior al merge: 31176414795, verde.
- Pages: https://johnlobo.github.io/ImpostorApp/ (workflow 31176622346).
- Jira IMP-4 e IMP-27..IMP-31 en `Listo`.
