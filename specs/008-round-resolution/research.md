# Research: Resolucion de rondas y condiciones de victoria

## Input contract validation

**Decision**: Consumir `VoteResolutionHandoff` sin adaptadores nominales ni reinterpretacion:
schema/resultId/identity/participants/outcome/eliminated/reason/confirmedAt.

**Rationale**: IMP-7 e IMP-8 ya comparten un contrato reconciliado. Mantener el nombre y campos
exactos hace verificable la frontera y evita que `second-tie` se confunda con una eliminacion vacia.

**Alternatives considered**:
- Aceptar el antiguo `EliminationResult`: descartado; reabre una contradiccion cerrada.
- Recibir activos desde IMP-7: descartado; IMP-8 los deriva de participantes menos eliminados.

## Matrix precedence

**Decision**: Validar, aplicar eliminados y evaluar en orden: persistent tie; I=0; en successive
I>=C; continue successive; escape single.

**Rationale**: Persistent tie es terminal sin eliminados. En successive la paridad se evalua despues
de eliminar. Single siempre cierra y solo distingue todos encontrados o alguno escapado.

**Alternatives considered**:
- Evaluar paridad antes de eliminar: descartado por Jira.
- Continuar single: descartado por configuracion.
- Permitir successive con un impostor: descartado; IMP-3 lo normaliza a single.

## Final attempt effect

**Decision**: El intento produce solo un outcome de puntuacion y nunca cambia winner, reason,
eliminados ni continuidad.

**Rationale**: IMP-9 otorga un punto adicional al impostor que acierta; la victoria ya procede de la
matriz.

## Guess comparison

**Decision**: Comparar concepto y texto mediante NFKC, trim, colapso de espacios y lowercase locale
espanol. Texto vacio es invalido; decline es comando distinto.

**Rationale**: Regla determinista y recuperable sin fuzzy matching ni diccionarios adicionales.

**Alternatives considered**:
- Host marca correcto/incorrecto: descartado por manipulacion y por no usar el concepto durable.
- Fuzzy/acentos ignorados: descartado por resultados ambiguos y nueva dependencia.
- Mostrar concepto al confirmar: descartado porque puede haber fases sucesivas.

## Text confinement and redaction

**Decision**: El repositorio persiste temporalmente el texto dentro de `PrivateFinalAttempt`.
Despues de confirmar salida, lo reemplaza por outcome redacted. Ningun puerto retorna texto
confirmado.

**Rationale**: Cumple persist-first y recovery sin ampliar la superficie de secretos. IMP-9 solo
necesita outcome.

**Alternatives considered**:
- Texto en hook: descartado por cierre/reload.
- Texto en handoff: descartado por minimizacion y privacidad.
- Conservar texto para auditoria: descartado; no aporta valor despues de outcome durable.

## Successive ledger

**Decision**: Mantener `ResolutionLedger` interno y versionado, preservado opacamente por IMP-6/7.

**Rationale**: Una ronda successive puede descubrir varios impostores en fases distintas. El
resultado terminal e IMP-9 necesitan todos los eliminados y bonus sin releer votos antiguos.

**Alternatives considered**:
- Tabla de resolution history: descartada por commits coordinados y dos revisiones.
- Recontar handoffs anteriores: descartado porque IMP-8 no debe recontar ni depender de votos.
- Guardar solo ultimo outcome: descartado porque pierde bonus previos.

## IMP-6 integration

**Decision**: Persistir request en `resolution-active`. `prepareNext` de IMP-6 valida y consume el
mismo request, conserva el ledger opaco y crea la nueva fase `clues-active`.

**Rationale**: IMP-8 confirma la decision antes de navegar; IMP-6 sigue siendo unico propietario de
orden, timer y progreso.

## Terminal handoff allowlist

**Decision**: `RoundResolutionHandoff` contiene schemaVersion, resultId, identidad,
participantIds originales, originalRoles, winner, reason, eliminados acumulados, activos,
attemptOutcomes minimos (playerId+outcome) y resolvedAt.

**Rationale**: Es la informacion minima para puntuar deterministamente y auditar una ronda. Concepto,
categoria, texto de guesses, votos y tallies no son necesarios.

**Alternatives considered**:
- Incluir concepto porque ya es publico: descartado por minimizacion.
- Incluir `continue/final`: descartado; IMP-9 decide multirronda.
- Incluir puntos: descartado; IMP-9 es propietario.

## Public terminal projection

**Decision**: Separar `PublicTerminalResolution` del handoff IMP-9. La proyeccion de UI puede
incluir concepto y roles ya publicos; el handoff de scoring sigue reducido.

**Rationale**: Que un dato pueda mostrarse no implica que deba atravesar todos los contratos.

## Recovery and idempotency

**Decision**: Persistir input consumido, ledger, decision, intentos y salida. Reapertura deriva vista
sin reevaluar matriz ni texto. ResultId repetido igual es no-op; diferente es incompatible.

**Rationale**: Evita resolver dos veces, duplicar intento o emitir dos requests/handoffs.

## Dependencies

**Decision**: Sin dependencias ni migracion. Funciones puras y Dexie actual bastan.

**Rationale**: Matriz, normalizacion y allowlists son pequeñas y testeables.
