# Implementation Plan: Asignacion secreta y revelacion segura de roles

**Branch**: `005-secret-role-assignment` | **Date**: 2026-08-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification for Jira epic `IMP-5`.

## Summary

Preparar de forma atomica el reparto secreto de una ronda combinando el `PreparedGame` de IMP-3 y
el sorteo de contenido de IMP-4, y entregar una experiencia de "pasar el movil" en la que cada
jugador revela su rol una unica vez en una pantalla privada cubierta. La confirmacion de ronda
asigna roles con RNG inyectable, dibuja el concepto reutilizando la funcion de dominio de IMP-4 y
persiste el draw, el historial de reparto de impostores y el snapshot secreto en una sola
transaccion Dexie. Cada revelacion actualiza ese mismo snapshot mediante el mecanismo de revision
optimista ya existente. El progreso publico y "Empezar ronda" se derivan del snapshot sin nunca
exponer roles, y el modo observador solo ve esa proyeccion publica.

## Technical Context

**Language/Version**: TypeScript 5.9 estricto, React 19.2, Node.js 24

**Primary Dependencies**: React, Dexie y dependencias existentes; no se anaden paquetes

**Storage**: `used-concepts` y `recoverySnapshots`/`metadata` existentes; se anade una nueva tabla
Dexie `role-assignment-history` (migracion version 2) para el historial de reparto de impostores por
partida que exige `allocation: 'balanced'`

**Testing**: Vitest, Testing Library, fake-indexeddb, Playwright y axe-core

**Target Platform**: PWA cliente para iPhone y Android, vertical y offline

**Performance Goals**: Revelar u ocultar el contenido privado responde en menos de 100 ms; la
confirmacion de ronda es una unica transaccion Dexie sin bloqueo perceptible; bundle total bajo el
presupuesto vigente de 180 KiB gzip

**Constraints**: RNG inyectable para asignacion y sorteo; sin texto secreto en URL, logs, errores o
metadatos de accesibilidad; escritor unico via el mecanismo de coordinacion existente; el modo
observador nunca monta la vista privada; recuperacion offline sin repetir el RNG

**Scale/Scope**: 3 a 20 jugadores, hasta 3 impostores por partida (regla ya validada por IMP-3), 1 a
10 rondas por partida con historial de reparto balanceado acumulado

## Constitution Check

| Principle / Constraint | Design evidence | Result |
|---|---|---|
| Specification and Traceability First | IMP-5 trazada mediante spec, plan, tasks y checklists versionados | PASS |
| Secret Information Stays Private | Roles y concepto solo se proyectan en la vista privada de su dueno; proyecciones publicas (`PublicRoundProgress`) excluyen todo campo secreto por construccion de tipos | PASS |
| Offline-First and Recoverable | `SecretRoundSnapshot` persistido en `recoverySnapshots` con revision optimista; migracion Dexie versionada y aditiva para el historial de reparto | PASS |
| Tested, Deterministic Game Rules | `assignRoles` y el sorteo reutilizado (`drawNextConcept`) son funciones de dominio puras con RNG inyectado | PASS |
| Mobile Simplicity and Accessibility | Cortinilla explicita, foco visible, nombres semanticos distintos entre superficie compartida y vista privada | PASS |
| Client-only PWA | Sin backend, cuentas ni carga remota | PASS |
| Minimal dependencies | Cero dependencias nuevas | PASS |

No se requieren excepciones constitucionales; la unica desviacion tecnica (nueva migracion y
repositorio transaccional de tres tablas) se documenta en Complexity Tracking porque la API generica
`PersistenceGateway` no puede expresar una escritura atomica sobre tablas heterogeneas.

## Project Structure

### Documentation (this feature)

```text
specs/005-secret-role-assignment/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── tasks.md
├── checklists/
│   ├── implementation.md
│   └── requirements.md
└── contracts/
│   └── role-assignment.md
```

### Source Code (repository root)

```text
src/
  domain/
    entities/secretRoleAssignment.ts
    entities/secretRoleAssignment.test.ts
    ports/secretRoleAssignment.ts
  features/secret-role-assignment/
    components/SecretRoleAssignmentScreen.tsx
    components/SecretRoleAssignmentScreen.test.tsx
    hooks/useSecretRoleAssignment.ts
    services/secretRoleAssignmentService.ts
    services/secretRoleAssignmentService.test.ts
  infrastructure/persistence/
    secretRoundRepository.ts
    migrations.ts            # extended with version 2 (role-assignment-history)
  app/App.tsx                # wires SecretRoleAssignmentScreen after ContentCatalogFlow
  i18n/es.ts

tests/
  integration/secretRoundRepository.spec.ts
  e2e/secret-role-assignment.spec.ts
  accessibility/secret-role-assignment.spec.ts
```

