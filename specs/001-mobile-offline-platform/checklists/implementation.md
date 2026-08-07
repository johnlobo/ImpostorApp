# Trazabilidad de implementacion

**Feature**: `IMP-1` / `001-mobile-offline-platform`  
**Fecha del registro**: 2026-08-07  
**Estado**: Completado con desviacion manual aceptada para T053

Este documento relaciona requisitos, codigo y pruebas disponibles. Los quality gates y recorridos
Playwright finalizaron correctamente en CI. La aceptacion de cierre no convierte las metricas fisicas
no ejecutadas en resultados superados; se mantienen como `NO MEDIDO`.

## Quality gates

| Comando | Resultado conocido | Evidencia / pendiente |
|---|---|---|
| `npm run format:check` | Superado localmente | Prettier valido el worktree consolidado. |
| `npm run lint` | Superado localmente | ESLint valido el worktree consolidado sin incidencias. |
| `npm run typecheck` | Superado localmente | TypeScript valido aplicacion, tests y configuracion consolidados. |
| `npm run test` | Superado localmente | 61 tests Vitest superados. |
| `npm run build` | Superado localmente | Build de produccion generado correctamente. |
| `node scripts/check-bundle-size.mjs` | Superado localmente | 98.1 KiB gzip de JS + CSS; presupuesto configurado: 180 KiB. |
| `npm run test:e2e` | Superado en CI | 53 casos Playwright: 39 superados y 14 omisiones esperadas por proyecto; job E2E verde en 3m02s. |

CI instalo Chromium y WebKit y conservo el informe como artefacto para los recorridos offline, instalacion,
recuperacion, actualizacion y accesibilidad.

## Requisitos funcionales

| Requisito | Implementacion | Pruebas / evidencia | Estado |
|---|---|---|---|
| FR-001 Instalable en moviles compatibles | `vite.config.ts`, `index.html`, `installCapability.ts`, `InstallHelp.tsx` | `InstallHelp.test.tsx`, `installability.spec.ts`, `install-help.spec.ts` | Implementado; dispositivo fisico no medido |
| FR-002 Nombre, icono y presentacion movil | `public/icons/`, `vite.config.ts`, `index.html`, `AppShell.tsx` | `installability.spec.ts`; matriz fisica no medida | Implementado; dispositivo fisico no medido |
| FR-003 Estado de preparacion offline | `offlineLifecycle.ts`, `registerServiceWorker.ts`, `OfflineStatus.tsx` | `offlineLifecycle.test.ts`, `OfflineStatus.test.tsx`, `offline.spec.ts` | Implementado y E2E superado |
| FR-004 Capacidades utilizables offline | Precaching en `vite.config.ts`, registro en `registerServiceWorker.ts` | `offline.spec.ts`, quickstart A | Implementado y E2E superado |
| FR-005 Recuperacion de primera carga incompleta | `offlineLifecycle.ts`, `OfflineStatus.tsx`, `useOfflineLifecycle.ts` | Tests unitarios de lifecycle/componente y caso interrumpido en `offline.spec.ts` | Implementado y E2E superado |
| FR-006 Conectividad sin interrupcion | `browserConnectivity.ts`, `offlineLifecycle.ts`, `useOfflineLifecycle.ts` | Transiciones unitarias y `offline.spec.ts` | Implementado y E2E superado |
| FR-007 Persistencia de datos soportados | `database.ts`, `migrations.ts`, `dexiePersistenceGateway.ts` | `persistenceGateway.spec.ts`, `persistenceMigrations.spec.ts`, `recovery.spec.ts` | Implementado y E2E superado; capacidades futuras deben reutilizar el gateway |
| FR-008 Confirmacion durable antes de transicion irreversible | Revision y commit atomico en `dexiePersistenceGateway.ts`; guardas en `recoveryService.ts` | Contratos de gateway y recovery | Implementado en la plataforma; las transiciones concretas pertenecen a epicas futuras |
| FR-009 Restaurar solo el ultimo estado completo | `dexiePersistenceGateway.ts`, `recoveryService.ts`, `RecoveryStatus.tsx` | Tests de commit abortado, recovery unitario y `recovery.spec.ts` | Implementado y E2E superado |
| FR-010 Actualizaciones preservan datos | `updateCoordinator.ts`, `appUpdateRuntime.ts`, persistencia IndexedDB | Unitarios de coordinacion y snapshot conservado en `update.spec.ts` | Implementado y E2E A/B superado |
| FR-011 Migracion con alternativa segura | `migrations.ts`, `database.ts`, `recoveryService.ts` | Rollback y esquema futuro en `persistenceMigrations.spec.ts` | Implementado y contratos superados |
| FR-012 Sin recarga automatica durante partida | `updateCoordinator.ts`, `UpdatePrompt.tsx` | Unitarios de aplazamiento y `update.spec.ts` | Implementado y E2E A/B superado |
| FR-013 Descarga incompleta conserva version anterior | Workbox `generateSW` en `vite.config.ts`, activacion solicitada | Worker interrumpido en `update.spec.ts` | Implementado y E2E superado en CI |
| FR-014 Borrado explicito y confirmado | `dexiePersistenceGateway.ts`, `recoveryService.ts`, `RecoveryStatus.tsx` | Contratos de gateway/componente y `recovery.spec.ts` | Implementado y E2E superado |
| FR-015 Errores diferenciados y accionables | Errores tipados en `platform.ts`; `OfflineStatus.tsx`, `RecoveryStatus.tsx`, `UpdatePrompt.tsx` | Tests unitarios y casos de error en `offline.spec.ts`/`recovery.spec.ts` | Implementado y E2E superado |
| FR-016 Offline sin cuenta ni servicio externo | Aplicacion cliente, precache local, IndexedDB; sin API de ejecucion | Inspeccion de arquitectura y `offline.spec.ts` | Implementado y recorrido offline E2E superado |
| FR-017 Vertical sin scroll horizontal | `global.css`, manifest portrait, shell movil | `install-help.spec.ts`, `platform.spec.ts`, matriz de dispositivos | Implementado y Playwright superado; dispositivo fisico no medido |
| FR-018 Futuras epicas demuestran offline | Constitucion y quality gates de Spec Kit | Debe evaluarse por cada feature futura | Obligacion continua; no cerrable en IMP-1 |

