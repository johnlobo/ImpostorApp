# Quickstart: Asignacion secreta y revelacion segura de roles

## A. Prepare a round atomically

1. Confirmar un `PreparedContentSelection` (IMP-4) offline con un catalogo pequeno y deterministico.
2. Preparar la ronda con RNG inyectado y verificar que la revision del `RecoverySnapshot` avanza
   exactamente en uno con `phase: 'round-prepared'`.
3. Verificar que hay exactamente `impostorCount` impostores sin `playerId` repetido.
4. Verificar que el `conceptId` sorteado ya aparece en el historial `used-concepts` antes de que
   cualquier vista privada pueda mostrarlo.
5. Simular un fallo de escritura durante la preparacion y verificar que ni el historial de conceptos
   ni el historial de reparto ni el snapshot cambian.
6. Repetir la misma preparacion sobre una ronda ya confirmada y verificar que no genera una segunda
   asignacion ni un segundo draw (idempotencia, FR-006).

## B. Complete private reveals one by one

1. Desde la lista compartida, verificar que solo se muestran nombre, orden y estado por jugador.
2. Pulsar un jugador no completado y verificar que la vista privada muestra la categoria, pero el
   concepto o rol comienza cubierto con "Pulsa para ver el concepto".
3. Pulsar para revelar y verificar que el estado `completed` se persiste (revision incrementada)
   antes de que la categoria y el concepto (o "IMPOSTOR") aparezcan en pantalla.
4. Pulsar para ocultar y verificar que el contenido secreto se desmonta del DOM y la app vuelve a la
   lista compartida.
5. Verificar que el jugador aparece atenuado y bloqueado en la lista compartida.

## C. Enforce single-use reveal and lock

1. Sobre un jugador ya completado, recargar la pagina, navegar y pulsar dos veces su nombre.
2. Verificar que ninguna de esas acciones repite la consulta ni vuelve a mostrar el secreto.
3. Simular dos pestanas confirmando la revelacion del mismo jugador casi al mismo tiempo y verificar
   que solo una persiste el cambio; la otra recibe `revision-conflict`, recarga el snapshot y ve al
   jugador ya `completed` sin error visible para el usuario.

## D. Gate "Empezar ronda" on N/N

1. Con progreso menor a N/N, verificar que "Empezar ronda" permanece deshabilitado.
2. Completar el ultimo jugador y verificar que se habilita inmediatamente.
3. Pulsar "Empezar ronda" y verificar el `RoundHandoff` entregado: sin roles, sin concepto, sin
   nombres de companeros.
4. Repetir la pulsacion y verificar que no se reinicia ni duplica el reparto (sin escritura nueva).
5. Desde un dispositivo en modo observador, verificar que solo puede leer el progreso publico y que
   "Empezar ronda" y la vista privada nunca se montan para ese modo.

## E. Multi-impostor awareness policy

1. Con `impostorAwareness: 'unknown'` y dos o tres impostores, revelar cada impostor y verificar que
   solo ve "IMPOSTOR" y la categoria, nunca nombres de companeros.
2. Con `impostorAwareness: 'known'`, revelar cada impostor y verificar que ve unicamente los nombres
   de los demas impostores, sin concepto propio ni ajeno.
3. Revelar un ciudadano bajo ambas politicas y verificar que nunca recibe la lista de impostores.
4. Con un unico impostor configurado, verificar que su lista de companeros esta normalizada a vacia
   independientemente de la politica.
5. Ejecutar la matriz completa con uno, dos y tres impostores y verificar que ninguna superficie
   publica filtra su identidad o numero.

## F. Recover an interrupted reveal offline

1. Preparar una ronda, completar algunas revelaciones y cerrar la aplicacion offline.
2. Reabrir y verificar que la asignacion, el concepto y los jugadores completados se conservan sin
   volver a ejecutar el RNG.
3. Verificar que la reapertura siempre presenta primero la lista compartida, nunca una vista privada
   abierta automaticamente, incluso si el cierre ocurrio justo entre "revelar confirmado" y
   "contenido mostrado".
4. Simular datos de reparto con `schemaVersion` incompatible y verificar que la aplicacion entra en
   modo seguro sin eliminar datos y sin secretos en ningun mensaje de error.
5. Simular un snapshot secreto sin su `DrawResult`/`DrawnConcept` asociado (o viceversa) y verificar
   que la recuperacion lo trata como dato incompatible en vez de exponerlo parcialmente.

## G. Accessibility, responsive layout and privacy

1. Completar la lista compartida, la revelacion y "Empezar ronda" usando solo teclado.
2. Ejecutar axe sobre la lista compartida, la vista privada cubierta, la vista revelada y el estado
   de error de almacenamiento.
3. Verificar que no hay overflow horizontal a 320 px con nombres de jugador de longitud maxima.
4. Verificar que URLs, consola, errores publicos y `PublicRoundProgress` no contienen concepto, rol
   ni nombres de companeros impostores en ningun momento.

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
