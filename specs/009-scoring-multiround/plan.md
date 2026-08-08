# Implementation Plan: Puntuacion y continuidad multirronda

**Branch**: `009-scoring-multiround` | **Date**: 2026-08-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification for Jira epic `IMP-9`.

## Summary

Consumir el `RoundResolutionHandoff` exacto de IMP-8 mediante un coordinador interno repositorio-a-
repositorio y convertirlo mediante dominio puro en un ledger
idempotente, totales y ranking publico estable. Un repositorio especializado confirma en una unica
transaccion la ronda puntuada, `game-scoreboards`, la referencia de recovery y metadata. El handoff
con `originalRoles` y `RoundPreparationSource` quedan confinados al agregado interno; servicio, hook,
App, UI, observer y errores solo reciben `PublicGameScoreboard`.

La siguiente accion se deriva unicamente comparando ronda y total configurado. `next-round` confirma
primero la intencion y llama a un coordinador que reutiliza la preparacion atomica existente de IMP-5:
dentro de ella se ejecuta primero el draw de dominio de IMP-4 y despues la asignacion IMP-5, con un
solo commit sobre concepto, historial equilibrado, snapshot y metadata. Un fallo conserva ledger y
marcador. Revancha crea otra identidad y conduce por revisiones editables IMP-2, IMP-3 e IMP-4.

## Technical Context

**Language/Version**: TypeScript 5.9 estricto, React 19.2, Node.js 24

**Primary Dependencies**: React y Dexie existentes; ninguna dependencia nueva

**Storage**: nueva tabla aditiva `game-scoreboards` mas `recoverySnapshots` y `metadata`; se conservan
`used-concepts` y `role-assignment-history` bajo IMP-4/IMP-5

**Testing**: Vitest, Testing Library, fake-indexeddb, Playwright y axe-core

**Target Platform**: PWA cliente movil compartida, vertical y completamente offline

**Performance Goals**: calculo O(rondas × jugadores), commit local perceptible en menos de 100 ms,
ranking de hasta 20 filas sin cambios de layout, bundle total bajo 180 KiB gzip

**Constraints**: 3-20 jugadores, 1-10 rondas, 1-3 impostores; writer lease, revision optimista,
idempotencia por `resultId`, cero secretos en proyecciones publicas y sin backend/telemetria

**Scale/Scope**: maximo 10 resultados, 20 jugadores y 30 movimientos base mas bonus por ronda; una
partida activa y sus datos reutilizables locales

## Constitution Check

| Principle / Constraint | Design evidence | Result |
|---|---|---|
| Specification and Traceability First | Spec IMP-9 aprobada; plan, research, model, contract y quickstart preceden tasks/codigo | PASS |
| Secret Information Stays Private | Handoff y `AppliedResultRecord` internos; puerto devuelve solo `PublicGameScoreboard` | PASS |
| Offline-First and Recoverable | Ledger, revision y recovery reference se confirman atomicamente en IndexedDB | PASS |
| Tested, Deterministic Game Rules | Tabla, movimientos, ranking y siguiente accion son funciones puras table-driven | PASS |
| Mobile Simplicity and Accessibility | Scoreboard/ranking compartidos, empates explicitos y una accion primaria por estado | PASS |
| Client-only PWA | Sin red, cuentas, nube ni motor remoto | PASS |
| Minimal dependencies | Solo React/Dexie y toolchain existentes | PASS |

No se requieren excepciones constitucionales. La tabla nueva evita obligar a IMP-5..IMP-8 a copiar
el ledger a cada payload secreto y mantiene una unica fuente durable entre fases.

## Project Structure

### Documentation (this feature)

```text
specs/009-scoring-multiround/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── spec.md
├── checklists/
│   └── requirements.md
└── contracts/
    └── scoring-multiround.md
```

### Source Code (repository root)

```text
src/
  domain/
    entities/scoringMultiround.ts
    entities/scoringMultiround.test.ts
    ports/scoringMultiround.ts
  features/scoring-multiround/
    components/ScoringMultiroundScreen.tsx
    components/ScoringMultiroundScreen.test.tsx
    hooks/useScoringMultiround.ts
    services/scoringMultiroundService.ts
    services/scoringMultiroundService.test.ts
    services/roundPreparationCoordinator.ts
    services/roundPreparationCoordinator.test.ts
  infrastructure/persistence/
    scoringMultiroundRepository.ts
    migrations.ts
  app/App.tsx
  features/platform/services/recoveryRuntime.ts
  i18n/es.ts
  styles/global.css

tests/
  integration/scoringMultiroundRepository.spec.ts
  e2e/scoring-multiround.spec.ts
  accessibility/scoring-multiround.spec.ts
```

