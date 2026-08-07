# Implementation Plan: Plataforma móvil instalable y offline

**Branch**: `001-mobile-offline-platform` | **Date**: 2026-08-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-mobile-offline-platform/spec.md` (`IMP-1`)

## Summary

Crear la base de ImpostorApp como una aplicación React de una sola página, compilada como sitio
estático e instalable como PWA. Todos los recursos de la versión se precargarán para uso offline;
las actualizaciones permanecerán en espera hasta que el usuario las aplique en un punto seguro. Los
datos locales se almacenarán transaccionalmente en IndexedDB detrás de puertos propios para evitar
que las reglas de negocio dependan del navegador o de una librería concreta. GitHub Actions validará
el proyecto y publicará la rama principal en GitHub Pages.

## Technical Context

**Language/Version**: TypeScript 5.9 en modo estricto; Node.js 24 LTS para desarrollo y CI

**Primary Dependencies**: React 19.2, Vite 8.2, `vite-plugin-pwa` 1.3 y Dexie 4.x. Sin router,
biblioteca de estado global ni kit visual en esta fase

**Storage**: IndexedDB mediante Dexie para datos versionados y transaccionales; Cache Storage
gestionado por el service worker para recursos de aplicación

**Testing**: Vitest 4.x, Testing Library, `fake-indexeddb`, Playwright y comprobaciones de
accesibilidad automatizadas con axe-core; validación manual final en iPhone y Android reales

**Target Platform**: Navegadores modernos de iPhone y Android; instalación desde navegador y
ejecución vertical como PWA. Despliegue estático bajo HTTPS en GitHub Pages

**Project Type**: Aplicación web cliente, de un único paquete y sin backend

**Performance Goals**: Pantalla inicial offline disponible en menos de 3 segundos en el 95 % de
las aperturas de la matriz; interacción a 60 fps en transiciones habituales; recurso inicial
comprimido objetivo inferior a 250 kB sin contar iconos

**Constraints**: Offline después de la primera carga; cero cuentas, analítica o llamadas remotas de
ejecución; actualización diferida durante partidas; escrituras atómicas; interfaz vertical sin
desbordamiento horizontal; secretos nunca persistidos en logs o URL

**Scale/Scope**: Un dispositivo por partida, 3-20 jugadores y menos de 10 MB de datos locales
esperados. Base para unas 15 categorías iniciales, grupos guardados y una partida recuperable

## Constitution Check

*GATE inicial: PASS. Revisión posterior al diseño: PASS.*

| Principle / Constraint | Design evidence | Result |
|---|---|---|
| Specification and Traceability First | `IMP-1`, `spec.md`, este plan y futuros `tasks.md` forman la cadena de trazabilidad | PASS |
| Secret Information Stays Private | Arquitectura cliente, sin red ni analítica; contratos prohíben secretos en URL, logs y estados compartidos | PASS |
| Offline-First and Recoverable | Precaché completo, actualización solicitada y persistencia transaccional versionada | PASS |
| Tested, Deterministic Game Rules | Dominio separado, puertos inyectables y estrategia de pruebas antes de implementación | PASS |
| Mobile Simplicity and Accessibility | React semántico, CSS propio, controles accesibles y pruebas axe más dispositivo real | PASS |
| Client-only PWA | Sitio estático en GitHub Pages; no se introduce backend | PASS |
| Minimal dependencies | Solo se añaden dependencias con responsabilidad concreta; no hay router, estado global ni UI kit | PASS |

No existen excepciones constitucionales ni complejidad que requiera justificación.

## Project Structure

### Documentation (this feature)

```text
specs/001-mobile-offline-platform/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── local-persistence.md
│   └── platform-lifecycle.md
├── checklists/
│   └── requirements.md
└── tasks.md                 # generado posteriormente por $speckit-tasks
```

### Source Code (repository root)

```text
public/
├── icons/
└── static/

src/
├── app/
│   ├── App.tsx
│   ├── AppShell.tsx
│   └── navigation.ts
├── domain/
│   ├── entities/
│   └── ports/
├── features/
│   └── platform/
│       ├── components/
│       ├── hooks/
│       └── services/
├── infrastructure/
│   ├── persistence/
│   ├── pwa/
│   └── coordination/
├── i18n/
│   ├── es.ts
│   └── translate.ts
├── styles/
├── test/
└── main.tsx

tests/
├── integration/
├── e2e/
├── accessibility/
└── fixtures/

.github/workflows/
├── ci.yml
└── deploy-pages.yml
```

**Structure Decision**: Un único proyecto cliente mantiene simple el despliegue y el uso offline.
Las reglas y entidades viven en `domain/`; las APIs del navegador y las librerías externas quedan
encapsuladas en `infrastructure/`; la experiencia propia de IMP-1 reside en `features/platform/`.
Los tests unitarios pueden vivir junto al código, mientras las pruebas que cruzan capas permanecen
en `tests/`.

## Design Decisions

### Application composition

- React renderiza una única aplicación cliente. La navegación se modela con un estado tipado y no
  con rutas, evitando añadir un router y evitando que información privada aparezca en la URL.
- Los textos se resuelven mediante un diccionario tipado español; añadir idiomas requerirá nuevos
  diccionarios, no cambios en el dominio.
- CSS propio con variables de diseño evita un kit visual y permite controlar tamaños táctiles,
  contraste, áreas seguras y comportamiento en orientación vertical.

### Offline and update lifecycle

- `vite-plugin-pwa` genera manifest, service worker y precaché con estrategia `generateSW`.
- El registro usa actualización solicitada: `offline-ready` informa de la preparación y
  `update-available` espera hasta que no haya una partida activa o el usuario confirme.
- La versión activa continúa controlando las pestañas existentes. Una descarga incompleta no
  reemplaza el conjunto de recursos anterior.
- No se cachean APIs ni contenido remoto porque la primera versión no realiza solicitudes de
  ejecución externas.

### Persistence and recovery

- Dexie implementa un adaptador IndexedDB; el dominio solo conoce los contratos descritos en
  `contracts/local-persistence.md`.
- Cada instantánea tiene versión de esquema y revisión monotónica. Las escrituras de estado y
  metadatos relacionados ocurren en una única transacción.
- Las migraciones se ejecutan dentro de la transacción de actualización de IndexedDB. Un fallo
  aborta la actualización y conserva la versión anterior; nunca se vacía la base como recuperación.
- Una sola instancia obtiene permiso de escritura. Otras pestañas muestran un aviso y permanecen
  en modo seguro hasta poder adquirir el permiso.

### Validation and delivery

- Vitest cubre dominio, puertos y componentes; IndexedDB se simula con `fake-indexeddb`.
- Playwright valida instalación indirecta, registro del service worker, precaché, reapertura offline
  y actualización en Chromium. WebKit automatizado cubre navegación, persistencia y presentación;
  las limitaciones reales de instalación en iOS se validan manualmente.
- CI ejecuta formato, lint, tipos, tests, build y pruebas end-to-end críticas.
- GitHub Pages despliega únicamente un artefacto validado procedente de `main`, con el prefijo de
  ruta del repositorio aplicado a recursos, manifest y ámbito de la PWA.

## Complexity Tracking

No hay violaciones constitucionales que registrar.
