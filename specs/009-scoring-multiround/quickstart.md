# Quickstart: Puntuacion y continuidad multirronda

## A. Score table

1. Crear fixtures de 1, 2 y 3 impostores con el allowlist exacto.
2. Verificar +1 por ciudadano en victoria ciudadana y +2 por impostor original en victoria impostora.
3. Verificar +1 solo por cada autor impostor con intento `correct`.
4. Confirmar que la proyeccion publica excluye roles, intentos, eliminados y movimientos.

## B. Idempotency

1. Aplicar resultado y capturar tabla, recovery y metadata.
2. Repetir handoff identico: estado equivalente y revisiones intactas.
3. Reutilizar `resultId` cambiando winner/role/attempt: conflicto y cero writes.
4. Correr dos writers: stale reload sin replay.

## C. Ranking and route

1. Producir totales distintos, empate medio y empate maximo.
2. Verificar total descendente, roster estable y `1,1,3`.
3. Antes de la ultima ronda, unica accion `next-round`.
4. Exactamente en `PreparedGame.rounds`, `final-ranking`, todos los ganadores y ninguna ronda extra.

## D. Offline recovery

1. Cerrar tras aplicar y reabrir offline desde `ScoringRecoveryReference`.
2. Verificar marcador/ranking identicos, observer sin comandos y safe mode sin borrado.
3. Auditar URL, navigation, errores, consola y payloads publicos.

## E. Coordinate IMP-4 -> IMP-5

1. Crear `NextRoundRequest` para ronda + 1 y confirmar intencion.
2. Invocar coordinador una vez e instrumentar la transaccion existente.
3. Verificar draw IMP-4 antes de roles IMP-5 y commit conjunto de historiales/recovery/metadata.
4. Forzar agotamiento, RNG invalido, fallo de roles, cuota y writer loss: marcador intacto y sin ronda parcial.
5. Retry consciente: abrir solo progreso publico IMP-5.

## F. Rematch

1. Desde ranking final confirmar revancha y verificar nuevo `gameId` y cero datos de juego previos.
2. Recorrer jugadores, configuracion y contenido editables/revalidados antes de IMP-5.
3. Nueva partida conserva grupos, categorias y preferencias reutilizables.

## G. Gates

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Ejecutar teclado, axe, 320 px, zoom 200%, reload/offline y privacidad. Bundle <= 180 KiB gzip.
