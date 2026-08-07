# Resultados de validacion del quickstart

**Feature**: `IMP-1` / `001-mobile-offline-platform`  
**Fecha del registro**: 2026-08-07  
**Entorno**: workspace local de Codex, Node.js 24

Este registro solo recoge evidencia automatizada ejecutada o pruebas automatizadas descubiertas.
Un test listado con `--list` se considera pendiente hasta que se ejecute en CI o en un entorno local
con los navegadores de Playwright disponibles. No se han realizado pruebas en dispositivos fisicos
ni se han medido tiempos de apertura.

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

**Estado: Automatizacion superada; evidencia fisica pendiente.**

- `offlineLifecycle.test.ts` confirma que la aplicacion solo publica `offline-ready` despues de la
  preparacion y que los cambios de conectividad no interrumpen un estado ya preparado.
- `tests/e2e/offline.spec.ts` contiene el caso `reloads a prepared production build with no network`
  y el control de precache del shell, JavaScript y CSS.
- La ejecucion E2E queda pendiente de CI. El navegador local no pudo iniciarse por dependencias de
  sistema ausentes (`libnspr4.so`) y la instalacion de dependencias requiere privilegios no
  disponibles en este entorno.
- El objetivo de apertura inferior a 3 segundos queda pendiente de un dispositivo representativo;
  no se registra ningun tiempo simulado.

Comando pendiente:

```bash
npx playwright test tests/e2e/offline.spec.ts --project=chromium-pwa
```

## Escenario B: primera carga interrumpida

**Estado: Automatizacion superada; evidencia fisica pendiente.**

- `offlineLifecycle.test.ts` verifica la transicion a preparacion requerida y el reintento seguro.
- `tests/e2e/offline.spec.ts` contiene `explains an interrupted first preparation and retries when
  connectivity returns`, que aborta la descarga del service worker y comprueba mensaje y accion.
- La ejecucion del recorrido de navegador queda pendiente por la misma limitacion local del
  escenario A y porque CI aun no se ha ejecutado sobre este worktree.

Comando pendiente:

```bash
npx playwright test tests/e2e/offline.spec.ts \
  --project=chromium-pwa \
  --grep "interrupted first preparation"
```

## Escenario C: recuperacion atomica

**Estado: Automatizacion superada; evidencia fisica pendiente.**

- `persistenceGateway.spec.ts` verifica conflicto de revision, conservacion del snapshot confirmado
  ante un commit invalido, permiso de escritura y borrado confirmado.
- `persistenceMigrations.spec.ts` verifica rollback y modo seguro ante un esquema futuro.
- `recoveryService.test.ts` verifica restauracion para writer/observer, preservacion incompatible y
  borrado confirmado.
- `tests/e2e/recovery.spec.ts` contiene casos de reapertura, transaccion IndexedDB abortada, falta de
  espacio, indisponibilidad, eliminacion externa y borrado confirmado.
- Los contratos Vitest y los casos Playwright pasaron en CI.

Comando pendiente:

```bash
npx playwright test tests/e2e/recovery.spec.ts --project=chromium-pwa
```

## Escenario D: actualizacion segura

**Estado: Automatizacion superada; evidencia fisica pendiente.**

- `updateCoordinator.test.ts` verifica aplazamiento durante partida activa, guard duradero,
  activacion unica, reintento y ausencia de filtrado del error tecnico.
- `tests/e2e/update.spec.ts` contiene una descarga de B interrumpida y un recorrido A/B que pospone
  la activacion hasta el punto seguro y comprueba la persistencia.
- El contrato Vitest paso; la prueba de dos builds y dos service workers queda pendiente de CI.

Comando pendiente:

```bash
npx playwright test tests/e2e/update.spec.ts --project=chromium-pwa
```

## Escenario E: varias pestanas

**Estado: Automatizacion superada; evidencia fisica pendiente.**

- `writerCoordination.spec.ts` paso sus cinco contratos: un unico writer, observer durante heartbeat,
  handoff tras release, toma de control solo despues de caducidad demostrada y degradacion al perder
  la propiedad.
- La evidencia usa dos coordinadores contra un store compartido determinista. No sustituye una
  prueba Playwright con dos paginas del mismo origen.
- No existe todavia un recorrido E2E multi-ventana, por lo que la validacion manual del quickstart
  permanece pendiente.

Comando ejecutado para el contrato:

```bash
npx vitest run tests/integration/writerCoordination.spec.ts
```

## Matriz de dispositivos

Toda la matriz de iPhone/Safari y Android/Chrome permanece **pendiente**. No se han ejecutado pruebas
fisicas ni registrado modelo, version del sistema, version del navegador, instalacion desde icono o
duracion de apertura. Esos datos deben completarse con dispositivos reales; no se infieren de los
proyectos emulados de Playwright.
