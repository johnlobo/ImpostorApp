# Implementation Plan: Configuracion de partida

**Branch**: `003-game-configuration` | **Date**: 2026-08-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification for Jira epic `IMP-3`.

## Summary

Implementar una configuracion de partida que recibe una `PreparedRoster` valida de IMP-2, ofrece
valores iniciales rapidos y reglas avanzadas tipadas, presenta una revision completa y confirma un
`PreparedGame` versionado. El dominio sera puro y determinista; el servicio conservara el borrador
ante fallos; la persistencia reutilizara `RecoverySnapshot` sin tablas ni migraciones nuevas.

## Technical Context

**Language/Version**: TypeScript 5.9 estricto, React 19.2, Node.js 24

**Primary Dependencies**: React, Dexie y dependencias existentes; no se anaden paquetes

**Storage**: `RecoverySnapshot` existente mediante `PersistenceGateway`

**Testing**: Vitest, Testing Library, fake-indexeddb, Playwright y axe-core

**Target Platform**: PWA cliente para iPhone y Android, vertical y offline

**Performance Goals**: Cambios visuales en menos de 100 ms; confirmacion local sin bloqueo
perceptible; bundle total bajo el presupuesto vigente de 180 KiB gzip

**Constraints**: roster de 3 a 20; 1-10 rondas; impostores derivados del roster; temporizador
30-600 por pasos de 30; datos locales; escritor unico; sin nombres ni payloads en URL o logs

**Scale/Scope**: Una configuracion activa y un snapshot confirmado recuperable

## Constitution Check

| Principle / Constraint | Design evidence | Result |
|---|---|---|
| Specification and Traceability First | IMP-3, spec, plan, tasks y tickets hijos | PASS |
| Secret Information Stays Private | Snapshot opaco; sin nombres ni payload en URL, logs o errores | PASS |
| Offline-First and Recoverable | RecoverySnapshot atomico y borrador preservado ante fallos | PASS |
| Tested, Deterministic Game Rules | Dominio puro, limites y dependencias inyectadas | PASS |
| Mobile Simplicity and Accessibility | Defaults rapidos, controles semanticos, revision y axe | PASS |
| Client-only PWA | Sin backend ni solicitudes remotas | PASS |
| Minimal dependencies | Cero dependencias nuevas | PASS |

No se requieren excepciones constitucionales.

## Project Structure

```text
src/
  domain/
    entities/gameConfiguration.ts
    ports/gameConfiguration.ts
  features/game-configuration/
    components/GameConfigurationScreen.tsx
    hooks/useGameConfiguration.ts
    services/gameConfigurationService.ts
  infrastructure/persistence/
    gameConfigurationRepository.ts
  app/
    App.tsx
    navigation.ts
  i18n/es.ts
  styles/global.css

tests/
  integration/gameConfigurationRepository.spec.ts
  e2e/game-configuration.spec.ts
  accessibility/game-configuration.spec.ts
```

## Design Decisions

### Domain and handoff

- `PreparedRoster` is copied into a `GameConfigurationDraft`; IMP-3 exposes no player mutations.
- Defaults are 3 rounds, 1 impostor, free conversation, roster order and verbal voting.
- Final attempt defaults off and means one final accusation by the eliminated player.
- Multi-impostor defaults are random allocation, unknown identities and single elimination.
- `PreparedGame` version 1 copies roster and confirmed rules and excludes categories, concepts and
  role assignments owned by later epics.

### Rules

- Rounds accept integers from 1 to 10.
- Impostors accept 1 to `min(3, floor(playerCount / 3))`.
- Timed conversation accepts 30 to 600 seconds divisible by 30; 60, 90 and 120 are presets.
- Turn order uses roster, random or free; voting uses verbal or secret.
- Invalid commands preserve the previous draft and return public typed issues.

### Persistence and recovery

- A typed repository maps `PreparedGame` to the existing `RecoverySnapshot` payload.
- Only confirmation persists; intermediate field changes remain in memory.
- Writes reuse optimistic revision checks and writer-lease enforcement.
- Parsing rejects malformed and future records without replacing active state.
- No new store or schema migration is required.

### Application and UI

- IMP-2 calls a typed `onPrepared` handoff; no roster data enters URLs or browser history.
- The configuration service exposes immutable state, commands, review and retryable confirmation.
- Controls use steppers or numeric inputs for bounded values, segmented controls for modes and
  toggles for binary options.
- Review displays every effective rule before confirmation. Observer mode can review but not write.

### Validation

- Table-driven domain tests cover every boundary, default and roster-derived impostor maximum.
- Repository tests cover round-trip, revisions, malformed payloads, writer loss and prior-state
  preservation.
- Component tests cover controls, errors, review, pending state, retry and observer behavior.
- Playwright covers players-to-confirmation, offline restoration, back navigation and mobile
  overflow; axe covers default, timed, invalid, review and error states.

## Complexity Tracking

No constitutional violations, new persistence tables or runtime dependencies are introduced.
