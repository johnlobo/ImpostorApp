# Quickstart: Desarrollo de rondas, pistas y temporizador

## A. Prepare the initial phase without starting time

1. Completar N/N revelaciones de IMP-5 y obtener un `RoundHandoff` valido.
2. Ejecutar `prepareInitial` y verificar `phaseNumber: 1`, estado `ready` y roster completo como
   `participantIds` en orden canonico.
3. Con `turnOrder: roster`, verificar secuencia igual a participants y primer ID.
4. Con `turnOrder: random`, usar RNG determinista y verificar una permutacion Fisher-Yates completa.
5. Con `turnOrder: free`, verificar `{ mode: 'free' }`, sin speaker ni startingPlayer.
6. Confirmar que todavia no existe `startedAt` ni deadline y que la UI ofrece `Comenzar pistas`.
7. Verificar que ready roster/random ya usa clues/indice 0/[] y free discussion/null/[].
8. Verificar `totalRounds` contra `PreparedGame.rounds` sin exponer otras reglas secretas.
9. Repetir prepare y verificar mismo orden, cero RNG adicional y revision sin cambio.

## B. Begin free and timed clues

1. Pulsar `Comenzar pistas` y confirmar que el commit durable precede a los comandos activos.
2. En conversacion free, verificar reloj `untimed` y ausencia de contador/expiracion automatica.
3. En conversacion timer, verificar que deadline usa exactamente los segundos de `PreparedGame`,
   incluido un valor personalizado valido; IMP-6 no ofrece ni cambia presets.
4. Repetir begin sobre active y verificar no-op sin incremento de revision.
5. Simular fallo de almacenamiento en begin y verificar que la fase permanece ready y el tiempo no
   comienza visualmente.
6. En roster/random verificar avance estrictamente secuencial con `expectedTurnIndex`; repetir el
   mismo token produce una escritura total y el ultimo turno entra en discussion.
7. Confirmar que la lista no permite saltar por chip/ID y que free mantiene indice nulo y lista vacia.

## C. Pause, resume and resist clock changes

1. Avanzar el reloj inyectado durante running y verificar remaining con tolerancia de un segundo.
2. Pausar y comprobar que remaining queda persistido antes de mostrar paused.
3. Avanzar tiempo mientras paused y comprobar remaining invariable.
4. Reanudar y comprobar deadline nuevo desde el remaining, no desde duracion completa.
5. Repetir pause sobre paused y resume sobre running; verificar no-op sin revision.
6. Mover el reloj hacia atras y comprobar que remaining no supera `maximumRemainingSeconds`.
7. Moverlo hacia delante mas alla del deadline y comprobar proyeccion expired sin navegacion.
8. Probar reloj no finito y obtener `invalid-clock`; verificar que expired no puede pausarse,
   reanudarse ni resetearse.

## D. Recover offline and in background

1. Reabrir offline una fase ready y verificar que no ha comenzado el timer.
2. Reabrir running despues de tiempo real y comprobar descuento desde deadline, sin RNG ni extension.
3. Reabrir paused y verificar el remaining exacto confirmado.
4. Ocultar/mostrar la app y disparar `pageshow`; verificar recalculo, no acumulacion de ticks.
5. Recuperar expired y verificar aviso accesible y accion explicita de cierre disponible.
6. Recuperar cada turno gestionado y comprobar indice/completados exactos sin repetir avances.
7. Simular payload parcial/futuro y verificar modo seguro, datos preservados y error sin secretos.

## E. Close durably and hand off to IMP-7

1. Solicitar `Terminar pistas` desde untimed, running, paused y expired; verificar dialogo de
   confirmacion en todos los casos.
2. Cancelar y comprobar cero escrituras.
3. Confirmar desde un estado no expirado y verificar handoff `manual` solo despues del commit.
4. Confirmar desde expired y verificar `timer-expired`.
5. Verificar que `participantIds` del handoff mantiene orden canonico de roster aunque turnSequence
   sea random.
