# Trazabilidad de implementacion

**Feature**: `IMP-1` / `001-mobile-offline-platform`  
**Fecha del registro**: 2026-08-07  
**Estado**: Pendiente de CI, dispositivos fisicos y protocolo de usabilidad

Este documento relaciona requisitos, codigo y pruebas disponibles. Un contrato automatizado que
existe o pasa localmente no demuestra por si solo un criterio porcentual, una instalacion real ni un
recorrido Playwright pendiente. T054 y la feature no deben marcarse como completados hasta que los
quality gates y E2E terminen correctamente en CI y se registre la evidencia manual obligatoria.

## Quality gates

| Comando | Resultado conocido | Evidencia / pendiente |
|---|---|---|
| `npm run format:check` | Superado localmente | Prettier valido el worktree consolidado. |
| `npm run lint` | Superado localmente | ESLint valido el worktree consolidado sin incidencias. |
| `npm run typecheck` | Superado localmente | TypeScript valido aplicacion, tests y configuracion consolidados. |
| `npm run test` | Superado localmente | 59 tests Vitest superados. |
| `npm run build` | Superado localmente | Build de produccion generado correctamente. |
| `node scripts/check-bundle-size.mjs` | Superado localmente | 98.0 KiB gzip de JS + CSS; presupuesto configurado: 180 KiB. |
| `npm run test:e2e` | Pendiente de CI | Chromium local no inicia por `libnspr4.so`; WebKit y sus dependencias tampoco estan disponibles en el entorno local. |

La ejecucion pendiente de Playwright no se sustituye con `--list`. CI instala Chromium y WebKit y
debe conservar el informe como artefacto antes de aceptar los recorridos offline, instalacion,
recuperacion, actualizacion y accesibilidad.

## Requisitos funcionales

| Requisito | Implementacion | Pruebas / evidencia | Estado |
|---|---|---|---|
| FR-001 Instalable en moviles compatibles | `vite.config.ts`, `index.html`, `installCapability.ts`, `InstallHelp.tsx` | `InstallHelp.test.tsx`, `installability.spec.ts`, `install-help.spec.ts` | Parcial: E2E y dispositivos pendientes |
| FR-002 Nombre, icono y presentacion movil | `public/icons/`, `vite.config.ts`, `index.html`, `AppShell.tsx` | `installability.spec.ts`, matriz de dispositivos pendiente | Parcial |
| FR-003 Estado de preparacion offline | `offlineLifecycle.ts`, `registerServiceWorker.ts`, `OfflineStatus.tsx` | `offlineLifecycle.test.ts`, `OfflineStatus.test.tsx`, `offline.spec.ts` | Parcial: E2E pendiente |
| FR-004 Capacidades utilizables offline | Precaching en `vite.config.ts`, registro en `registerServiceWorker.ts` | `offline.spec.ts`, quickstart A | Parcial: E2E pendiente |
| FR-005 Recuperacion de primera carga incompleta | `offlineLifecycle.ts`, `OfflineStatus.tsx`, `useOfflineLifecycle.ts` | Tests unitarios de lifecycle/componente y caso interrumpido en `offline.spec.ts` | Parcial: E2E pendiente |
| FR-006 Conectividad sin interrupcion | `browserConnectivity.ts`, `offlineLifecycle.ts`, `useOfflineLifecycle.ts` | Transiciones unitarias y `offline.spec.ts` | Parcial: recorrido de navegador pendiente |
| FR-007 Persistencia de datos soportados | `database.ts`, `migrations.ts`, `dexiePersistenceGateway.ts` | `persistenceGateway.spec.ts`, `persistenceMigrations.spec.ts`, `recovery.spec.ts` | Parcial: E2E pendiente; capacidades de juego futuras deben reutilizar el gateway |
| FR-008 Confirmacion durable antes de transicion irreversible | Revision y commit atomico en `dexiePersistenceGateway.ts`; guardas en `recoveryService.ts` | Contratos de gateway y recovery | Parcial: las transiciones concretas pertenecen a epicas futuras |
| FR-009 Restaurar solo el ultimo estado completo | `dexiePersistenceGateway.ts`, `recoveryService.ts`, `RecoveryStatus.tsx` | Tests de commit abortado, recovery unitario y `recovery.spec.ts` | Parcial: E2E pendiente |
| FR-010 Actualizaciones preservan datos | `updateCoordinator.ts`, `appUpdateRuntime.ts`, persistencia IndexedDB | Unitarios de coordinacion y snapshot conservado en `update.spec.ts` | Parcial: E2E A/B pendiente |
| FR-011 Migracion con alternativa segura | `migrations.ts`, `database.ts`, `recoveryService.ts` | Rollback y esquema futuro en `persistenceMigrations.spec.ts` | Parcial: validacion E2E pendiente |
| FR-012 Sin recarga automatica durante partida | `updateCoordinator.ts`, `UpdatePrompt.tsx` | Unitarios de aplazamiento y `update.spec.ts` | Parcial: E2E A/B pendiente |
| FR-013 Descarga incompleta conserva version anterior | Workbox `generateSW` en `vite.config.ts`, activacion solicitada | Worker interrumpido en `update.spec.ts` | Pendiente de CI |
| FR-014 Borrado explicito y confirmado | `dexiePersistenceGateway.ts`, `recoveryService.ts`, `RecoveryStatus.tsx` | Contratos de gateway/componente y `recovery.spec.ts` | Parcial: E2E pendiente |
| FR-015 Errores diferenciados y accionables | Errores tipados en `platform.ts`; `OfflineStatus.tsx`, `RecoveryStatus.tsx`, `UpdatePrompt.tsx` | Tests unitarios y casos de error en `offline.spec.ts`/`recovery.spec.ts` | Parcial: E2E pendiente |
| FR-016 Offline sin cuenta ni servicio externo | Aplicacion cliente, precache local, IndexedDB; sin API de ejecucion | Inspeccion de arquitectura y `offline.spec.ts` | Parcial: recorrido offline pendiente |
| FR-017 Vertical sin scroll horizontal | `global.css`, manifest portrait, shell movil | `install-help.spec.ts`, `platform.spec.ts`, matriz de dispositivos | Parcial: Playwright y dispositivos pendientes |
| FR-018 Futuras epicas demuestran offline | Constitucion y quality gates de Spec Kit | Debe evaluarse por cada feature futura | Obligacion continua; no cerrable en IMP-1 |