**Structure Decision**: seguir los vertical slices existentes. Dominio calcula y valida; el puerto
solo expone proyecciones publicas; el repositorio posee el handoff secreto y la transaccion Dexie; el
coordinador de feature compone contratos existentes sin importar tablas.

## Design Decisions

### Ledger durable separado del recovery de fase

- `game-scoreboards` usa `gameId` como clave y conserva `InternalGameScoreboard`, incluidos resultados
  aplicados necesarios para idempotencia.
- `recoverySnapshots` fase `scoreboard-active` guarda `ScoringRecoveryReference`, nunca roles. La
  transaccion actualiza tabla, referencia, revision global y metadata conjuntamente.
- Al preparar la siguiente ronda, el recovery cambia a la fase de IMP-5, pero el ledger permanece en
  su tabla. La proxima resolucion lo carga por `gameId`.

### Handoff interno, proyeccion publica

- El guard valida allowlist exacto y relaciones entre roster, roles, eliminados, activos e intentos.
- `AppliedResultRecord` conserva el handoff canonico para detectar reutilizacion divergente de
  `resultId`; nunca sale del repositorio.
- El coordinador IMP-8->9 entrega tambien `RoundPreparationSource` derivado del envelope secreto; se
  valida y guarda internamente para que la siguiente ronda no dependa de props/callbacks publicos.
- `PublicGameScoreboard` contiene solo nombres ya publicos, totales, posiciones, ronda, estado y
  siguiente accion. No contiene roles, eliminados, intentos ni conceptos.

### Scoring y ranking puros

- Un ciudadano recibe +1 en victoria ciudadana; cada impostor original +2 en victoria impostora; un
  autor impostor recibe +1 por intento correcto.
- Cada movimiento tiene motivo y `resultId`. Los totales se derivan del ledger y se validan contra el
  cache persistido.
- Ranking: total descendente, roster como orden visual; posicion de competicion `1,1,3`; todos los
  maximos de la ronda final son ganadores.

### Idempotencia y recovery

- Mismo `resultId` y handoff canonico devuelve el snapshot existente sin escritura/revision/callback.
- Mismo ID con contenido distinto es `result-conflict`. Revision stale recarga sin replay.
- Datos futuros/parciales conservan tabla y recovery y activan safe read-only.

### Coordinador IMP-4 -> IMP-5

- `RoundPreparationCoordinator` recibe `NextRoundRequest` y ejecuta `prepareNextFromScoreboard`
  directamente desde recovery `scoreboard-active`; no reutiliza el prepare que exige content-selected.
- Una sola transaccion cubre `game-scoreboards`, `used-concepts`, `role-assignment-history`,
  `recoverySnapshots` y `metadata`; dentro de ella draw precede a roles. No existe staging intermedio
  ni llamada aparte a `ConceptDrawRepository.drawAndMarkUsed`.
- Error de contenido, roles, writer o storage conserva `game-scoreboards`; UI permanece en marcador
  con retry consciente. Exito navega a lista compartida IMP-5.

### Revancha y nueva partida

- Revancha crea nuevo `gameId` y un `RematchSeed` publico sin ledger, secretos ni historiales. IMP-10
  consume y enruta sus drafts editables de IMP-2/3/4, sin recrearlos. Ruta:
  jugadores editables -> configuracion editable -> contenido editable -> reparto IMP-5.
- Siguiente ronda conserva `gameId`, ledger, pool e historiales. Nueva partida conserva solo datos
  reutilizables propiedad de IMP-2/4/10.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Tabla aditiva `game-scoreboards` junto a recovery reference | El ledger debe sobrevivir los payloads mutuamente exclusivos de IMP-5..IMP-8 sin exponer roles | Copiar el ledger en cada envelope acopla cuatro epicas; usar solo recovery lo pierde al preparar la ronda siguiente |
| Resultado canonico interno ademas de movimientos publicables | Detecta `resultId` reutilizado con contenido divergente de forma determinista | Guardar solo el ID aceptaria silenciosamente un resultado distinto; exponer el handoff violaria privacidad |
