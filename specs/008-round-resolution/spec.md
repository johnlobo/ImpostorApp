# Feature Specification: Resolucion de rondas y condiciones de victoria

**Feature Branch**: `008-round-resolution`
**Created**: 2026-08-08
**Status**: Ready for implementation
**Jira Epic**: `IMP-8`

## Scope and boundaries

IMP-8 comienza al consumir un resultado durable de IMP-7 para una votacion cerrada. Lo valida
contra el `PreparedGame` y el snapshot secreto inmutable de IMP-5, gestiona como maximo un ultimo
intento individual por cada impostor descubierto cuando la regla esta activa y confirma una unica
decision durable: continuar la misma ronda mediante un `NextCluePhaseRequest` hacia IMP-6 o cerrar
la ronda mediante un `RoundResolutionHandoff` hacia IMP-9.

IMP-8 no registra ni cuenta votos, no elige eliminados y no reabre empates; eso pertenece a IMP-7.
Tampoco calcula puntos, actualiza clasificaciones, prepara contenido o roles de otra ronda, decide
siguiente ronda o final de partida, ni ejecuta revancha; eso pertenece a IMP-9 junto con IMP-4 e
IMP-5. `ProposedUI/src/screens/RoundResolutionScreen.tsx` es una referencia visual no normativa:
su victoria fija, datos simulados y navegacion directa no definen reglas de dominio.

## Resolution matrix

La matriz usa `I` para impostores activos despues de aplicar la eliminacion confirmada por IMP-7 y
`C` para ciudadanos activos. Un empate persistente es el segundo empate confirmado por IMP-7.

| Impostores | Eliminacion | Resultado de IMP-7 | Decision de IMP-8 |
|---|---|---|---|
| 1 | `single` efectivo | `persistent-tie` | Victoria impostora por `persistent-tie` |
| 1 | `single` efectivo | Se elimina al impostor | Intento si aplica; victoria ciudadana |
| 1 | `single` efectivo | Se elimina a un ciudadano | Victoria impostora por `impostors-escaped` |
| 2 o 3 | `single` | `persistent-tie` | Victoria impostora por `persistent-tie` |
| 2 o 3 | `single` | Todos los impostores quedan eliminados | Intentos si aplican; victoria ciudadana |
| 2 o 3 | `single` | Queda algun impostor activo | Intentos si aplican; victoria impostora por `impostors-escaped` |
| 2 o 3 | `successive` | `persistent-tie` | Victoria impostora por `persistent-tie` |
| 2 o 3 | `successive` | Se elimina impostor y `I = 0` | Intento si aplica; victoria ciudadana |
| 2 o 3 | `successive` | Tras eliminar, `I >= C` | Intento si aplica; victoria impostora por `impostor-parity` |
| 2 o 3 | `successive` | Tras eliminar, `I > 0` e `I < C` | Intento si aplica; continuar con los activos |

Con un impostor, IMP-3 normaliza `elimination` a `single`; recibir `successive` es dato
incompatible. En `single`, IMP-7 puede entregar entre uno e `impostorCount` eliminados por
decision verbal o por un recuento secreto resuelto. En `successive`
entrega exactamente uno. La paridad se evalua despues de aplicar la eliminacion. El empate
persistente tiene precedencia, contiene cero eliminados y no crea intentos.

## User Scenarios & Testing

### User Story 1 - Resolver cualquier votacion cerrada (Priority: P1)

Como grupo, quiero que la aplicacion aplique las reglas confirmadas a la votacion terminada, para
conocer si ganan ciudadanos, ganan impostores o debe continuar la ronda.

**Why this priority**: Es la decision central y evita interpretaciones distintas con uno, dos o tres
impostores.

**Independent Test**: Cada fila de la matriz produce una unica decision durable con el motivo
esperado, sin volver a contar votos ni modificar eliminados.

**Acceptance Scenarios**:

