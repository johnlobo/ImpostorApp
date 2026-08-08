# Implementation Plan: Desarrollo de rondas, pistas y temporizador

**Branch**: `006-round-clues-timer` | **Date**: 2026-08-08 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification for Jira epic `IMP-6`.

## Summary

Convertir el `RoundHandoff` publico de IMP-5 en una sesion durable de pistas que consume el roster,
`turnOrder` y `conversation` del `PreparedGame` ya confirmado. Cada fase persiste una identidad
estable, elegibles, orden publico, progreso secuencial de pistas y reloj antes de habilitar comandos. El orden random es una
permutacion Fisher-Yates creada una sola vez con RNG inyectable. El temporizador usa un deadline
durable y un limite de restante confirmado. Background y reapertura descuentan tiempo; un salto del
reloj hacia atras nunca supera `maximumRemainingSeconds`, aunque puede recuperar tiempo observado
dentro de ese limite.

El registro unico de recuperacion cambia de `round-prepared` a `clues-active` con un payload interno
compuesto: conserva el `SecretRoundSnapshot` de IMP-5 para epicas posteriores, la fase actual y los
handoffs minimos de fases cerradas. Infraestructura valida y actualiza ese payload, pero el puerto de feature
solo devuelve `PublicRoundSession`; ni servicio, hook, componente ni modo observador reciben roles,
concepto o companeros. El cierre manual confirmado es una escritura optimista e idempotente que
produce `CluePhaseHandoff` para IMP-7 solamente despues de ser durable.

## Technical Context

**Language/Version**: TypeScript 5.9 estricto, React 19.2, Node.js 24

**Primary Dependencies**: React, Dexie y dependencias existentes; no se anaden paquetes

**Storage**: `recoverySnapshots` y `metadata` existentes; no se anade tabla ni migracion. El payload
`clues-active` conserva el snapshot secreto, la fase actual y handoffs cerrados minimos

**Testing**: Vitest, Testing Library, fake-indexeddb, Playwright, axe-core y fake timers de Vitest

**Target Platform**: PWA cliente para iPhone y Android, vertical, compartida y offline

**Performance Goals**: Comandos visibles en menos de 100 ms tras su confirmacion local; tick visual
sin escrituras periodicas; recalculo de reloj O(1); bundle total bajo 180 KiB gzip

**Constraints**: RNG, reloj y scheduler inyectables; revision optimista y writer lease; ninguna
proyeccion publica contiene secretos; el observer no recibe comandos; expiracion sin navegacion
automatica; sin reset del reloj ni saltos arbitrarios de turno; tolerancia visual de un segundo

**Scale/Scope**: 3 a 20 jugadores, 1 a 10 rondas y una cantidad de fases acotada por los elegibles y
resultados de IMP-7/IMP-8; solo se retienen handoffs minimos, con duraciones de 30 a 600 segundos

## Constitution Check

| Principle / Constraint | Design evidence | Result |
|---|---|---|
| Specification and Traceability First | Spec IMP-6 aprobada y artefactos plan/research/model/contract/quickstart previos a tasks y codigo | PASS |
| Secret Information Stays Private | Puerto y estado de feature usan `PublicRoundSession`; el payload compuesto secreto queda confinado al repositorio | PASS |
| Offline-First and Recoverable | Orden, reloj, fases y cierre viven en el snapshot unico con revision optimista; deadline permite recuperar sin ticks | PASS |
| Tested, Deterministic Game Rules | Fisher-Yates, transiciones y reloj son funciones puras con RNG y reloj inyectados | PASS |
| Mobile Simplicity and Accessibility | Una accion primaria por estado, confirmacion de cierre, foco visible y anuncios de tiempo no agresivos | PASS |
| Client-only PWA | Sin backend, cuentas, telemetria ni red nueva | PASS |
| Minimal dependencies | Cero dependencias nuevas; APIs de tiempo y scheduling del navegador quedan detras de inyecciones | PASS |

No se requieren excepciones constitucionales. El payload compuesto se documenta en Complexity
Tracking porque es la minima forma de conservar los secretos que necesitaran IMP-7/IMP-8 sin
exponerlos a la feature compartida.

## Project Structure

### Documentation (this feature)

```text
specs/006-round-clues-timer/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── spec.md
├── checklists/
│   └── requirements.md
└── contracts/
    └── round-session.md
```

### Source Code (repository root)

```text
src/
  domain/
    entities/roundSession.ts
    entities/roundSession.test.ts
    ports/roundSession.ts
  features/round-session/
    components/RoundSessionScreen.tsx
    components/RoundSessionScreen.test.tsx
    hooks/useRoundSession.ts
    services/roundSessionService.ts
    services/roundSessionService.test.ts
  infrastructure/persistence/
    roundSessionRepository.ts
  app/App.tsx
  features/platform/services/recoveryRuntime.ts
  i18n/es.ts
  styles/global.css

tests/
  integration/roundSessionRepository.spec.ts
  e2e/round-session.spec.ts
  accessibility/round-session.spec.ts
```

**Structure Decision**: Mantener entidades y transiciones puras en `domain`, un puerto que solo
expone estado publico, una maquina de estados observable en `features/round-session` y un repositorio
Dexie especializado. Replica la separacion IMP-5 sin permitir que `SecretRoundSnapshot` cruce hacia
el servicio compartido.

## Design Decisions

### RoundHandoff is a reference, not the prepared session

