# Resultados de validacion del quickstart

**Feature**: `IMP-1` / `001-mobile-offline-platform`  
**Fecha del registro**: 2026-08-07  
**Entorno**: workspace local de Codex, Node.js 24

Este registro recoge la evidencia automatizada ejecutada localmente y en CI. No se realizaron
mediciones en dispositivos fisicos ni tiempos de apertura; esa desviacion fue aceptada expresamente
por el propietario para el cierre de T053.

## Resumen

| Escenario | Estado | Evidencia disponible | Pendiente |
|---|---|---|---|
| A. Primera carga y reapertura offline | Automatizado superado | Contratos Vitest y E2E CI verdes | Tiempo en dispositivo fisico |
| B. Primera carga interrumpida | Automatizado superado | Contratos Vitest y E2E CI verdes | Ninguno automatizado |
| C. Recuperacion atomica | Automatizado superado | Contratos y E2E CI verdes | Recorrido fisico |
| D. Actualizacion segura | Automatizado superado | Contratos y E2E A/B CI verdes | Matriz fisica |
| E. Varias pestanas | Contrato superado | Cinco contratos deterministas writer/observer verdes | Recorrido manual con dos ventanas |

## Ejecucion automatizada registrada

Comando ejecutado:

```bash
npx vitest run \
  src/features/platform/services/offlineLifecycle.test.ts \
  tests/integration/persistenceGateway.spec.ts \
  tests/integration/persistenceMigrations.spec.ts \
  tests/integration/writerCoordination.spec.ts \
  src/features/platform/services/recoveryService.test.ts \
  src/features/platform/services/updateCoordinator.test.ts
```

Resultado: **superado**, 6 archivos y 38 tests, sin fallos.

Comando de descubrimiento ejecutado:

```bash
npx playwright test \
  tests/e2e/offline.spec.ts \
  tests/e2e/recovery.spec.ts \
  tests/e2e/update.spec.ts \
  --list
```

Resultado inicial: 32 casos descubiertos. Posteriormente, el job E2E completo ejecuto 53 casos: 39 superados y 14 omitidos de forma esperada por compatibilidad de proyecto.

## Escenario A: primera carga y reapertura offline

**Estado: Automatizacion superada; evidencia fisica NO MEDIDO por desviacion aceptada.**

- `offlineLifecycle.test.ts` confirma que la aplicacion solo publica `offline-ready` despues de la
  preparacion y que los cambios de conectividad no interrumpen un estado ya preparado.
- `tests/e2e/offline.spec.ts` contiene el caso `reloads a prepared production build with no network`
  y el control de precache del shell, JavaScript y CSS.
- El recorrido E2E offline se ejecuto correctamente en CI sobre Chromium y WebKit.
- El objetivo de apertura inferior a 3 segundos queda `NO MEDIDO`; no se registra ningun tiempo
  simulado y el propietario acepto esta desviacion.

Comando ejecutado en CI:

```bash
npx playwright test tests/e2e/offline.spec.ts --project=chromium-pwa
```

## Escenario B: primera carga interrumpida

**Estado: Automatizacion superada; evidencia fisica NO MEDIDO por desviacion aceptada.**

- `offlineLifecycle.test.ts` verifica la transicion a preparacion requerida y el reintento seguro.
- `tests/e2e/offline.spec.ts` contiene `explains an interrupted first preparation and retries when
  connectivity returns`, que aborta la descarga del service worker y comprueba mensaje y accion.
- El recorrido de navegador se ejecuto correctamente en CI.

Comando ejecutado en CI:

```bash
npx playwright test tests/e2e/offline.spec.ts \
  --project=chromium-pwa \
  --grep "interrupted first preparation"
```

## Escenario C: recuperacion atomica

**Estado: Automatizacion superada; evidencia fisica NO MEDIDO por desviacion aceptada.**

- `persistenceGateway.spec.ts` verifica conflicto de revision, conservacion del snapshot confirmado
  ante un commit invalido, permiso de escritura y borrado confirmado.
- `persistenceMigrations.spec.ts` verifica rollback y modo seguro ante un esquema futuro.
- `recoveryService.test.ts` verifica restauracion para writer/observer, preservacion incompatible y
  borrado confirmado.
- `tests/e2e/recovery.spec.ts` contiene casos de reapertura, transaccion IndexedDB abortada, falta de
  espacio, indisponibilidad, eliminacion externa y borrado confirmado.
- Los contratos Vitest y los casos Playwright pasaron en CI.

Comando ejecutado en CI:

```bash
npx playwright test tests/e2e/recovery.spec.ts --project=chromium-pwa
```

## Escenario D: actualizacion segura

**Estado: Automatizacion superada; evidencia fisica NO MEDIDO por desviacion aceptada.**

- `updateCoordinator.test.ts` verifica aplazamiento durante partida activa, guard duradero,
  activacion unica, reintento y ausencia de filtrado del error tecnico.
- `tests/e2e/update.spec.ts` contiene una descarga de B interrumpida y un recorrido A/B que pospone
  la activacion hasta el punto seguro y comprueba la persistencia.
- El contrato Vitest y la prueba E2E de dos builds y dos service workers pasaron en CI.

Comando ejecutado en CI:

```bash
npx playwright test tests/e2e/update.spec.ts --project=chromium-pwa
```

## Escenario E: varias pestanas

**Estado: Automatizacion superada; evidencia fisica NO MEDIDO por desviacion aceptada.**

- `writerCoordination.spec.ts` paso sus cinco contratos: un unico writer, observer durante heartbeat,
  handoff tras release, toma de control solo despues de caducidad demostrada y degradacion al perder
  la propiedad.
- La evidencia usa dos coordinadores contra un store compartido determinista. No sustituye una
  prueba Playwright con dos paginas del mismo origen.
- No existe un recorrido E2E multi-ventana; el contrato determinista esta superado y la validacion
  manual queda `NO MEDIDO` bajo la desviacion aceptada.

Comando ejecutado para el contrato:

```bash
npx vitest run tests/integration/writerCoordination.spec.ts
```

## Matriz de dispositivos

La matriz de iPhone/Safari y Android/Chrome queda **NO MEDIDO**. No se ejecutaron pruebas fisicas
ni se registraron modelo, versiones, instalacion desde icono o duracion de apertura. La omision esta
documentada y aceptada como desviacion de T053; esos datos no se infieren de Playwright.