1. **Given** cualquier cantidad valida de impostores y `persistent-tie` confirmado por IMP-7,
   **When** se resuelve, **Then** ganan los impostores por `persistent-tie` sin ultimo intento.
2. **Given** `single`, **When** se aplican todos los eliminados simultaneos, **Then** ganan los
   ciudadanos si no queda ningun impostor; con cualquiera activo ganan los impostores por escape.
3. **Given** `successive`, **When** no quedan impostores, **Then** ganan los ciudadanos.
4. **Given** `successive`, **When** los impostores activos igualan o superan a los ciudadanos
   activos, **Then** ganan los impostores por paridad.
5. **Given** `successive` con `I > 0` e `I < C`, **When** termina la resolucion, **Then** la
   misma ronda continua con los participantes de IMP-7 menos sus eliminados, en orden canonico.
6. **Given** un payload que contradice roster, snapshot, impostores, eliminacion o fase, **When** se
   valida, **Then** no se escribe nada y se muestra un error publico seguro.

---

### User Story 2 - Completar el ultimo intento en privado (Priority: P1)

Como impostor descubierto, quiero disponer de mi unico intento configurado para adivinar el
concepto, para que pueda puntuarse sin revelar informacion a otros participantes.

**Why this priority**: Jira exige el intento individual e IMP-9 necesita su resultado para puntuar.

**Independent Test**: Con `finalAttempt: true`, cada impostor eliminado recibe exactamente una
vista privada cubierta, confirma un intento o renuncia, y no puede repetirlo tras guardar o recuperar.

**Acceptance Scenarios**:

1. **Given** `finalAttempt: false`, **When** se elimina un impostor, **Then** no aparece intento.
2. **Given** `finalAttempt: true`, **When** se elimina un ciudadano o hay empate persistente,
   **Then** no se crea intento.
3. **Given** varios impostores descubiertos, **When** corresponden intentos, **Then** cada uno recibe
   una oportunidad individual en orden canonico de roster, con cortinilla antes y despues.
4. **Given** un intento pendiente, **When** se confirma texto no vacio o se renuncia, **Then** la
   eleccion y su acierto se guardan antes de avanzar.
5. **Given** un intento confirmado o renunciado, **When** se recarga, vuelve atras o pulsa dos veces,
   **Then** permanece bloqueado.
6. **Given** varios intentos, **When** uno termina, **Then** respuesta, acierto y concepto siguen
   ocultos al siguiente jugador y hasta el resultado terminal.
7. **Given** cualquier intento, **When** se calcula la decision, **Then** acertar o fallar no cambia
   ganador ni continuacion; solo alimenta la puntuacion de IMP-9.

---

### User Story 3 - Continuar una eliminacion sucesiva (Priority: P1)

Como grupo, quiero volver a pistas solo cuando aun no existe ganador, para seguir con los
participantes correctos y el mismo concepto.

**Why this priority**: Cierra el ciclo IMP-6 -> IMP-7 -> IMP-8 sin duplicar logica de pistas.

**Independent Test**: Una resolucion no terminal emite una sola solicitud publica valida para la
fase siguiente; repetirla devuelve la misma solicitud.

**Acceptance Scenarios**:

1. **Given** `successive`, intentos cerrados, `I > 0` e `I < C`, **When** se confirma continuar,
   **Then** se persiste un `NextCluePhaseRequest` con fase siguiente e IDs activos en orden roster.
2. **Given** una solicitud confirmada, **When** se repite la accion, **Then** se devuelve la misma sin
   nueva revision, fase o navegacion.
3. **Given** condicion terminal, `single` o intentos pendientes, **When** se solicita otra fase,
   **Then** se rechaza sin escritura parcial.
4. **Given** solicitud valida, **When** IMP-6 la consume, **Then** IMP-8 no decide orden, temporizador
   ni quien comienza.
5. **Given** continuacion sucesiva, **When** se muestra el estado intermedio, **Then** puede informar
   eliminado y su rol resuelto, pero oculta concepto y roles de todos los activos.