## Criterios de exito

| Criterio | Evidencia disponible | Estado / evidencia faltante |
|---|---|---|
| SC-001 100 % de recorridos offline | `offline.spec.ts` y quickstart A ejecutados en CI | Superado en capacidades implementadas |
| SC-002 9/10 instalan en menos de 2 minutos | Protocolo en `installation-usability.md` | NO MEDIDO; desviacion aceptada |
| SC-003 95 % de aperturas offline en menos de 3 s | Escenario automatizado superado; matriz prevista | NO MEDIDO; desviacion aceptada |
| SC-004 100 % recupera ultimo estado confirmado | Contratos Vitest y `recovery.spec.ts` ejecutados | Superado en automatizacion |
| SC-005 Cero actualizaciones interrumpen partida | Unitarios y `update.spec.ts` A/B ejecutados | Superado en automatizacion |
| SC-006 100 % de errores explicados y accionables | Tests unitarios y E2E de estados de error | Superado en automatizacion |
| SC-007 Todas las pantallas verticales sin overflow | Tests axe/viewport ejecutados en CI | Superado en automatizacion; matriz fisica NO MEDIDO |

## Constitucion

| Principio / restriccion | Trazabilidad | Estado |
|---|---|---|
| I. Specification and Traceability First | Jira `IMP-1`; `spec.md`, `plan.md`, `tasks.md`, contratos, quickstart y esta matriz | Completado tras reconciliacion Jira/spec/tasks/CI |
| II. Secret Information Stays Private | Entidades y errores publicos limitados; serializacion sin payload; almacenamiento local; sin analitica ni backend | Cubierto por tests de dominio; flujos secretos concretos quedan para epicas de juego |
| III. Offline-First and Recoverable | PWA precache, IndexedDB transaccional, migraciones, recovery, writer lease y updates diferidos | Implementado y E2E superado; dispositivos NO MEDIDO por desviacion |
| IV. Tested, Deterministic Game Rules | Tests antes de implementacion, dependencias inyectadas y fixtures deterministas de plataforma | Aplicable a plataforma; reglas concretas quedan fuera de IMP-1 |
| V. Mobile Simplicity and Accessibility | Textos españoles externalizados, semantica, foco, targets tactiles, safe areas y axe/viewport specs | Implementado y Playwright superado; revision fisica NO MEDIDO |
| Cliente PWA sin cuentas ni backend | React/Vite PWA, Cache Storage e IndexedDB; no hay servicio remoto de ejecucion | Implementado; recorrido offline E2E superado |
| Datos persistentes limitados | Tablas para metadata, snapshot, grupos, categorias, conceptos y preferencias | Cubierto por contratos de persistencia; integracion futura debe respetar el limite |
| Quality gates obligatorios | CI ejecuta formato, lint, tipos, Vitest, build, bundle y Playwright | Superado en CI |

## Condiciones de cierre de T054

- Ejecutar con exito todos los quality gates sobre el commit final.
- Registrar los resultados reales de quickstart A-E, sin considerar descubrimiento como ejecucion.
- Registrar la aceptacion explicita del propietario para cualquier desviacion manual.
- Mantener las metricas no ejecutadas como `NO MEDIDO`, sin presentarlas como superadas.

## Cierre de T053

El propietario acepto el 2026-08-07 cerrar T053 con una validacion funcional informal positiva y
sin la evidencia cuantitativa de SC-002 y SC-003. La desviacion queda registrada en
`device-matrix.md` e `installation-usability.md`; ninguna metrica ausente se presenta como superada.

