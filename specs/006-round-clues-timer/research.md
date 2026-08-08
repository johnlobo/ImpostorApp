# Research: Desarrollo de rondas, pistas y temporizador

## Public handoff and private source state

**Decision**: Mantener `RoundHandoff` sin cambios y tratarlo como referencia. El repositorio IMP-6
relee el `round-prepared`, valida identidad y N/N, y retorna una proyeccion `PreparedRound` publica.

**Rationale**: El handoff actual fue disenado para no contener roles ni concepto. `PreparedGame` ya
esta dentro del snapshot durable y es la fuente autoritativa de roster y reglas. Repetirlo en el
callback introduce dos fuentes y aumenta el riesgo de filtrar el snapshot entero.

**Alternatives considered**:
- Ampliar `RoundHandoff` con `PreparedGame`: descartado por duplicacion y porque no resuelve recovery.
- Pasar `SecretRoundSnapshot` al hook: descartado; el modo observer y la superficie compartida no
  deben poder recibir secretos ni siquiera como props o estado serializable.

## Recovery envelope and phase history

**Decision**: Usar la fase `clues-active` en el registro unico `active-game`, con un payload interno
que contiene el `SecretRoundSnapshot` original, un ledger de resolucion opaco, la fase activa y los
handoffs minimos de fases cerradas.

**Rationale**: Una fase sucesiva necesita continuidad, no snapshots temporales completos anteriores,
y las epicas de votacion/final necesitan el secreto original. Una transaccion sobre
`recoverySnapshots` y `metadata` preserva la revision unica y evita estados parciales sin migracion.

**Alternatives considered**:
- Tabla `clue-phases`: descartada porque obligaria a coordinarla atomicamente con recovery y a
  reconstruir dos fuentes tras un cierre inesperado.
- Sobrescribir `round-prepared` con solo la fase publica: descartado porque elimina roles/concepto.
- Guardar ticks: descartado por volumen de escrituras y dependencia de ejecucion en background.

El ledger es null en phase 1. En successive, IMP-6 valida solo schema/game/round y preserva el payload
de IMP-8 sin proyectarlo ni mutarlo; perderlo reiniciaria eliminados e intentos entre ciclos.

## Random turn order

**Decision**: Para `turnOrder: random`, aplicar Fisher-Yates de derecha a izquierda sobre la lista
elegible en orden de roster. Cada paso usa un valor RNG finito en `[0, 1)` para elegir un indice
entre cero y el indice actual inclusive.

**Rationale**: Produce una permutacion uniforme completa, cumple literalmente FR-004 y deja primer
jugador y secuencia inequívocos. La lista se persiste antes de mostrar comandos.

**Alternatives considered**:
- Elegir solo primer jugador y rotar roster: descartado por la aclaracion de la spec que exige
  permutacion completa.
- `array.sort(() => random() - 0.5)`: descartado por sesgo, dependencia del motor y dificultad de
  validar RNG.

## Timer model and clock changes

**Decision**: El estado running persiste duracion, deadline, instante confirmado y un limite de
segundos restantes. `remainingAt(clock)` toma el menor entre el limite confirmado y la diferencia
redondeada hacia arriba entre deadline y ahora, acotada a cero/duracion.

**Rationale**: El deadline descuenta tiempo mientras JavaScript esta suspendido. El limite impide
que atrasar el reloj supere el maximo durable, aunque no puede impedir recuperar tiempo observado
dentro de ese limite. Redondear hacia arriba mantiene una tolerancia visual de un segundo sin
finalizar antes del deadline. Un valor de reloj no finito produce `invalid-clock`.

**Alternatives considered**:
- `setInterval` como fuente de verdad: descartado; navegadores moviles suspenden timers.
- `performance.now()`: descartado como fuente durable porque no sobrevive reload.
- Deadline sin limite: descartado porque un salto atras ampliaria la ronda.
- Persistir `expired` exactamente al llegar a cero: descartado como requisito de correccion; una app
  cerrada no puede escribir. La proyeccion deriva expiracion y la siguiente mutacion la normaliza.

## Pause, resume and close semantics

**Decision**: La fase se prepara `ready` y el commit explicito begin inicia conversacion y deadline.
Pausa calcula y persiste el restante efectivo; resume persiste un deadline nuevo desde ese restante;
close normaliza el reloj, exige confirmacion y persiste un cierre inmutable antes de emitir el
handoff. Toda mutacion deriva primero el reloj efectivo: expired no puede pausarse ni reanudarse.
Pausar paused o reanudar running es no-op sin nueva revision y no existe reset del temporizador.