---

### User Story 4 - Explicar un resultado terminal (Priority: P1)

Como grupo, quiero conocer ganador, motivo, concepto y roles, para cerrar la ronda sin ambiguedad.

**Why this priority**: La explicacion del resultado es criterio explicito de IMP-8 y habilita IMP-9.

**Independent Test**: Solo tras persistir una resolucion terminal se muestran ganador, concepto,
roles e intentos; antes no aparece ningun secreto en una superficie compartida.

**Acceptance Scenarios**:

1. **Given** una decision aun no persistida, **When** valida o guarda, **Then** no muestra secretos.
2. **Given** resolucion terminal, **When** se abre, **Then** muestra ganador y motivo
   `all-impostors-found`, `impostors-escaped`, `impostor-parity` o `persistent-tie`.
3. **Given** resultado terminal, **When** se despliega, **Then** muestra el concepto de IMP-5, todos
   los roles y los resultados de intentos.
4. **Given** ronda resuelta, **When** se pulsa continuar repetidamente, **Then** entrega un unico
   `RoundResolutionHandoff` a IMP-9.
5. **Given** cualquier numero de ronda, **When** se muestra la salida, **Then** IMP-8 usa Continuar;
   IMP-9 decide marcador, siguiente ronda, resultado final o revancha.

---

### User Story 5 - Recuperar offline sin resolver dos veces (Priority: P2)

Como grupo, quiero recuperar el progreso de resolucion tras cerrar la aplicacion, para no repetir
eliminaciones, intentos ni decisiones.

**Why this priority**: La recuperacion protege secretos y la unicidad de la resolucion.

**Independent Test**: Cada estado durable reabre offline en una superficie segura, con los mismos
intentos bloqueados, decision y salida.

**Acceptance Scenarios**:

1. **Given** intentos pendientes, **When** se reabre, **Then** aparece primero una cortinilla
   compartida y se reanuda el primer pendiente sin mostrar intentos anteriores.
2. **Given** resolucion terminal, **When** se reabre, **Then** conserva ganador, revelacion y handoff.
3. **Given** continuacion ya entregada, **When** se reabre, **Then** conserva la misma solicitud.
4. **Given** dos escritores con igual revision, **When** confirman, **Then** solo uno gana y el otro
   recarga sin repetir su intencion obsoleta.
5. **Given** modo observador, **When** consulta, **Then** ve solo la proyeccion compartida confirmada
   y no dispone de comandos privados o mutables.
6. **Given** datos incompatibles, **When** se recuperan, **Then** entra en modo seguro sin borrar ni
   filtrar concepto, roles, respuestas o votos.

### Edge Cases

- IMP-7 entrega empate persistente junto con eliminados.
- `single` entrega cero eliminados, mas de `impostorCount` o IDs fuera de participantes.
- `successive` entrega cero o mas de un eliminado.
- Un ID esta activo y eliminado, duplicado o fuera del roster.
- La paridad aparece exactamente al eliminar ciudadano o impostor.
- La app se cierra entre intentos de varios impostores.
- Se confirma texto solo con espacios o se renuncia con texto escrito.
- Dos pestanas confirman el mismo intento.
- Falla persistencia despues de calcular acierto pero antes de confirmarlo.
- Se abre una vista privada desde URL, historial o modo observador.
- Se intenta revelar antes de completar todos los intentos.
- IMP-6 o IMP-9 recibe dos veces la misma salida.
- Un impostor llega con `successive`.
- Snapshot secreto, partida, ronda o roster no coinciden.

## Requirements

### Functional Requirements

- **FR-001**: MUST consumir resultado durable de IMP-7, `PreparedGame` y `SecretRoundSnapshot`;
  MUST NOT registrar, contar ni reinterpretar votos.
