# Implementation Plan: Continuidad, ayuda, ajustes y accesibilidad

**Branch**: `010-continuity-settings-accessibility` | **Date**: 2026-08-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification for Jira epic `IMP-10` and [screen inventory](../screen-inventory.md).

## Summary

Construir el shell transversal de producto sobre React, Dexie, PWA, recovery e i18n existentes. Un
coordinador de continuidad consume puertos public-only registrados por cada feature IMP-2..IMP-9:
obtiene un `SafeResumeSummary`, solicita pausa durable y abre la superficie compartida segura sin
recibir snapshots secretos. Pausa desde timer delega en IMP-6 y espera su commit antes de Home;
abandonar usa una unica autoridad con deleters game-scoped registrados.

Las preferencias amplian el registro `preferences` existente con onboarding y alto contraste. Ayuda
y onboarding usan contenido local versionado. El borrado global usa un inventario central de stores
y una unica operacion confirmada, conservando Cache Storage, manifest y service worker. `AppShell`
se convierte en la base accesible compartida con safe areas, foco, dialogos, reduced motion y una
accion primaria estable, sin importar Tailwind ni `ProposedUI`.

## Technical Context

**Language/Version**: TypeScript 5.9 estricto, React 19.2, Node.js 24

**Primary Dependencies**: React, Dexie, vite-plugin-pwa y dependencias existentes; cero paquetes nuevos

**Storage**: `preferences`, `recoverySnapshots`, `metadata` y stores existentes/futuros registrados
en `LocalDataInventory`; no se crea un store de resumen ni se duplican snapshots de features

**Testing**: Vitest, Testing Library, fake-indexeddb, Playwright, axe-core

**Target Platform**: PWA movil cliente, iPhone/Android, vertical, offline tras primera preparacion

**Performance Goals**: Home y preferencias responden en menos de 100 ms tras lectura local; cero red
para ayuda; feedback opcional no bloquea; bundle total bajo 180 KiB gzip

**Constraints**: writer lease y revision; persist-before-navigation; resumen, rutas, errores y logs
sin secretos; APIs audio/haptica opcionales; 320 px, zoom 200 %, 44x44 px, reduced motion

**Scale/Scope**: Un agregado de partida activo, 3-20 participantes, preferencias por dispositivo y
todos los stores registrados por IMP-1..IMP-9

## Constitution Check

| Principle / Constraint | Design evidence | Result |
|---|---|---|
| Specification and Traceability First | Spec, inventario, plan, research, modelo, contrato y quickstart preceden tasks/codigo | PASS |
| Secret Information Stays Private | Cada feature proyecta resumen/ruta publicos; el coordinador nunca recibe su envelope secreto | PASS |
| Offline-First and Recoverable | Preferencias y ayuda son locales; pause espera commit; resume parte del ultimo snapshot confirmado | PASS |
| Tested, Deterministic Game Rules | IMP-10 no reimplementa reglas; adaptadores verifican fase y comandos idempotentes | PASS |
| Mobile Simplicity and Accessibility | Shell full viewport, CTA estable, dialogs con foco, 320 px, zoom y reduced motion | PASS |
| Client-only PWA | Sin backend, cuentas, telemetria ni assets remotos | PASS |
| Minimal dependencies | Reutiliza React, Dexie, CSS, i18n, PWA y APIs opcionales existentes | PASS |

No se requieren excepciones. El registro de adaptadores evita tanto un Context global con secretos
como una union central que deba conocer todos los payloads privados.

## Project Structure

```text
src/
  domain/entities/continuity.ts
  domain/entities/continuity.test.ts
  domain/ports/continuity.ts
  features/continuity/components/HomeScreen.tsx
  features/continuity/components/GameMenu.tsx
  features/continuity/components/SettingsScreen.tsx
  features/continuity/components/HelpScreen.tsx
  features/continuity/components/OnboardingScreen.tsx
  features/continuity/hooks/useContinuity.ts
  features/continuity/services/continuityService.ts
  features/continuity/services/preferencesService.ts
  infrastructure/persistence/preferencesRepository.ts
  infrastructure/persistence/localDataRepository.ts
  infrastructure/persistence/storeRegistry.ts
  infrastructure/device/browserFeedback.ts
  app/App.tsx
  app/AppShell.tsx
  app/navigation.ts
  i18n/es.ts
  styles/global.css
tests/integration/continuityRepositories.spec.ts
tests/e2e/continuity-settings.spec.ts
tests/accessibility/app-shell.spec.ts
```

## Design Decisions

### Feature-owned public continuity ports

- Cada feature recuperable aporta un adaptador con `canHandle`, `summarize`, `safeResumeRoute` y
  `pauseForHome`. Un discriminante publico versionado debe seleccionar exactamente uno; cero o
  varios adapters activan safe mode.
- El adaptador recibe su estado interno dentro de la frontera que ya lo posee y devuelve solo tipos
  publicos. Home/coordinador no reciben `RecoverySnapshot.payload`, roles, concepto, votos ni intento.
- Resume siempre elige lista/shared/covered handoff. Una vista privada nunca es ruta recuperable.

### Pause is a two-step orchestration, not a new game rule

- El coordinador solicita `pauseForHome(expectedRevision)` a la feature activa y navega solo con
  confirmacion durable. IMP-6 convierte running a paused; otras features confirman su snapshot sin
  ejecutar su CTA principal.
- Stale recarga resumen/ruta sin replay. Observer no puede pausar/abandonar. Cerrar el menu no escribe.

### Preferences and feedback are local and secret-independent

- `LocalPreferences` versionada incluye sonido, vibracion, adulto, alto contraste y onboarding.
- Audio/haptica se invoca mediante gateways opcionales; fallo/denegacion es no-op. Los patrones se
  eligen por hito publico o generico, nunca por rol, voto o resultado privado.
- Adulto es disponibilidad preferida; IMP-4 conserva confirmacion por partida.

### Deletion has two explicit scopes

- `abandon-active-game` usa `ActiveGameDataInventory` y una transaccion central para limpiar recovery
  y todos los datos ligados al gameId, conservando grupos, categorias y preferencias.
- `delete-all-local-data` consume un StoreRegistry unico compartido por migrations, database, gateway
  y borrado. El fallback usa un marker durable y solo cuenta como exito tras recrear y verificar.
- Ningun scope borra caches PWA, service worker o manifest.

### Rematch is a public input owned by IMP-9

- IMP-9 crea `RematchSeed` con source/new gameId y roster draft. IMP-10 valida que el ID sea nuevo y
  enruta por reviews editables IMP-2/3/4 sin reconstruir la politica de preservacion.
- Preferencias v1->v2 se normalizan como upgrade de value/guard en el store existente; no se crea
  otra tabla Dexie.

### Accessible shell is shared infrastructure

- `AppShell` aporta skip link, landmarks, safe areas, header compacto, body scrollable y footer/CTA.
- Dialog/sheet controla foco inicial, Escape, fondo inert y restauracion. Toast/progreso anuncian sin
  secuestrar foco. Toggle/segmented exponen roles y estados nativos/ARIA.
- `prefers-reduced-motion` elimina animacion no esencial; contraste usa tokens semanticos y no solo color.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Registro de adaptadores public-only por feature | Las fases IMP-5..9 tienen recovery y pause distintos, algunos con secretos | Un coordinador que inspecciona payloads conoce secretos y duplica guards/reglas |
| Inventario central de stores | Delete-all debe incluir stores presentes y futuros de IMP-1..9 de manera auditable | Lista dispersa puede olvidar historiales o metadata y declarar un reset incompleto |
