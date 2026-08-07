# Research: Asignacion secreta y revelacion segura de roles

## Atomic round confirmation

**Decision**: Introducir `SecretRoundRepository.prepare`, un repositorio de infraestructura que abre
una unica transaccion Dexie sobre `used-concepts`, la nueva tabla `role-assignment-history` y
`recoverySnapshots`/`metadata`. Dentro de esa transaccion reutiliza la funcion de dominio pura
`drawNextConcept` (ya exportada por `contentCatalog.ts`) para elegir el concepto, en vez de invocar
`ConceptDrawRepository.drawAndMarkUsed`.

**Rationale**: FR-004 exige que el draw, el historial de conceptos y el snapshot secreto se
persistan en una unica transaccion durable. `ConceptDrawRepository.drawAndMarkUsed` administra su
propia transaccion Dexie y su propia cola de serializacion por `gameId`; llamarlo desde dentro de
otra transaccion no la extiende, crea una transaccion Dexie anidada independiente que puede
confirmarse aunque el resto de la operacion falle despues, violando FR-005. Reutilizar la funcion de
dominio (no el repositorio) preserva el algoritmo de seleccion exacto de IMP-4 sin duplicarlo,
mientras que la escritura fisica en `used-concepts` se hace con el mismo formato de `ConceptHistory`
que IMP-4 ya valida y sigue leyendo.

**Alternatives considered**:
- Llamar `drawAndMarkUsed` y despues guardar el snapshot en una segunda operacion: rechazado porque
  dos escrituras independientes no son atomicas; un fallo entre ambas deja un concepto marcado como
  usado sin ronda ni roles persistidos, exactamente el estado parcial que FR-005 prohibe.
  Adicionalmente, el `Assumptions` del spec matiza que IMP-5 invoca el draw de IMP-4 "como parte de su
  propia transaccion de confirmacion", lo que en el codigo actual solo es alcanzable reutilizando la
  logica de dominio en vez del puerto transaccional completo; se documenta como resolucion de esa
  ambigüedad.
- Extender `ConceptDrawRepository` para aceptar una transaccion externa: rechazado por ahora porque
  cambiaria un contrato ya publicado de IMP-4 y su cola de serializacion por `gameId`, aumentando el
  acoplamiento entre features sin necesidad; la reutilizacion a nivel de dominio logra el mismo
  resultado con menor superficie de cambio.

## Balanced allocation history

**Decision**: Anadir una tabla Dexie nueva y aditiva `role-assignment-history` (migracion version 2)
que guarda, por `PreparedGame.id`, cuantas veces fue impostor cada jugador y cuantas rondas se han
jugado. `assignRoles` recibe ese conteo como parametro explicito y puro, igual que `drawNextConcept`
recibe `usedConceptIds`.

**Rationale**: Ninguna tabla existente modela un conteo acumulado de rondas por jugador sin
sobrecargar su significado (`used-concepts` es especifico del esquema `ConceptHistory` de IMP-4). Una
migracion aditiva no toca datos existentes y sigue el patron ya usado en
`infrastructure/persistence/migrations.ts`. Mantener el conteo fuera del dominio y pasarlo como
argumento explicito conserva `assignRoles` puro y determinista para tests de tabla (Principio IV).

**Alternatives considered**:
- Derivar el balance leyendo todos los `SecretRoundSnapshot` historicos: rechazado porque el
  snapshot es un unico registro (`id: 'active-game'`) que cada ronda sobrescribe; no existe historial
  de snapshots anteriores para recorrer.
- Guardar el conteo dentro del propio `SecretRoundSnapshot`: rechazado porque el snapshot se
  reemplaza por completo en cada ronda y mezclar "estado de la ronda actual" con "historial
  acumulado de la partida" complica la invalidacion cuando cambia `impostorAwareness` (Edge Case:
  "Cambia `impostorAwareness` en una configuracion mientras existe un reparto ya confirmado").

## Terminology mapping: DrawResult vs DrawnConcept

**Decision**: El spec usa "DrawResult" como nombre conceptual de la Historia 1 y de `Key Entities`;
el codigo de IMP-4 ya expone exactamente ese concepto como la interfaz `DrawnConcept` en
`src/domain/entities/contentCatalog.ts`. IMP-5 reutiliza `DrawnConcept` tal cual, sin redefinirlo ni
crear un alias nuevo.

