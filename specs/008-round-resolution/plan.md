# Implementation Plan: Resolucion de rondas y condiciones de victoria

**Branch**: `008-round-resolution` | **Date**: 2026-08-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification for Jira epic `IMP-8`.

## Summary

Consumir exactamente un `VoteResolutionHandoff` durable de IMP-7, validarlo contra
`PreparedGame`, `SecretRoundSnapshot` y el progreso acumulado de la ronda, y aplicar la matriz
`single/successive` sin recontar votos. Un empate persistente cierra con victoria impostora.
`single` aplica todos los eliminados simultaneos y cierra la ronda. `successive` aplica uno,
evalua cero impostores, paridad o continuidad, y solo en el ultimo caso emite un
`NextCluePhaseRequest` exacto hacia IMP-6.

Cada impostor descubierto recibe como maximo un intento privado si `finalAttempt` esta activo.
Texto y concepto permanecen confinados al repositorio; la comparacion normalizada persiste antes de
avanzar. Al salir de la fase se elimina el texto y solo se conserva
`correct | incorrect | declined`. Una resolucion terminal revela publicamente concepto y roles,
pero el `RoundResolutionHandoff` hacia IMP-9 usa allowlist: identidad, roles originales, ganador,
motivo, eliminados/activos y outcomes de intentos, nunca concepto, categoria, texto ni votos.

La persistencia usa el unico `RecoverySnapshot active-game`. La fase `resolution-active` contiene
el secreto, handoffs publicos previos y un `ResolutionLedger` acumulativo. IMP-6 e IMP-7 conservan
ese ledger opacamente durante ciclos sucesivos. Solo repositorios de IMP-8 pueden interpretarlo.
Revision optimista, writer lease, serializacion local e idempotencia protegen intentos, decision y
salidas.

## Technical Context

**Language/Version**: TypeScript 5.9 estricto, React 19.2, Node.js 24

**Primary Dependencies**: React, Dexie y dependencias existentes; no se anaden paquetes

**Storage**: `recoverySnapshots` y `metadata`; sin tabla ni migracion. Se introducen envelopes
versionados `resolution-active` y un ledger opaco preservado por IMP-6/7

**Testing**: Vitest, Testing Library, fake-indexeddb, Playwright y axe-core

**Target Platform**: PWA movil, vertical, pass-the-device, compartida y offline

**Performance Goals**: Evaluacion O(N), N <= 20; confirmacion local visible en menos de 100 ms;
cero escrituras periodicas; bundle total bajo 180 KiB gzip

**Constraints**: Reloj y fabrica de IDs inyectables; input IMP-7 exacto; output por allowlist;
respuestas confinadas; cero reevaluacion en recovery; writer/observer; sin telemetria

**Scale/Scope**: 1 a 3 impostores, hasta 20 jugadores, multiples fases sucesivas pero una unica
resolucion terminal por ronda y un intento por impostor descubierto

## Constitution Check

| Principle / Constraint | Design evidence | Result |
|---|---|---|
| Specification and Traceability First | Contratos IMP-7 -> IMP-8 -> IMP-6/9 concretos antes de tasks/codigo | PASS |
| Secret Information Stays Private | Texto solo en envelope privado; handoffs y observer usan allowlists sin texto/concepto | PASS |
| Offline-First and Recoverable | Ledger, intentos, decision y salidas durables en active-game con revision | PASS |
| Tested, Deterministic Game Rules | Matriz, normalizacion y derivacion de activos son funciones puras | PASS |
| Mobile Simplicity and Accessibility | Cortinilla por intento, estado publico separado y CTA unica | PASS |
| Client-only PWA | Sin backend, cuentas, red ni telemetria | PASS |
| Minimal dependencies | Cero dependencias nuevas | PASS |

No se requieren excepciones. El ledger opaco entre features se registra en Complexity Tracking:
evita perder resultados de intentos de fases anteriores sin exponerlos a IMP-6/7.

## Project Structure

### Documentation

```text
specs/008-round-resolution/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── spec.md
├── checklists/
│   └── requirements.md
└── contracts/
    └── round-resolution.md
```

### Source Code

```text
src/
  domain/
    entities/roundResolution.ts
    entities/roundResolution.test.ts
    ports/roundResolution.ts
  features/round-resolution/
    components/RoundResolutionScreen.tsx
    components/RoundResolutionScreen.test.tsx
    components/PrivateFinalAttempt.tsx
    components/PrivateFinalAttempt.test.tsx
    hooks/useRoundResolution.ts
    services/roundResolutionService.ts
    services/roundResolutionService.test.ts
  infrastructure/persistence/
    roundResolutionRepository.ts
  features/platform/services/recoveryRuntime.ts
  app/App.tsx
  i18n/es.ts
  styles/global.css

tests/
  integration/roundResolutionRepository.spec.ts
  e2e/round-resolution.spec.ts
  accessibility/round-resolution.spec.ts
```

