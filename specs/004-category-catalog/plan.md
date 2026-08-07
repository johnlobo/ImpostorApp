# Implementation Plan: Catalogo de categorias y conceptos

**Branch**: `004-category-catalog` | **Date**: 2026-08-07 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification for Jira epic `IMP-4`.

## Summary

Implementar un catalogo español integrado y personalizable que consume `PreparedGame`, filtra el
contenido adulto local, confirma una seleccion recuperable y obtiene conceptos sin repetir dentro
de la partida. El sorteo sera atomico: el ID se persiste antes de exponer el texto. El agotamiento
bloqueara nuevos sorteos hasta un reinicio manual confirmado.

## Technical Context

**Language/Version**: TypeScript 5.9 estricto, React 19.2, Node.js 24

**Primary Dependencies**: React, Dexie y dependencias existentes; no se anaden paquetes

**Storage**: `custom-categories`, `used-concepts`, `preferences` y `RecoverySnapshot` existentes

**Testing**: Vitest, Testing Library, fake-indexeddb, Playwright y axe-core

**Target Platform**: PWA cliente para iPhone y Android, vertical y offline

**Performance Goals**: Filtrado y seleccion visual bajo 100 ms; sorteo local durable sin bloqueo
perceptible; bundle total bajo el presupuesto vigente de 180 KiB gzip

**Constraints**: Al menos 10 conceptos por categoria integrada; historial por `PreparedGame.id`;
adulto apagado por defecto; sin texto secreto en URL, logs o errores; escritor unico

**Scale/Scope**: 15 categorias integradas, categorias personalizadas locales y un historial por
partida

## Constitution Check

| Principle / Constraint | Design evidence | Result |
|---|---|---|
| Specification and Traceability First | IMP-4, spec, plan, tasks y tickets hijos | PASS |
| Secret Information Stays Private | IDs opacos persistidos; texto solo tras sorteo durable | PASS |
| Offline-First and Recoverable | Catalogos empaquetados y colecciones/snapshot locales | PASS |
| Tested, Deterministic Game Rules | Aleatoriedad inyectada y agotamiento explicito | PASS |
| Mobile Simplicity and Accessibility | Seleccion semantica, editor y confirmaciones accesibles | PASS |
| Client-only PWA | Sin backend, cuentas ni carga remota | PASS |
| Minimal dependencies | Cero dependencias nuevas | PASS |

No se requieren excepciones constitucionales.

## Project Structure

```text
src/
  domain/
    entities/contentCatalog.ts
    ports/contentCatalog.ts
  features/content-catalog/
    components/ContentCatalogScreen.tsx
    components/CustomCategoryEditor.tsx
    data/esCatalog.ts
    data/esAdultCatalog.ts
    hooks/useContentCatalog.ts
    services/contentCatalogService.ts
  infrastructure/persistence/
    customCategoriesRepository.ts
    conceptDrawRepository.ts
    contentPreferencesRepository.ts
    contentSelectionRepository.ts
  app/App.tsx
  i18n/es.ts
  styles/global.css

tests/
  integration/contentCatalogRepositories.spec.ts
  e2e/content-catalog.spec.ts
  accessibility/content-catalog.spec.ts
```

## Design Decisions

### Packaged catalog and identity

- General and adult Spanish catalogs live in separate local modules and ship in the offline bundle.
- Every built-in category has at least 10 concepts and stable category/concept IDs.
- Built-in data is immutable; custom records use defensive parsing and stable generated IDs.
- Display text is never a persistence key, history value or error detail.

### Selection and adult filtering

- Selection modes are explicit IDs, all eligible categories or random category per round.
- Random-category mode chooses uniformly among categories with unused eligible content each draw.
- Adult filtering occurs in domain for every mode and defaults to disabled when preference is absent.
- Changing selection never erases history already accumulated by the same game.

### History and draw transaction

- History scope is exactly `PreparedGame.id` and stores opaque used concept IDs.
- Draw requests are serialized and run read-select-write atomically under the writer lease.
- The concept text is returned only after its ID is durable.
- Exhaustion is a stable blocked state; only an explicit confirmed reset makes concepts available.

### Recovery

- Confirmation writes a versioned `PreparedContentSelection` as phase `content-selected`.
- The snapshot contains `PreparedGame` and effective selection, never a drawn concept.
- Existing expected-revision semantics prevent stale confirmation.
- No table or migration is added.

### Application and UI

- IMP-3 hands off `PreparedGame` without storing it in URL or navigation reducer.
- Checkboxes select concrete categories; a segmented control selects selected/all/random modes; a
  toggle controls adult eligibility.
- Only custom categories show edit and delete actions. Deletion and history reset require explicit
  confirmation.
- Observer mode can browse and review but cannot mutate, confirm, draw or reset.

### Validation

- Domain tests cover catalog integrity, filtering, selection modes, stable scopes and exhaustion.
- Repository tests cover custom CRUD, preference default, atomic draw/reset, malformed data, quota
  and writer loss.
- Component tests cover selection, editor preservation, adult toggle, confirmations and blocked
  states.
- Playwright covers the full offline handoff, persistence, no-repeat exhaustion and reset; axe and
  mobile overflow cover supported views.

## Complexity Tracking

The atomic draw may require a narrowly scoped transactional persistence adapter because the generic
single-record collection API does not express read-select-write. It still uses existing tables and
writer coordination and introduces no dependency or migration.