- **FR-002**: El unico input de IMP-7 MUST ser `VoteResolutionHandoff` con
  `schemaVersion`, `resultId`, `gameId`, `roundNumber`, `phaseNumber`, `participantIds`,
  `outcome` (`eliminated` o `persistent-tie`), `eliminatedPlayerIds`, `reason` y
  `confirmedAt`. MUST excluir votos individuales, conteos y secretos. `participantIds` MUST ser
  canonico. `eliminated` MUST tener una lista no vacia y
  motivo `verbal-selection`, `first-count` o `tiebreak-count`; `persistent-tie` MUST tener
  motivo `second-tie` y lista vacia. `resultId` MUST identificar de forma estable el resultado.
- **FR-003**: Un empate persistente MUST producir victoria impostora por `persistent-tie`, sin
  eliminado ni intento.
- **FR-004**: Con `single`, IMP-8 MUST aplicar atomicamente todos los `eliminatedPlayerIds`.
  Cero impostores activos MUST producir victoria ciudadana; cualquiera activo MUST producir
  `impostors-escaped`.
- **FR-005**: Con `successive`, `eliminated` MUST contener exactamente un ID. Despues, `I = 0` produce
  victoria ciudadana; `I >= C` produce `impostor-parity`; `I > 0` e `I < C` continua.
- **FR-006**: Un impostor solo admite `single`; `successive` MUST activar modo seguro.
- **FR-007**: MUST cubrir uno, dos y tres impostores sin inferir identidades desde UI o votos.
  IMP-8 MUST derivar los jugadores activos conservando el orden de
  `participantIds` y excluyendo `eliminatedPlayerIds`; IMP-7 no entrega ni decide ese campo.
- **FR-008**: `finalAttempt: true` MUST crear un intento por impostor eliminado; los restantes casos
  MUST crear cero.
- **FR-009**: Varios intentos MUST ejecutarse individualmente en orden roster y empezar/terminar
  cubiertos.
- **FR-010**: Cada intento MUST confirmar respuesta no vacia o renuncia y persistir resultado antes
  de avanzar; despues MUST quedar bloqueado.
- **FR-011**: La comparacion MUST normalizar concepto y respuesta con Unicode NFKC, trim, espacios
  internos colapsados y mayusculas ignoradas con locale espanol.
- **FR-012**: Acierto o fallo MUST NOT cambiar ganador, motivo, eliminados, activos ni continuacion.
- **FR-013**: Con intentos pendientes, ninguna superficie compartida MUST mostrar concepto,
  respuestas, aciertos ni roles activos.
- **FR-014**: Una resolucion sucesiva no terminal MUST emitir un unico `NextCluePhaseRequest`
  durable con partida, ronda, siguiente fase, instante e IDs activos en orden roster.
- **FR-015**: MUST NOT emitir esa solicitud para `single`, terminal, empate, lista invalida o
  intentos pendientes.
- **FR-016**: Una continuacion MAY revelar el rol del eliminado, pero MUST ocultar concepto y roles
  de activos.
- **FR-017**: Solo despues de persistir un terminal y completar intentos MUST revelar ganador,
  motivo, concepto, todos los roles y resultados de intento.
- **FR-018**: Un terminal MUST producir un unico `RoundResolutionHandoff` durable hacia IMP-9 con
  identidad, ganador, motivo, eliminados, activos, roles finales e intentos.
- **FR-019**: La salida MUST ser Continuar hacia IMP-9. IMP-8 MUST NOT puntuar, mostrar marcador,
  preparar otra ronda, finalizar partida ni ejecutar revancha.
- **FR-020**: IMP-9 decide marcador, siguiente ronda, final y revancha. La siguiente ronda requiere
  nuevo draw de IMP-4 y snapshot de IMP-5.
- **FR-021**: Crear resolucion, confirmar intento y emitir cualquiera de las salidas MUST ser
  durable, atomico e idempotente.