**Structure Decision**: Mantener dominio puro, puerto de feature, servicio observable, hook fino,
componentes shared/private separados y repositorio Dexie especializado. Solo el repositorio carga
`SecretRoundSnapshot`, texto de intentos y envelopes internos.

## Design Decisions

### Consume the exact IMP-7 contract

- Se acepta solo `VoteResolutionHandoff` schema 1 con `resultId`, identidad, participantes,
  outcome, eliminados, reason y confirmedAt.
- `persistent-tie` exige `second-tie` y cero eliminados. `eliminated` exige reason no-tie,
  1..K IDs para `single` y uno para `successive`.
- ParticipantIds debe coincidir con los elegibles actuales del ledger en orden canonico.
- El resultId consumido queda registrado; repetirlo con mismo contenido es no-op y con contenido
  distinto es incompatible.

### Resolution matrix is pure and ordered

- Primero se valida el handoff y se aplica su conjunto eliminado de forma atomica.
- Persistent tie tiene precedencia y produce `impostors/persistent-tie`.
- Single: cero impostores activos produce `citizens/all-impostors-found`; cualquiera activo,
  `impostors/impostors-escaped`.
- Successive: `I=0` gana ciudadanos; despues `I>=C` gana impostores por parity; solo
  `I>0 && I<C` continua.
- El ultimo intento nunca modifica esta decision, aunque debe completarse antes de emitir la salida.

### Final attempts are private and individually durable

- Se crea una cola en orden roster solo con impostores del conjunto eliminado y solo si
  `finalAttempt=true`.
- Covered y entry son estado de vista; confirm guess/decline es el commit.
- Guess valida texto no vacio y compara NFKC + trim + espacios colapsados + lowercase `es`.
- Mientras la resolucion esta abierta, `PrivateFinalAttempt` puede contener texto solo dentro del
  envelope y del repositorio. Servicio, hook, props compartidas, errores y observer nunca lo reciben.
- Al confirmar continuidad o terminal, el repositorio redacciona respuestas y conserva solo outcome.
- Una reapertura siempre empieza en private-handoff cubierto para el primer pendiente.

### ResolutionLedger survives successive cycles

- Ledger acumula `consumedVoteResultIds`, eliminados canonicos y outcomes redacted de intentos.
- Tras continuidad se persiste un `NextCluePhaseRequest` dentro de `resolution-active`.
- IMP-6 consume esa misma solicitud y transforma a `clues-active`; IMP-6 e IMP-7 deben copiar el
  ledger opacamente sin proyectarlo ni interpretarlo.
- Al volver desde IMP-7, IMP-8 valida que participantes sean exactamente los activos del ledger.
- Esto requiere ampliar los envelopes internos de IMP-6/7, no sus puertos publicos.

### NextCluePhaseRequest reuses IMP-6 exactly

- Incluye gameId, roundNumber, `phaseNumber = current + 1`, IDs activos canonicos e issuedAt.
- Solo se crea tras completar/redactar intentos y confirmar que `I>0 && I<C`.
- Una solicitud persistida se devuelve sin nueva revision. Un terminal nunca la emite.
- IMP-8 no decide orden, progreso de pistas, timer ni votacion siguiente.

### Terminal reveal and strict IMP-9 allowlist

- Tras intentos, terminal commit fija `resultId`, winner, reason y resolvedAt, redacciona texto
  y persiste `RoundResolutionHandoff`.
- La pantalla compartida puede leer concepto y roles mediante una proyeccion terminal autorizada.
- El handoff a IMP-9 no incluye concepto/categoria porque scoring no los necesita.
- `attemptOutcomes` solo contiene playerId y `correct | incorrect | declined`, sin timestamp ni
  texto.
- No incluye continuidad de partida: IMP-9 compara roundNumber con rounds configuradas.

### Recovery and observer

- Load valida envelope, ledger, input consumido, intentos, decision y salida sin volver a comparar.
- Pending private siempre recupera a la cortinilla compartida, nunca al input con texto.
- Observer obtiene `PublicResolutionSession` y ninguna funcion privada/mutable.
- Conflicto recarga sin replay. Fallo mantiene ultimo snapshot y no emite request/handoff.
- Safe mode preserva datos y solo emite `PublicPlatformError`.

### Screen integration

- Shared: loading, resolving, private-handoff, continuation-ready, terminal-reveal, writing,
  storage-error, conflict-reload, observer y safe-mode.
- Private: covered, entry, saving, completed/concealing.
- Concepto/roles solo aparecen en terminal-reveal durable.
- Game Menu pertenece a IMP-10 y no aparece en el flujo privado.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Ledger opaco atraviesa envelopes internos de IMP-6/7 | Intentos y eliminados acumulados deben sobrevivir ciclos successive hasta el resultado final | Recalcular desde pantallas/votos reabre secretos y rompe idempotencia |
| Texto de guess se guarda temporalmente dentro del envelope secreto | Spec exige respuesta y acierto durables antes de avanzar | Guardar solo en memoria pierde el intento en un cierre; exponerlo al servicio viola privacidad |
