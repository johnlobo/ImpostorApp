# Quickstart Validation: Plataforma móvil instalable y offline

Esta guía describe cómo demostrar IMP-1 una vez implementada. Los comandos son el contrato esperado
del proyecto; `$speckit-tasks` será responsable de crear su configuración.

## Prerequisites

- Node.js 24 LTS
- npm incluido con Node
- Navegador Chromium para automatización PWA
- Safari/WebKit y un iPhone real para validación de instalación
- Un Android real con Chrome para validación de instalación

## Local setup

```bash
npm ci
npm run dev
```

Abrir la URL local mostrada por Vite. La pantalla debe indicar que el modo offline solo quedará
preparado tras instalarse correctamente el service worker.

## Quality gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Todos los comandos deben terminar con código cero antes de integrar cambios.

## Validate the production build locally

```bash
npm run build
npm run preview
```

Usar el build de producción: el service worker no debe considerarse validado únicamente con el
servidor de desarrollo.

## Scenario A: First load and offline reopening

1. Borrar datos y service workers del origen de prueba.
2. Abrir el build de producción con conexión.
3. Esperar el estado `offline-ready`.
4. Activar modo offline en las herramientas del navegador o modo avión en el dispositivo.
5. Cerrar todas las ventanas de ImpostorApp.
6. Abrir de nuevo desde el icono o URL.
7. Verificar que la pantalla inicial aparece, no hay solicitudes fallidas imprescindibles y todas
   las funciones incluidas siguen disponibles.

**Expected**: apertura inferior a 3 segundos en el dispositivo objetivo y ninguna dependencia de
red durante el recorrido.

## Scenario B: Interrupted first load

1. Borrar datos del origen.
2. Interrumpir la red antes de recibir `offline-ready`.
3. Cerrar y volver a abrir offline.

**Expected**: mensaje `first-load-required`, datos existentes intactos y acción clara para
reintentar cuando vuelva la conexión.

## Scenario C: Atomic recovery

1. Crear una instantánea representativa mediante el fixture end-to-end.
2. Interrumpir una escritura antes de su confirmación.
3. Cerrar forzosamente la aplicación y abrirla de nuevo.

**Expected**: se recupera la última revisión completa; nunca aparece una mezcla de revisiones.

## Scenario D: Safe update

1. Ejecutar la versión A y comenzar una partida simulada.
2. Publicar o servir la versión B.
3. Forzar la comprobación de actualización.
4. Verificar que se informa de la versión B sin recargar la partida.
5. Posponer, terminar la partida simulada y aplicar la actualización.

**Expected**: la versión A continúa durante la partida; B se activa una vez en el punto seguro y
los datos locales siguen disponibles.

## Scenario E: Multiple tabs

1. Abrir dos ventanas del mismo origen.
2. Adquirir la concesión de escritura en la primera.
3. Intentar confirmar un cambio desde la segunda.
4. Cerrar la primera y esperar la liberación/caducidad segura.

**Expected**: la segunda ventana no escribe mientras observa; solo adquiere escritura después de
confirmar que la primera ya no es propietaria.

## Device installation matrix

| Device | Browser | Checks |
|---|---|---|
| iPhone, versión principal más reciente | Safari | Añadir a inicio, icono, apertura vertical, offline, actualización |
| iPhone, versión principal anterior | Safari | Apertura, offline, persistencia, ayuda de instalación |
| Android, versión principal más reciente | Chrome | Instalación, icono, apertura vertical, offline, actualización |
| Android, versión principal anterior | Chrome | Apertura, offline, persistencia, ayuda de instalación |

Registrar modelo, versión del sistema, navegador, duración de apertura y resultado de cada caso.