**Rationale**: FR-001 prohibe redefinir reglas de contenido; introducir un tipo `DrawResult` paralelo
crearia dos representaciones de la misma idea. Se documenta el mapeo de nombres para que `tasks.md`
y la implementacion no dupliquen el tipo por una diferencia de vocabulario entre el spec y el codigo.

## Secret snapshot phase and multi-round continuity

**Decision**: El snapshot secreto se persiste como una nueva fase `round-prepared` en el mismo
registro `recoverySnapshots` (`id: 'active-game'`), reemplazando la fase `content-selected` de IMP-4.
`SecretRoundSnapshot.content` conserva la `PreparedContentSelection` completa (categorias, seleccion,
IDs elegibles), no solo el concepto sorteado.

**Rationale**: Los `Assumptions` del spec indican que una nueva ronda de la misma partida "repite el
flujo de preparacion desde el principio". Si el snapshot de la ronda 1 solo guardara el concepto ya
sorteado y sobrescribiera la fase `content-selected`, la ronda 2 no podria volver a invocar
`drawNextConcept` porque perderia el catalogo elegible. Conservar `content` completo hace que cada
`SecretRoundSnapshot` sea autosuficiente para preparar la siguiente ronda sin leer una fase anterior
ya sobrescrita.

**Alternatives considered**:
- Mantener `content-selected` y `round-prepared` como dos registros separados: rechazado porque
  `RecoverySnapshot` esta modelado como un unico registro activo (`id: 'active-game'`) en todo el
  esquema actual; introducir un segundo registro de recuperacion es un cambio estructural mayor no
  requerido por el spec.

## Reveal completion and idempotency

**Decision**: Cada revelacion confirmada (FR-010) es una escritura adicional sobre el mismo registro
`recoverySnapshots`, usando el mecanismo de revision optimista (`expectedRevision`) ya existente. La
idempotencia por jugador (FR-012, SC-003) se resuelve en dos capas: el repositorio no incrementa el
estado si el jugador ya esta `completed` (no-op que devuelve el snapshot actual), y el servicio de
feature ignora una segunda pulsacion sobre un jugador ya bloqueado antes incluso de llamar al
repositorio.

**Rationale**: Reutiliza exactamente el mecanismo de conflicto de revision que ya maneja el Edge Case
"Dos pestanas intentan completar la revelacion del mismo jugador simultaneamente" en IMP-3/IMP-4
(`commitRecoverySnapshot` ya rechaza con `revision-conflict` si la revision no coincide). No se
introduce coordinacion nueva.

**Alternatives considered**:
- Una tabla `reveal-state` separada por jugador: rechazada porque escrituras concurrentes sobre
  entradas independientes eliminarian la garantia de revision unica que ya protege el resto del
  estado de la partida, y complicaria el snapshot unico que Historia 5 exige recuperar completo.

## Privacy enforcement without storage separation

**Decision**: El `SecretRoundSnapshot` persiste roles y concepto en claro en IndexedDB local (a
diferencia de `PreparedContentSelection`, que deliberadamente no incluye el concepto sorteado). La
privacidad constitucional (Principio II) se hace cumplir con proyecciones puras
(`derivePublicProgress`, `resolvePrivateRoleView`) que son las unicas funciones autorizadas a
alimentar la superficie compartida y el modo observador.

**Rationale**: FR-007 y la Historia 5 exigen recuperar "la misma asignacion, el mismo concepto" tras
cerrar y reabrir la aplicacion sin volver a ejecutar el RNG; eso obliga a persistir el contenido
secreto en claro (no solo su ID), a diferencia del sorteo de IMP-4 que aun no habia comenzado una
ronda. La app no tiene enrutamiento por URL (`src/app/navigation.ts` es un reducer en memoria sin
historial de navegacion), por lo que "sin secretos en URL" (FR-015, FR-026) se cumple
estructuralmente; el riesgo real esta en pasar el snapshot completo como prop a un componente de
modo observador, por lo que los tests de componente deben afirmar explicitamente que esa rama solo
recibe la proyeccion publica.

## Dependencies and schema

**Decision**: No se anade ninguna dependencia de tiempo de ejecucion. Se anade exactamente una
migracion Dexie (version 2, aditiva) para `role-assignment-history`.

**Rationale**: TypeScript, React, Dexie y el stack de test actuales cubren dominio, persistencia y
UI. La migracion es minima, aditiva y sigue el patron de `persistenceMigrations` ya establecido; no
se toca ninguna tabla ni tipo existente de IMP-3 o IMP-4.