- `RoundHandoff` conserva su contrato IMP-5: `gameId`, `roundNumber`, `preparedAt`.
- El repositorio valida que exista un `round-prepared` N/N para esa misma identidad y deriva el
  `PreparedRound` publico desde `SecretRoundSnapshot.content.game`.
- No se amplia el callback con roster o reglas porque duplicaria la fuente durable y facilitaria
  pasar accidentalmente el snapshot secreto a React.

### Full Fisher-Yates is confirmed once per phase

- `roster` filtra el orden original por los IDs elegibles; `random` aplica Fisher-Yates completo;
  `free` no crea secuencia ni primer jugador.
- RNG solo se consume al crear una fase. Repetir start o recuperar devuelve el orden persistido.
- La primera fase usa el roster completo de `PreparedGame`. Cada fase sucesiva recibe un
  `NextCluePhaseRequest` de IMP-8 despues de resolver IMP-7 y descartar victoria; IMP-6 valida pero
  no infiere eliminaciones.

### Durable deadlines, no tick persistence

- La preparacion crea una fase `ready`. Solo el commit explicito de Comenzar pistas cambia a active
  y, para conversacion temporizada, guarda `deadlineAt`, `confirmedAt` y
  `maximumRemainingSeconds`.
- La proyeccion calcula `min(maximumRemainingSeconds, ceil((deadline-now)/1000))`, limitada a
  `[0, durationSeconds]`. Un salto hacia atras no supera el maximo durable y uno hacia delante puede
  expirar la fase. Un reloj no finito produce `invalid-clock`.
- Pausa, reanudacion y cierre son escrituras; repetir pausa sobre paused o resume sobre running es
  no-op sin revision. Los ticks solo actualizan la proyeccion local. Al llegar a cero se deriva
  `expired` sin navegar. Cada mutacion normaliza primero el reloj efectivo; un expired no puede
  pausarse ni reanudarse para recuperar tiempo. No existe comando de reset.

### Clue progress is durable and sequential

- En `roster` y `random`, ready ya contiene `stage: clues` con indice cero y prefijo completado vacio.
- `advanceClueTurn` recibe el indice observado como token idempotente, nunca como destino seleccionable:
  completa el turno actual y avanza. El ultimo avance entra en `stage: discussion` con indice nulo.
- Repetir el mismo token confirmado es no-op. En `free`, ready ya esta en discussion y
  `currentTurnIndex`/`completedCluePlayerIds` permanecen neutrales.
- La lista visual es informativa; una unica CTA expresa el siguiente comando valido.

### One recovery envelope preserves secret and public state

- `clues-active` reemplaza `round-prepared` en `recoverySnapshots` y guarda internamente
  `ActiveRoundRecovery { secretRound, resolutionLedger, activePhase, closedPhaseHandoffs }`.
- Al preparar la siguiente fase, el snapshot temporal anterior se sustituye por su handoff minimo;
  esos handoffs se conservan hasta que IMP-8 confirme el cierre de la ronda.
- `closedPhaseHandoffs` es contiguo, ascendente y sin duplicados. Contiene exactamente fases anteriores
  si la activa esta ready/active, o incluye tambien la activa cuando esta closed.
- El repositorio proyecta `PublicRoundSession` antes de retornar. Los errores contienen solo codigos
  de plataforma y el modo observador recibe exactamente la misma proyeccion sin comandos.
- Conflictos stale recargan el ultimo snapshot sin replay. La auditoria de privacidad inspecciona
  URL, navigation state, `PublicPlatformError`, consola y payload publico; no existe telemetria.
- La fase inicial usa ledger null. En ciclos successive, IMP-6 valida solo cabecera versionada e
  identidad y preserva opacamente el ledger propiedad de IMP-8 para que IMP-7 haga lo mismo.

### Closing is durable before handoff

- Solicitar cierre solo abre confirmacion en memoria. Confirmar guarda `closed` y su motivo en la
  misma transaccion que incrementa revision y metadata.
- Si el reloj efectivo esta expirado, el motivo es `timer-expired`; en cualquier otro estado es
  `manual`.
- Una fase ya cerrada devuelve el mismo `CluePhaseHandoff` sin escribir; conflictos recargan el
  snapshot y nunca repiten automaticamente la intencion obsoleta.

### Screen integration follows the approved inventory

- Los estados compartidos son ready, clues, discussion, paused, expired, close confirmation,
  error-retry, observer y closed; header, cuerpo y footer mantienen una unica accion primaria.
- El acceso a Game Menu existe solo como slot en superficies compartidas. IMP-10 posee pausa global,
  continuidad, render del control y abandono; IMP-6 no los duplica y nunca muestra el menu en una
  superficie privada.
- Un adaptador public-only de IMP-6 ofrece summary, safe route y `pauseForHome`: running se confirma
  paused, paused es no-op, expired se conserva, observer queda bloqueado y stale recarga sin replay.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| Payload de recovery interno compuesto con `SecretRoundSnapshot`, fase activa y handoffs minimos | IMP-7/IMP-8 necesitaran roles y concepto durables, mientras IMP-6 debe recuperar la fase actual y continuidad sin exponer esos campos | Reemplazar el secreto por un `PreparedRound` publico perderia la fuente de verdad; conservar snapshots completos aumentaria retencion; una segunda tabla crearia dos commits y recuperacion parcial |
| Reloj running guarda deadline y limite confirmado | El reloj del dispositivo puede retroceder y la app puede cerrarse; ambos datos permiten descontar background sin regalar tiempo | Guardar solo ticks o solo deadline reinicia tras suspension o puede aumentar el restante al atrasar el reloj |
