# Quickstart: Resolucion de rondas y condiciones de victoria

## A. Validate the exact IMP-7 input

1. Preparar `VoteResolutionHandoff` con todos los campos canonicos.
2. Probar eliminated con lista valida y reason verbal/first/tiebreak.
3. Probar persistent-tie con second-tie y lista vacia.
4. Rechazar alias antiguo, reason/outcome incoherente, resultId vacio, IDs duplicados o ajenos.
5. Repetir mismo resultId+contenido y verificar no-op; mismo ID distinto debe ser incompatible.
6. Verificar que activos se derivan y nunca se leen del input.

## B. Execute the complete matrix

1. Para un impostor single, probar ciudadano eliminado, impostor eliminado y persistent tie.
2. Para K=2/3 single, probar todos los impostores eliminados y subconjunto que deja alguno activo.
3. Para K=2/3 successive, probar I=0, I=C, I>C e I<C.
4. Confirmar que paridad se evalua despues de eliminar.
5. Probar successive con un impostor y activar safe mode.
6. Verificar que single nunca emite NextCluePhaseRequest y successive solo cuando I>0 e I<C.

## C. Complete private final attempts

1. Con finalAttempt false, verificar cero intentos.
2. Con ciudadano eliminado o persistent tie, verificar cero intentos.
3. Eliminar varios impostores y comprobar cola individual en orden roster.
4. Abrir el siguiente intento desde cortinilla; verificar que no muestra concepto.
5. Confirmar guess y probar NFKC, trim, espacios y lowercase es.
6. Declinar explicitamente y rechazar texto vacio como guess.
7. Verificar commit antes de avanzar y bloqueo ante recarga/doble pulsacion.
8. Comprobar que siguiente jugador no recibe texto, outcome ni concepto.

## D. Continue successive through IMP-6

1. Completar intentos de una decision continue y confirmar salida.
2. Verificar request con mismo juego/ronda, phase+1, IDs activos canonicos e issuedAt.
3. Comprobar texto redacted antes del callback.
4. Repetir salida y verificar mismo request sin revision.
5. Hacer que IMP-6 consuma el request y preserve ledger opacamente.
6. Completar otra fase IMP-6/7 y verificar participantes exactos contra ledger.
7. Confirmar que IMP-6/7 no proyectan ni interpretan eliminados, roles u outcomes.

## E. Close and reveal a terminal round

1. Preparar terminal por cada reason: all-found, escaped, parity y persistent-tie.
2. Verificar que intentos pendientes bloquean terminal.
3. Confirmar terminal y comprobar persistencia/redaccion antes de revelar.
4. Verificar pantalla publica con ganador, motivo, concepto, roles y outcomes.
5. Repetir y comprobar mismo resultId/handoff sin segunda escritura/callback.
6. Fallar commit y confirmar que no se revela ni emite nada.

## F. Audit the IMP-9 allowlist

1. Verificar schemaVersion, resultId, game/round, participantIds y originalRoles.
2. Verificar winner/reason, eliminados acumulados, activos y outcomes redacted.
3. Comprobar particion exacta de roster y maximo un outcome por impostor.
4. Asegurar ausencia de concepto, categoria, answerText, votos, tally, companions y puntos.
5. Asegurar ausencia de continue/final de partida; IMP-9 deriva progresion.
6. Probar serializacion y validar que solo existen las claves permitidas.

## G. Recover, conflict and observe

1. Reabrir offline en resolving, entre intentos, continuation-ready y terminal.
2. Pending private debe abrir private-handoff cubierto, nunca el input anterior.
3. Confirmed guess no se compara otra vez; terminal no reevalua matriz.
4. Forzar conflicto en guess y salida; retry solo load, sin replay.
5. Observer ve proyeccion compartida sin comandos ni loadPrivateAttempt.
6. Payload futuro/parcial activa safe mode sin borrado ni secretos.

## H. Accessibility and responsive privacy

1. Recorrer shared y private solo con teclado; validar foco en cortinilla y retorno.
2. Ejecutar axe en todos los estados y terminal reveal.
3. Verificar 320 px/200% con 20 roles y varios outcomes.
4. Anunciar saving/completed/winner sin verbalizar texto ni rol antes del terminal.
5. Verificar Game Menu solo en shared y ausencia de secretos en URL/navigation/error/toast/console.
6. Confirmar cero telemetria y bundle dentro del presupuesto.

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

- Tabla pura 1..3 impostores para single, successive, parity y persistent tie.
- Matriz de normalizacion, intento/decline, doble submit y redaccion.
- fake-indexeddb para envelopes, ledger, atomicidad, revisions y allowlists.
- Integracion IMP-8 -> IMP-6 -> IMP-7 -> IMP-8 en dos fases successive.
- Component/Playwright/axe para privacidad, recovery, observer, teclado y 320 px.