**Rationale**: Cada accion irreversible tiene una revision durable. Un fallo conserva el snapshot
anterior. El motivo de cierre se deriva del reloj efectivo: `timer-expired` si ya esta a cero,
`manual` en los demas casos.

**Alternatives considered**:
- Cerrar automaticamente al expirar: descartado por FR-012.
- Emitir handoff antes del commit y compensar en error: descartado por privacidad, recuperacion e
  idempotencia.

## Successive phases

**Decision**: La fase inicial usa el roster completo de `PreparedGame`. Una fase sucesiva acepta solo
un `NextCluePhaseRequest` emitido por IMP-8 despues del resultado de IMP-7 y de descartar victoria,
con `phaseNumber` exactamente anterior + 1 e IDs unicos que forman un subconjunto estricto de los
participantes anteriores. Los elegibles se canonicalizan al orden del roster antes de resolver el
`TurnSequence`. La solicitud es entrada directa de `prepareNext`, no callback de IMP-6.

**Rationale**: IMP-6 reutiliza orden y reloj sin decidir eliminaciones. Canonicalizar evita que una
epica posterior altere indirectamente la semantica de `turnOrder: roster`.

**Alternatives considered**:
- Calcular elegibles desde roles/votos: descartado por FR-022/FR-023.
- Aceptar cualquier numero de fase: descartado porque permitiria huecos y handoffs ambiguos.
- Aceptar de nuevo el roster completo: descartado porque no demuestra progreso externo y permitiria
  una cantidad ilimitada de fases.

## Durable clue progression

**Decision**: `roster` y `random` persisten desde ready `stage`, `currentTurnIndex` y el prefijo
exacto de `completedCluePlayerIds`. Avanzar recibe el indice observado como token de intencion, no
como destino: completa el turno actual; repetir un token completado es no-op y el ultimo avance entra
en discussion. `free` permanece en discussion con progreso neutral.

**Rationale**: La lista de la propuesta visual comunica contexto, pero permitir seleccionar chips
inventaria saltos no especificados y haria imposible recuperar un unico siguiente turno durable.

## Minimal handoff history invariants

**Decision**: Los handoffs son unicos, contiguos y ascendentes desde phase 1. Con fase activa
ready/active la lista tiene `phaseNumber - 1` elementos; con fase closed tiene `phaseNumber` y el
ultimo es exactamente su cierre. `prepareNext` sustituye el snapshot cerrado por la nueva fase ready.

**Rationale**: Estas invariantes detectan huecos, duplicados y recuperaciones parciales sin retener
snapshots temporales completos.

## Canonical participants and public handoff

**Decision**: `participantIds` conserva siempre el orden canonico del roster, separado de
`TurnSequence`. En free sigue siendo una coleccion canonica y no implica speaker ni turnos.

**Rationale**: IMP-7 necesita participantes estables, mientras el orden random pertenece solo a la
dinamica de pistas. Separarlos evita que free adquiera semantica accidental y mantiene handoffs
comparables.

## Conflict and privacy surfaces

**Decision**: Un conflicto stale recarga el ultimo snapshot sin repetir la intencion. Comandos
incompatibles producen issue tipado; repeticiones idempotentes son no-op. La auditoria inspecciona
URL, navigation state, `PublicPlatformError`, consola capturada y payload publico serializado; no hay
telemetria integrada.

**Rationale**: Replay tras conflicto puede pausar, reanudar o cerrar un estado diferente al visto por
el usuario. Enumerar sinks convierte la privacidad en una matriz verificable.

## Scheduling and accessibility

**Decision**: El hook usa un scheduler inyectable para actualizar solo la representacion del
restante. Recalcula al montar, `visibilitychange`, `pageshow` y como maximo una vez por segundo. El
anuncio accesible usa hitos (inicio, pausa, ultimo minuto, expiracion), no un `aria-live` por tick.
La pantalla sigue el inventario aprobado, muestra la secuencia como informacion y una unica CTA; el
slot de Game Menu pertenece a IMP-10 y solo aparece en superficies compartidas.

**Rationale**: Mantiene precision suficiente sin escrituras, renders ni anuncios excesivos. Los
comandos siguen siendo botones nativos con foco visible y etiquetas externas.

## Dependencies

**Decision**: No anadir dependencias. React, Dexie, Vitest fake timers y APIs estandar cubren la
feature.

**Rationale**: La maquina de estados y aritmetica temporal son pequenas y deterministas; una
libreria de timer aumentaria bundle sin resolver persistencia, revisions ni background.