## Criterios de exito

| Criterio | Evidencia disponible | Estado / evidencia faltante |
|---|---|---|
| SC-001 100 % de recorridos offline | `offline.spec.ts` y quickstart A definidos | Pendiente de ejecucion CI y recorridos de todas las capacidades |
| SC-002 9/10 instalan en menos de 2 minutos | Protocolo previsto en `installation-usability.md` | Pendiente: al menos 10 participantes y dispositivos compatibles |
| SC-003 95 % de aperturas offline en menos de 3 s | Escenario y matriz previstos | Pendiente: mediciones en dispositivos representativos |
| SC-004 100 % recupera ultimo estado confirmado | Contratos Vitest y `recovery.spec.ts` definidos | Parcial: E2E, cierres/reinicios y matriz de actualizacion pendientes |
| SC-005 Cero actualizaciones interrumpen partida | Unitarios del coordinador y `update.spec.ts` definidos | Pendiente de E2E A/B y matriz real |
| SC-006 100 % de errores explicados y accionables | Tests de `OfflineStatus`, `RecoveryStatus` y estados de almacenamiento | Parcial: ejecucion E2E y cobertura de matriz pendientes |
| SC-007 Todas las pantallas verticales sin overflow | Tests axe/viewport definidos | Pendiente de Playwright y matriz fisica |

## Constitucion

| Principio / restriccion | Trazabilidad | Estado |
|---|---|---|
| I. Specification and Traceability First | Jira `IMP-1`; `spec.md`, `plan.md`, `tasks.md`, contratos, quickstart y esta matriz | Parcial hasta concordancia final Jira/spec/tasks/CI |
| II. Secret Information Stays Private | Entidades y errores publicos limitados; serializacion sin payload; almacenamiento local; sin analitica ni backend | Cubierto por tests de dominio; flujos secretos concretos quedan para epicas de juego |
| III. Offline-First and Recoverable | PWA precache, IndexedDB transaccional, migraciones, recovery, writer lease y updates diferidos | Parcial hasta E2E y dispositivos |
| IV. Tested, Deterministic Game Rules | Tests antes de implementacion, dependencias inyectadas y fixtures deterministas de plataforma | Aplicable a plataforma; reglas concretas quedan fuera de IMP-1 |
| V. Mobile Simplicity and Accessibility | Textos españoles externalizados, semantica, foco, targets tactiles, safe areas y axe/viewport specs | Parcial hasta Playwright y revision fisica |
| Cliente PWA sin cuentas ni backend | React/Vite PWA, Cache Storage e IndexedDB; no hay servicio remoto de ejecucion | Implementado; uso offline pendiente de E2E final |
| Datos persistentes limitados | Tablas para metadata, snapshot, grupos, categorias, conceptos y preferencias | Cubierto por contratos de persistencia; integracion futura debe respetar el limite |
| Quality gates obligatorios | CI ejecuta formato, lint, tipos, Vitest, build, bundle y Playwright | Pendiente de una ejecucion CI verde del commit final |

## Condiciones para completar T054

- Ejecutar con exito todos los quality gates sobre el commit final.
- Obtener CI verde para Chromium y WebKit, incluido el E2E de dos versiones.
- Registrar los resultados reales de quickstart A-E, sin considerar descubrimiento como ejecucion.
- Completar la matriz iPhone/Android, overflow vertical, tiempos offline y protocolo con al menos 10
  participantes.
- Reconciliar los estados finales de `tasks.md` y Jira solo despues de obtener esa evidencia.

