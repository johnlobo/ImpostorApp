# Implementation Plan: Votacion, empates y eliminacion

**Branch**: `007-voting-elimination` | **Date**: 2026-08-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification for Jira epic `IMP-7`.

## Summary

Convertir cada `CluePhaseHandoff` durable de IMP-6 en una votacion verbal o secreta recuperable.
La votacion verbal confirma entre uno y `impostorCount` sospechosos en `single`, o uno en
`successive`. La secreta persiste una papeleta privada por participante: una seleccion en
`successive` o entre una y `impostorCount` aprobaciones distintas en `single`. El recuento
ordena aprobaciones y llena hasta `impostorCount` puestos positivos. Un empate que cruza el corte
crea un unico desempate; si persiste, descarta todo candidato provisional y confirma
`persistent-tie` con cero eliminados.

El registro `active-game` cambia de `clues-active` a `voting-active` mediante una transaccion
sobre `recoverySnapshots` y `metadata`. Su envelope interno conserva el snapshot secreto de
IMP-5, los handoffs de pistas y las papeletas privadas, pero el puerto de feature solo entrega una
proyeccion publica. Cada voto, recuento y resultado usa revision optimista, writer lease,
serializacion local e idempotencia. Solo un resultado durable emite el `VoteResolutionHandoff`
canonico hacia IMP-8.

## Technical Context

**Language/Version**: TypeScript 5.9 estricto, React 19.2, Node.js 24

**Primary Dependencies**: React, Dexie y dependencias existentes; no se anaden paquetes

**Storage**: `recoverySnapshots` y `metadata` existentes; sin tabla ni migracion nueva. El payload
interno `voting-active` conserva secreto de ronda, historial minimo de pistas y votacion

**Testing**: Vitest, Testing Library, fake-indexeddb, Playwright y axe-core

**Target Platform**: PWA movil, vertical, compartida, pass-the-device y completamente offline

**Performance Goals**: Comandos locales visibles en menos de 100 ms despues de commit; recuento
O(N x K), con N <= 20 y K <= 3; bundle total bajo 180 KiB gzip

**Constraints**: Reloj y fabrica de IDs inyectables; una sola fuente durable; selecciones privadas
fuera de proyecciones publicas; persist-first; no auto-seleccion; maximo un desempate; cero
eliminaciones parciales ante empate persistente; writer/observer; textos externalizados; sin
telemetria

**Scale/Scope**: 3 a 20 participantes por fase, 1 a 3 sospechosos por papeleta, hasta dos papeletas
por votacion y una votacion distinta por cada fase sucesiva

## Constitution Check

| Principle / Constraint | Design evidence | Result |
|---|---|---|
| Specification and Traceability First | Spec reconciliada con IMP-8 y contrato unico documentado antes de tasks/codigo | PASS |
| Secret Information Stays Private | Repositorio contiene votos; servicio, hook, observer y superficies compartidas reciben solo `PublicVotingSession` | PASS |
| Offline-First and Recoverable | Papeletas, progreso, recuento y handoff viven en el envelope `active-game` con revision | PASS |
| Tested, Deterministic Game Rules | Cardinalidad, aprobaciones, corte y desempate son funciones puras | PASS |
| Mobile Simplicity and Accessibility | Lista compartida separada de papeleta privada cubierta; CTA unica y foco controlado | PASS |
| Client-only PWA | Sin backend, cuentas, red ni telemetria | PASS |
| Minimal dependencies | Cero dependencias nuevas | PASS |

No se requieren excepciones constitucionales. El envelope interno compuesto se registra en
Complexity Tracking porque es necesario para conservar el secreto de ronda y votos atomicos sin
permitir que crucen el puerto publico.

## Project Structure

### Documentation

```text
specs/007-voting-elimination/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── spec.md
├── checklists/
│   └── requirements.md
└── contracts/
    └── voting-elimination.md
```

### Source Code

```text
src/
  domain/
    entities/votingElimination.ts
    entities/votingElimination.test.ts
    ports/votingElimination.ts
  features/voting-elimination/
    components/VotingScreen.tsx
    components/VotingScreen.test.tsx
    components/PrivateBallot.tsx
    components/PrivateBallot.test.tsx
    hooks/useVotingElimination.ts
    services/votingEliminationService.ts
    services/votingEliminationService.test.ts
  infrastructure/persistence/
    votingEliminationRepository.ts
  features/platform/services/recoveryRuntime.ts
  app/App.tsx
  i18n/es.ts
  styles/global.css

tests/
  integration/votingEliminationRepository.spec.ts
  e2e/voting-elimination.spec.ts
  accessibility/voting-elimination.spec.ts
```

**Structure Decision**: Repetir la arquitectura vertical vigente: entidades puras y puerto en
`domain`, maquina observable en `features`, hook fino, componentes publicos/privados separados y
repositorio Dexie especializado. El repositorio es la unica capa que puede manejar simultaneamente
`SecretRoundSnapshot`, `SecretVote` y el envelope de recovery.