**Structure Decision**: Sigue exactamente el patron de `src/features/content-catalog/` (IMP-4):
entidades y puertos en `domain/`, un servicio con maquina de estados por suscripcion en
`features/secret-role-assignment/services/`, un hook fino en `hooks/`, componentes de presentacion en
`components/`, y un repositorio de infraestructura que reutiliza `PersistenceDatabase` directamente
para la transaccion atomica multi-tabla, igual que `conceptDrawRepository.ts` hace hoy para
`used-concepts`.

## Design Decisions

### Atomic round preparation reuses IMP-4's domain draw, not its repository

- `SecretRoundRepository.prepare` corre en una unica transaccion Dexie sobre `used-concepts`,
  `role-assignment-history` y `recoverySnapshots`/`metadata`.
- Reutiliza la funcion de dominio pura `drawNextConcept` de `contentCatalog.ts` (ya exportada) sobre
  la `PreparedContentSelection` confirmada, en vez de invocar `ConceptDrawRepository.drawAndMarkUsed`
  como caja opaca: ese puerto posee su propia transaccion y su propia cola de serializacion por
  `gameId`, por lo que no puede componerse dentro de una transaccion mayor sin duplicar su logica de
  seleccion. Ver `research.md` para la alternativa descartada.
- El esquema de `ConceptHistory` en `used-concepts` no cambia; IMP-5 escribe con el mismo formato que
  IMP-4 ya valida.

### New history table for balanced allocation across rounds

- `allocation: 'balanced'` necesita saber cuantas veces fue impostor cada jugador en rondas previas
  de la misma partida. Ninguna tabla existente representa ese dato sin sobrecargar su significado.
- Se anade la migracion Dexie version 2, unicamente aditiva (`role-assignment-history: '&key'`),
  siguiendo el mismo patron de `persistenceMigrations` y sin tocar tablas existentes.
- El repositorio accede a esta tabla igual que `conceptDrawRepository` accede a `used-concepts`: via
  `Pick<PersistenceDatabase, 'table' | 'transaction'>`, sin extender `PersistenceNamespace` ni
  `PersistenceGateway`.

### One secret snapshot, one phase, self-sufficient for future rounds

- El snapshot secreto reemplaza la fase `content-selected` con una nueva fase `round-prepared` en el
  mismo registro `recoverySnapshots` (`id: 'active-game'`), preservando el mecanismo de revision
  optimista ya usado por IMP-3 e IMP-4.
- `SecretRoundSnapshot.content` conserva la `PreparedContentSelection` completa (categorias,
  seleccion, IDs elegibles) para que una ronda siguiente de la misma partida pueda repetir el sorteo
  sin recuperar una fase anterior ya sobrescrita.
- Cada revelacion confirmada es una escritura adicional sobre el mismo registro (mismo mecanismo de
  `expectedRevision`); no se crean tablas ni fases nuevas para `RevealState`.

### Privacy is enforced by projection, not by storage separation

- El snapshot secreto persiste roles y concepto en claro en IndexedDB local, tal como exige la
  recuperacion offline (Historia 5); la privacidad constitucional se cumple en la capa de UI/servicio
  mediante proyecciones puras (`derivePublicProgress`, `resolvePrivateRoleView`) que son las unicas
  funciones autorizadas a alimentar la superficie compartida y el modo observador.
- No existe enrutamiento por URL en la aplicacion (`src/app/navigation.ts` es un reducer en memoria
  sin historial), por lo que el requisito de "sin secretos en URL" se cumple estructuralmente; los
  tests de componente deben, aun asi, verificar que la rama de observador nunca recibe campos
  secretos como props.

### RoundHandoff is a derived, side-effect-free value

- "Empezar ronda" no persiste ningun estado nuevo: una vez que `reveals` esta en N/N, `confirmHandoff`
  es una funcion pura del snapshot ya durable. Repetir la pulsacion recalcula el mismo valor sin
  escribir de nuevo, satisfaciendo la idempotencia de la Historia 3 sin una fase o tabla adicional.
- `RoundHandoff` no contiene roles ni concepto; IMP-6 recibe solo una referencia (`gameId`,
  `roundNumber`, `preparedAt`) y se espera que relea el snapshot con su propio control de acceso
  privado cuando lo necesite.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Migracion Dexie version 2 + repositorio transaccional sobre tres tablas (`used-concepts`, `role-assignment-history`, `recoverySnapshots`/`metadata`) | FR-004 exige que el draw, el historial de conceptos y el snapshot secreto se confirmen en una unica transaccion durable; ademas `allocation: 'balanced'` exige historial entre rondas que ninguna tabla existente modela | Componer dos llamadas independientes a `ConceptDrawRepository.drawAndMarkUsed` y a un guardado de snapshot aparte no es atomico: una fallaria despues de la otra, dejando exactamente el estado parcial que FR-005 prohibe |