6. Repetir close y verificar mismo handoff, cero revision y cero navegacion adicional.
7. Simular fallo y comprobar fase anterior intacta, sin callback hacia IMP-7, con retry consciente.

## F. Handle conflicts without replay

1. Abrir dos servicios sobre la misma revision y pausar/cerrar desde el escritor valido.
2. Ejecutar el comando stale desde la otra instancia y obtener `revision-conflict`.
3. Pulsar retry y verificar que solo hace load del ultimo snapshot, sin repetir pause/resume/close.
4. Verificar que dobles pulsaciones locales quedan serializadas y producen una sola escritura.
5. Transferir writer lease y comprobar que observer solo ve la proyeccion publica y todos sus
   comandos permanecen deshabilitados.

## G. Prepare a successive phase from IMP-8

1. Cerrar phase 1 y construir `NextCluePhaseRequest` como salida simulada de IMP-8 posterior a IMP-7
   y a una decision de no victoria.
2. Enviar `phaseNumber: 2` e IDs elegibles validos; verificar canonicalizacion al orden del roster.
3. Confirmar nueva activePhase ready y comprobar que solo queda el handoff minimo de phase 1.
4. Con random, verificar una nueva permutacion y que no cambia el handoff previo.
5. Probar lista vacia, duplicada, ID ajeno, roster completo sin reduccion, numero saltado, fase previa
   abierta y request de otra partida/ronda; todos fallan sin escritura.
6. Verificar que la solicitud entra directamente por `prepareNext`, nunca como callback de IMP-6.
7. Verificar cardinalidad de handoffs: `phaseNumber-1` en ready/active y `phaseNumber` en closed,
   siempre contiguos y sin duplicados.
8. Verificar que IMP-6 no consulta votos, roles, eliminados ni condiciones de victoria.
9. En phase 1 comprobar ledger null; en successive preservar exactamente la cabecera/payload opacos
   de IMP-8 hasta `CluePhaseHandoff`, sin aparecer en proyecciones publicas.

## H. Privacy, accessibility and responsive layout

1. Inspeccionar `PublicRoundSession`, estado de servicio, props, `CluePhaseHandoff` y
   `NextCluePhaseRequest`: sin categoria, concepto, roles, companions o votos.
2. Inspeccionar DOM shared/observer, URL, estado de navegacion, `PublicPlatformError` y consola en
   ready, clues, discussion, running, paused, expired, confirmation, error y closed.
3. Confirmar que no existe telemetria ni logging de payloads.
4. Completar begin, pause, resume y close solo con teclado; validar foco tras dialogos y errores.
5. Ejecutar axe sobre todos los estados. Anunciar hitos y expiracion, no cada segundo.
6. Verificar ausencia de overflow a 320 px con nombres maximos, timer y lista random completa.
7. Confirmar header/cuerpo/footer, una unica CTA, secuencia no navegable y Game Menu solo en shared.
8. Verificar que solo IMP-10 renderiza Game Menu y que IMP-6 entrega una capability publica.

## I. Continuity adapter for IMP-10

1. Proyectar summary y safe route sin snapshot secreto.
2. Desde running, ejecutar `pauseForHome` y comprobar commit paused antes de Home.
3. Desde paused, verificar no-op; desde expired, conservar expiry; desde observer, bloquear comando.
4. Forzar stale revision y verificar reload sin replay. Confirmar que el adaptador no ofrece abandon.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
node scripts/check-bundle-size.mjs
```

## Expected test evidence

- Tabla de dominio para `roster`, Fisher-Yates y `free`, incluyendo RNG 0, casi 1 e invalido.
- Tabla de avance secuencial, doble pulsacion, ultimo turno a discussion y neutralidad de free.
- Fake timers/reloj para ready, running, paused, expired, background y saltos de reloj.
- fake-indexeddb para atomicidad, no-ops, revisiones, writer, recovery y payload compuesto.
- Playwright en Chromium PWA y WebKit para offline, background, teclado, privacidad y 320 px.