- **FR-022**: Repetir igual intencion MUST devolver el mismo estado sin nueva revision; una
  transicion incompatible MUST devolver issue publico tipado.
- **FR-023**: Toda mutacion MUST respetar revision optimista y writer lease; un conflicto recarga
  sin reproducir la intencion obsoleta.
- **FR-024**: Recuperacion offline MUST restaurar intentos, decision, revelacion y salida sin
  reevaluar, comparar otra vez ni resolver de nuevo.
- **FR-025**: Reapertura con trabajo privado MUST comenzar cubierta; observer MUST ser read-only.
- **FR-026**: Datos incompatibles MUST activar modo seguro sin borrado. URL, navigation state,
  errores, consola y payloads publicos MUST excluir secretos no revelados; no habra telemetria.
- **FR-027**: UI MUST distinguir `loading`, `resolving`, `private-handoff`, `private-entry`,
  `saving-attempt`, `continuation-ready`, `terminal-reveal`, `storage-error`,
  `conflict-reload`, `observer` y `safe-mode`.
- **FR-028**: Textos MUST estar externalizados; UI MUST funcionar a 320 px, con foco, tacto,
  anuncios accesibles y sin depender solo del color.
- **FR-029**: La resolucion MUST funcionar offline tras primera carga y respetar el bundle vigente.

### Key Entities

- **VoteResolutionHandoff**: unico input publico de IMP-7 con version e identidad idempotente,
  participantes, eliminados simultaneos o empate persistente; no contiene votos, activos derivados
  ni secretos.
- **RoundResolutionSnapshot**: estado versionado con input, decision, intentos, revision y una salida.
- **FinalAttempt**: registro secreto individual con estado, respuesta o renuncia, acierto y fecha.
- **ResolutionDecision**: `continue` o `terminal`; terminal incluye ganador y motivo tipado.
- **NextCluePhaseRequest**: salida publica a IMP-6 ya definida por su contrato.
- **RoundResolutionHandoff**: salida terminal e idempotente a IMP-9 para puntuar y progresar.

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100 % de la matriz para uno, dos y tres impostores produce la decision esperada.
- **SC-002**: 100 % de empates persistentes termina en victoria impostora y crea cero intentos.
- **SC-003**: 100 % de impostores descubiertos con regla activa dispone como maximo de un intento;
  cero respuestas o aciertos se filtran entre jugadores.
- **SC-004**: 100 % de aciertos y fallos conserva la decision previa al intento.
- **SC-005**: 100 % de continuaciones validas entrega una unica solicitud correcta a IMP-6; cero
  terminales la emiten.
- **SC-006**: Cero conceptos o roles activos aparecen antes de un terminal durable.
- **SC-007**: 100 % de dobles comandos, reaperturas y conflictos conserva una resolucion, un intento
  por impostor y una salida.
- **SC-008**: 100 % de recuperaciones offline restaura sin reevaluar ni abrir secretos.
- **SC-009**: Todos los recorridos pasan teclado, semantica, contraste, privacidad y 320 px.

## Assumptions and dependencies

- IMP-7 entrega un `VoteResolutionHandoff` publico e idempotente conforme al mismo contrato.
- Empate persistente significa segundo empate confirmado; IMP-8 no ejecuta una tercera votacion.
- `single` puede entregar varios eliminados simultaneos y siempre cierra la ronda; `successive`
  entrega exactamente uno y puede solicitar otra fase cuando la matriz lo permita.
- El ultimo intento afecta puntuacion, no victoria, coherente con las reglas iniciales de IMP-9.
- ProposedUI solo aporta la idea de explicar resultado, roles, concepto e intento.
- IMP-6 prepara pistas. IMP-9 puntua y decide marcador, siguiente ronda, final y revancha.
- La nueva ronda usa nuevo contenido IMP-4 y roles IMP-5; no reutiliza secretos de la cerrada.
- No existe telemetria; privacidad se audita en URL, navegacion, errores, consola y payloads.