## Design Decisions

### CluePhaseHandoff is validated against the active recovery envelope

- `prepareVoting` acepta solo el handoff cerrado de la fase activa en `clues-active`.
- Valida identidad, participantes canonicos, regla `voting`, `elimination` e
  `impostorCount` contra el `PreparedGame` interno.
- El handoff no transporta secretos. El repositorio conserva `secretRound` para IMP-8, pero la
  feature de votacion nunca recibe assignments ni concepto.
- Repetir prepare con la misma identidad retorna la votacion existente sin revision.

### Verbal selection is an aggregate decision

- En `successive` y con un impostor se exige exactamente un sospechoso.
- En `single` multi-impostor se admiten entre uno e `impostorCount` IDs distintos.
- La seleccion permanece como draft de UI hasta confirmar. El commit crea resultado y
  `VoteResolutionHandoff` en una sola transaccion; no se fabrican votos.
- No existe empate verbal porque el anfitrion registra la decision ya acordada por el grupo.

### Secret ballots use private approval sets

- Cada votante confirma una sola lista ordenada canonicamente: un candidato en
  `successive`/un impostor; entre uno e `impostorCount` en `single` multi-impostor.
- La lista excluye al propio votante y duplicados. Persistir precede a marcar completed y desmontar
  candidatos/seleccion del DOM.
- La pantalla compartida solo conoce `pending/completed`; no recibe ni recuentos parciales ni el
  objeto de voto.
- Abrir/cerrar cortinilla es estado efimero; confirmar voto es estado durable.

### Approval count, cutoff and tiebreak are pure

- Cada ID incluido suma una aprobacion. Los candidatos con cero se excluyen.
- Los puestos efectivos son `min(maxSlots, positiveCandidateCount)`, donde `maxSlots` es uno en
  `successive` y `impostorCount` en `single`.
- Sin empate que cruce el ultimo puesto, se confirma el prefijo de puestos efectivos.
- Con empate de corte, quienes quedan estrictamente por encima son provisionales. El desempate
  conserva todos los votantes, limita candidatos a los empatados y exige a cada votante
  `min(pendingSlots, candidatesExceptSelf)` selecciones.
- Si el segundo recuento llena los puestos pendientes, se une al conjunto provisional. Si persiste
  el empate de corte, se descarta todo el conjunto provisional y se confirma
  `persistent-tie/second-tie` con cero eliminados.
- El orden entre conteos iguales nunca usa nombre, orden de roster ni azar para romper empates.

### One envelope preserves private state and public recovery

- `voting-active` conserva internamente `secretRound`, `resolutionLedger` opaco,
  `closedPhaseHandoffs` de pistas y `VotingSnapshot`. No se anade tabla porque voto, ledger y revision
  global deben confirmarse juntos.
- El repositorio retorna `PublicVotingSession`, nunca el envelope. Para una papeleta pendiente
  retorna solo `PrivateBallotView` con candidatos publicos; nunca retorna elecciones previas.
- Recovery abre siempre la lista compartida. Una papeleta indicada en navigation state se ignora.
- Observer recibe la misma proyeccion publica sin comandos.
- IMP-8 podra transformar el mismo envelope despues; IMP-7 no elimina `secretRound` ni inspecciona,
  reinicia o muta el ledger acumulativo.

### Durable all-or-nothing handoff

- `VoteResolutionHandoff` tiene version, `resultId` estable, identidad, participantes,
  `outcome`, eliminados, motivo y fecha.
- `eliminated` requiere lista no vacia; `persistent-tie` requiere `second-tie` y lista vacia.
- El resultado se escribe dentro de `VotingSnapshot` antes del callback.
- Repetir confirmacion retorna el mismo handoff sin revision ni segundo callback.
- Un fallo conserva votacion/papeleta anterior. Un conflicto recarga sin replay automatico.

### Screen integration

- Superficies compartidas: loading, verbal draft, secret progress, ready-to-count, counting,
  tiebreak progress, result, retry, conflict reload, observer y safe mode.
- Superficie privada: covered -> selecting -> confirming -> saving -> concealed/completed.
- Game Menu pertenece a IMP-10 y solo aparece en superficies compartidas.
- Un resultado puede mostrar conteos agregados confirmados, pero nunca atribucion individual.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Envelope interno combina secreto de ronda, handoffs de pistas y votos | IMP-8 necesita el secreto original y cada voto debe compartir commit/revision con recovery | Tabla separada de votos crea commits parciales; sustituir el secreto impide resolver roles |
| Desempate conserva provisionalmente candidatos por encima del corte | Single puede llenar varios puestos y solo el ultimo estar empatado | Repetir toda la votacion pierde decisiones claras; desempatar por roster/nombre viola la regla |
