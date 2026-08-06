# Research: Plataforma móvil instalable y offline

**Feature**: `IMP-1` / `001-mobile-offline-platform`
**Date**: 2026-08-07

## Decision 1: Runtime and build foundation

**Decision**: Usar Node.js 24 LTS para desarrollo y CI, TypeScript 5.9 estricto, React 19.2 y Vite
8.2 como aplicación cliente de un único paquete.

**Rationale**: Node 24 es una línea LTS mientras Node 26 continúa en estado Current. Vite ofrece
plantilla React + TypeScript, compilación estática y un objetivo de navegadores modernos adecuado
para iPhone y Android recientes. React facilita una interfaz con estados y transiciones crecientes
sin introducir un metaframework o servidor.

**Alternatives considered**:

- Vanilla TypeScript: menor tamaño, pero más código de coordinación y accesibilidad cuando crezcan
  las pantallas y configuraciones.
- Preact: reduce tamaño, pero el ahorro no compensa introducir diferencias de compatibilidad para
  este alcance.
- Next.js u otro metaframework: añade servidor, enrutamiento y convenciones innecesarias para una
  aplicación local estática.

**Sources**: [Node.js release status](https://nodejs.org/en/about/previous-releases),
[Vite documentation](https://vite.dev/guide/), [React versions](https://react.dev/versions),
[TypeScript 5.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html).

## Decision 2: PWA generation and controlled updates

**Decision**: Usar `vite-plugin-pwa` 1.2 con `generateSW`, precaché de todos los recursos compilados
y comportamiento de actualización solicitado, no recarga automática.

**Rationale**: El plugin genera manifest, service worker y registro con una configuración pequeña.
Su flujo `onOfflineReady` permite confirmar la preparación y `onNeedRefresh` permite aplazar la
activación. La aplicación no consume APIs, por lo que no necesita un service worker personalizado.

**Alternatives considered**:

- `injectManifest`: ofrece control total, pero obliga a mantener código propio sin un requisito que
  no cubra `generateSW`.
- Service worker manual: aumenta riesgo en precaché, limpieza y actualización.
- Actualización automática: puede recargar una partida y viola FR-012.

**Sources**: [Vite PWA guide](https://vite-pwa-org.netlify.app/guide/),
[prompt for update](https://vite-pwa-org.netlify.app/guide/prompt-for-update.html).

## Decision 3: Transactional local persistence

**Decision**: Usar IndexedDB a través de Dexie 4.x, encapsulado detrás de puertos propios.

**Rationale**: IndexedDB permite capacidad suficiente y transacciones. Dexie reduce el código
accidental y ofrece esquemas versionados y migraciones; sus transacciones revierten todas las
modificaciones si falla una operación o el navegador se cierra a mitad de escritura.

**Alternatives considered**:

- `localStorage`: síncrono, sin transacciones y poco apropiado para instantáneas y migraciones.
- IndexedDB nativo: viable, pero aumenta código repetitivo y superficie de errores.
- OPFS o SQLite/WASM: complejidad y tamaño innecesarios para menos de 10 MB.

**Sources**: [Dexie design and transactions](https://dexie.org/docs/Tutorial/Design),
[Dexie version upgrades](https://dexie.org/docs/Version/Version.upgrade()).

## Decision 4: State and navigation without extra frameworks

**Decision**: Usar reductores y máquinas de estado discriminadas en TypeScript, con navegación
interna controlada por la aplicación y puertos inyectables para persistencia, reloj y conectividad.

**Rationale**: El alcance no requiere rutas compartibles ni estado de servidor. Un modelo explícito
mantiene los secretos fuera de la URL y permite pruebas deterministas. Si la complejidad futura
demuestra la necesidad de una librería de máquinas de estado, se evaluará mediante otra spec.

**Alternatives considered**:

- React Router: no aporta valor al flujo de un único dispositivo y puede facilitar exposición de
  estado privado en rutas.
- Redux/Zustand: estado global prematuro; los reductores y contextos de composición son suficientes.
- XState: potente, pero añade peso conceptual antes de diseñar las reglas completas.

## Decision 5: Testing strategy

**Decision**: Usar Vitest 4.x y Testing Library para unidades/componentes, `fake-indexeddb` para
adaptadores, Playwright para pruebas end-to-end y axe-core para comprobaciones automáticas de
accesibilidad, complementadas con dispositivos reales.

**Rationale**: Vitest comparte la transformación de Vite y soporta pruebas rápidas. Playwright puede
observar service workers en Chromium y validar aperturas offline; como su soporte directo de service
workers está limitado a Chromium, la instalación y el comportamiento iOS requieren una matriz
manual real.

**Alternatives considered**:

- Solo tests unitarios: no prueban manifest, service worker, cache ni actualización.
- Cypress: válido para UI, pero Playwright proporciona control de contextos, conexión y múltiples
  motores en una única herramienta.
- Solo emulación móvil: no reproduce por completo la instalación PWA de Safari iOS.

**Sources**: [Vitest guide](https://vitest.dev/guide/),
[Playwright service workers](https://playwright.dev/docs/service-workers).

## Decision 6: Hosting and continuous delivery

**Decision**: Publicar el artefacto estático en GitHub Pages mediante GitHub Actions después de
integrarlo en `main`. CI valida las pull requests pero no las despliega.

**Rationale**: El repositorio ya está en GitHub, Pages proporciona HTTPS necesario para PWA y no
introduce un proveedor o backend adicional. El flujo oficial separa build, artefacto y despliegue.

**Alternatives considered**:

- Vercel/Netlify/Cloudflare Pages: buenas opciones, pero añaden otra cuenta y configuración sin una
  necesidad actual.
- Publicar una carpeta compilada en una rama: mezcla artefactos generados con fuentes y reduce la
  trazabilidad.
- Distribución nativa: fuera del alcance de IMP-1.

**Sources**: [GitHub Pages custom workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages),
[Vite static deployment](https://vite.dev/guide/build).

## Decision 7: Browser support and multi-tab safety

**Decision**: Soportar las dos versiones principales más recientes de Safari iOS y Chrome Android
en la fecha de publicación. Permitir una sola instancia escritora y convertir instancias adicionales
en observadoras hasta adquirir el permiso de escritura.

**Rationale**: Coincide con el supuesto de la spec y evita conflictos en revisiones e instantáneas.
La coordinación usará capacidades nativas con degradación segura: si no se puede demostrar
exclusividad, la instancia no escribirá.

**Alternatives considered**:

- Last-write-wins entre pestañas: puede perder progreso confirmado.
- Bloquear completamente la segunda pestaña: seguro, pero una vista informativa con recuperación es
  más comprensible.
- Sin coordinación: viola los requisitos de integridad y recuperación.
