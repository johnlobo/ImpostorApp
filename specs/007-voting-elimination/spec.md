# Feature Specification: Votacion, empates y eliminacion

**Feature Branch**: `007-voting-elimination`
**Created**: 2026-08-08
**Status**: Ready for implementation
**Jira Epic**: `IMP-7`

## Scope and boundaries

IMP-7 comienza cuando IMP-6 entrega un `CluePhaseHandoff` durable. Registra una decision verbal o
los votos secretos de los participantes elegibles, resuelve empates segun la configuracion
confirmada y produce un `VoteResolutionHandoff` durable para IMP-8.

IMP-7 no vuelve a abrir pistas, no cambia las reglas, no revela roles ni concepto, no comprueba si
la persona eliminada era impostora, no ejecuta el ultimo intento y no decide victoria, siguiente
fase o siguiente ronda. Esas decisiones pertenecen a IMP-8. Las pantallas `VotingScreen` y
`VoteTiebreakScreen` de `ProposedUI` son referencia de recorrido y jerarquia visual, no contrato de
dominio ni persistencia.

## User Scenarios & Testing

### User Story 1 - Registrar una decision verbal de eliminacion (Priority: P1)

Como anfitrion de una partida con votacion verbal, quiero registrar los sospechosos elegidos por el
grupo y confirmar la decision, para producir un resultado estable sin inventar votos individuales.

**Why this priority**: La votacion verbal es el valor inicial de IMP-3 y el camino minimo desde
pistas hasta una eliminacion.

**Independent Test**: Con un handoff valido y metodo verbal, confirmar entre uno y
`impostorCount` sospechosos en `single`, o exactamente uno en `successive`, persiste un unico
resultado antes de emitirlo hacia IMP-8.

**Acceptance Scenarios**:

1. **Given** una votacion verbal preparada, **When** se muestra la superficie compartida, **Then**
   presenta todos y solo los candidatos elegibles en orden canonico, sin votos ni secretos.
2. **Given** ningun sospechoso seleccionado, **When** el anfitrion intenta continuar, **Then** la
   confirmacion permanece deshabilitada.
3. **Given** resolucion `single`, **When** el anfitrion selecciona entre uno y
   `impostorCount` sospechosos elegibles distintos, **Then** puede confirmar su eliminacion
   simultanea en una sola decision agregada.
4. **Given** resolucion `successive`, **When** el anfitrion selecciona exactamente un sospechoso
   elegible, **Then** puede confirmar esa unica eliminacion.
5. **Given** una seleccion verbal valida, **When** el anfitrion confirma, **Then** el resultado y
   todos sus eliminados se persisten atomicamente antes de navegar o notificar a IMP-8.
6. **Given** una confirmacion fallida, **When** se informa el error, **Then** la votacion permanece
   abierta y ofrece reintento sin emitir resultado.
7. **Given** una eliminacion verbal ya confirmada, **When** se repite la accion, **Then** devuelve el
   mismo resultado sin una segunda escritura ni una segunda transicion.

---

### User Story 2 - Votar en secreto en un unico dispositivo (Priority: P1)

Como jugador, quiero emitir una sola eleccion privada pasando el movil, para que nadie conozca mi
voto antes del recuento y yo tampoco pueda modificarlo despues.

**Why this priority**: La privacidad y la irrevocabilidad definen el metodo secreto configurado en
IMP-3.

**Independent Test**: Cada votante elegible abre una vista privada cubierta y confirma una sola
papeleta: un sospechoso en `successive` o con un impostor, y entre uno e `impostorCount`
sospechosos distintos en `single` multi-impostor. Solo aparece completado despues de persistirla.

**Acceptance Scenarios**:

1. **Given** la lista compartida de voto secreto, **When** se renderiza, **Then** solo muestra nombre
   y estado pendiente/completado de cada votante, nunca candidatos elegidos, recuentos parciales,
   roles o concepto.
2. **Given** un votante pendiente, **When** abre su turno, **Then** accede a una vista privada
   cubierta antes de mostrar los candidatos.
3. **Given** la vista privada revelada, **When** muestra candidatos, **Then** incluye solo jugadores
   elegibles distintos del propio votante; el auto-voto no puede representarse ni confirmarse.
4. **Given** `single` con dos o tres impostores, **When** el votante completa su papeleta, **Then**
   selecciona entre uno y esa cantidad de sospechosos distintos en una unica papeleta.
5. **Given** `successive` o un impostor, **When** el votante completa su papeleta, **Then**
   selecciona exactamente un sospechoso.
6. **Given** una seleccion privada, **When** el jugador la confirma, **Then** la papeleta se persiste de
   forma durable antes de marcarle como completado, ocultar la seleccion y volver a la lista.
7. **Given** un votante completado, **When** recarga, navega atras o pulsa dos veces, **Then** no puede
   consultar ni cambiar su voto.
8. **Given** menos de N/N votos confirmados, **When** se intenta contar, **Then** el recuento permanece
   bloqueado; al llegar a N/N se habilita una confirmacion explicita del recuento.

---

### User Story 3 - Resolver el recuento y un desempate (Priority: P1)

Como grupo, quiero que el recuento aplique una regla de empate predecible, para conocer si existe
una eliminacion sin revelar elecciones individuales.

**Why this priority**: Un empate impide producir el resultado que necesita IMP-8 y debe cerrarse de
forma determinista.

**Independent Test**: El recuento llena uno o `impostorCount` puestos segun la regla. Un empate que
cruza el corte abre una segunda papeleta solo para los candidatos empatados; si vuelve a impedir
llenar exactamente los puestos pendientes, produce `persistent-tie` con cero eliminados.

**Acceptance Scenarios**:

1. **Given** `successive` o un impostor y todos los votos confirmados, **When** existe un maximo
   unico, **Then** se elimina exactamente ese candidato.
2. **Given** `single` multi-impostor sin empate en el corte, **When** se confirma el recuento,
   **Then** se eliminan simultaneamente hasta `impostorCount` candidatos con aprobacion positiva.
3. **Given** un empate que cruza el ultimo puesto disponible, **When** se prepara el desempate,
   **Then** se conservan provisionalmente los candidatos situados estrictamente por encima del
   corte, todos los votantes vuelven a votar y los unicos candidatos son quienes empataron en el
   corte.
4. **Given** un votante candidato del desempate, **When** abre su papeleta, **Then** no puede
   seleccionarse a si mismo y el numero exigido es el menor entre puestos pendientes y candidatos
   validos disponibles para ese votante.
5. **Given** que el desempate permite llenar sin ambiguedad todos los puestos pendientes, **When**
   se confirma, **Then** se persiste atomicamente el conjunto provisional y el del desempate.
6. **Given** que el segundo recuento aun no permite llenar exactamente los puestos pendientes,
   **When** se confirma, **Then** se descarta el conjunto provisional y se persiste
   `persistent-tie`, motivo `second-tie`, con cero eliminados y sin tercera papeleta.
7. **Given** cualquier recuento confirmado, **When** se muestra el resultado compartido, **Then** no
   atribuye votos a personas ni revela roles, concepto o si la eliminacion favorece a un bando.

---

### User Story 4 - Entregar eliminaciones sucesivas sin decidir la victoria (Priority: P2)

Como motor de juego con varios impostores y resolucion sucesiva, quiero entregar cada resultado a
IMP-8, para que esa epica decida si termina la ronda o autoriza otra fase sin que IMP-7 infiera el
estado secreto.

**Why this priority**: Solo aplica a configuraciones multi-impostor `successive`; el flujo de una
sola eliminacion queda cubierto por las historias anteriores.

**Independent Test**: Tras cada resultado durable, IMP-7 se cierra. Solo un nuevo
`CluePhaseHandoff` emitido despues de la decision de IMP-8 puede abrir otra votacion con el nuevo
conjunto elegible.

**Acceptance Scenarios**:

1. **Given** resolucion `single`, **When** IMP-7 confirma una eliminacion simultanea o empate
   persistente, **Then** emite un resultado cerrado y no acepta otra papeleta para esa fase.
2. **Given** resolucion `successive`, **When** IMP-7 confirma un resultado, **Then** lo entrega a
   IMP-8 sin comprobar rol, victoria ni lista de supervivientes.
3. **Given** que IMP-8 determina que la ronda continua, **When** IMP-6 completa otra fase y entrega
   un nuevo handoff, **Then** IMP-7 crea una votacion distinta usando exactamente sus elegibles.
4. **Given** una persona eliminada en una fase anterior, **When** no aparece en el nuevo handoff,
   **Then** no es votante ni candidata; IMP-7 no reconstruye por su cuenta esa exclusión.
5. **Given** `persistent-tie` por segundo empate, **When** IMP-8 lo consume, **Then** IMP-7 no decide
   si corresponde continuar, terminar o conceder victoria.

---

### User Story 5 - Recuperar una votacion sin filtrar decisiones (Priority: P2)

Como grupo jugando offline, quiero recuperar una votacion interrumpida con sus votos confirmados,
para continuar sin repetir elecciones ni mostrar informacion privada.

**Why this priority**: El flujo debe mantener las garantias offline, de escritor unico y de
recuperacion estable de las epicas anteriores.

**Independent Test**: Reabrir en cualquier estado restaura la superficie compartida, papeleta y
resultado durables; nunca reabre una vista privada ni repite una intencion obsoleta.

**Acceptance Scenarios**:

1. **Given** votos secretos confirmados parcialmente, **When** se reabre offline, **Then** conserva
   quienes completaron sin mostrar sus selecciones y presenta primero la lista compartida.
2. **Given** una escritura de voto o resultado interrumpida, **When** se recupera, **Then** prevalece
   el ultimo snapshot confirmado y se ofrece una accion consciente de reintento.
3. **Given** un conflicto de revision, **When** se recarga el snapshot vigente, **Then** la accion
   obsoleta no se reproduce automaticamente.
4. **Given** modo observador, **When** se consulta una votacion, **Then** solo se ve la proyeccion
   compartida y no existen controles para abrir papeleta, votar, contar o confirmar.
5. **Given** datos incompatibles o parciales, **When** se recuperan, **Then** la aplicacion entra en
   modo seguro sin borrar datos ni incluir votos o secretos en el error.

### Edge Cases

- Un handoff contiene cero participantes, IDs duplicados o IDs ajenos al roster confirmado.
- Solo queda un participante elegible y no existe candidato distinto para evitar auto-voto.
- En un desempate de dos candidatos, uno de ellos abre su papeleta y solo puede elegir al otro.
- Un voto se persiste mientras el usuario pulsa dos veces o la app pasa a segundo plano.
- Dos pestanas intentan registrar el mismo votante o confirmar el mismo recuento con igual revision.
- Una pestana cuenta mientras otra todavia muestra un estado público anterior.
- Un fallo ocurre despues de seleccionar pero antes de confirmar durablemente el voto.
- El primer recuento empata entre todos los candidatos elegibles.
- El segundo recuento vuelve a empatar con un subconjunto distinto de totales pero los mismos
  candidatos permitidos.
- Se recupera un resultado cerrado junto a una vista privada indicada en navigation state.
- Una entrada manipulada intenta auto-voto, votar dos veces o elegir un candidato fuera de papeleta.
- Un observador intenta invocar directamente un comando de escritura.

## Requirements

### Functional Requirements

- **FR-001**: IMP-7 MUST consumir un `CluePhaseHandoff` durable de IMP-6 y la configuracion
  confirmada asociada; MUST NOT reabrir ni modificar la fase de pistas.
- **FR-002**: Cada votacion MUST tener identidad estable por partida, ronda y numero de fase, y MUST
  validar que el handoff y sus participantes pertenecen a la misma partida confirmada.
- **FR-003**: La primera papeleta MUST usar los `participantIds` del handoff, en orden canonico,
  como votantes y candidatos. `successive` o un unico impostor MUST definir un puesto;
  `single` con varios impostores MUST definir hasta `impostorCount` puestos simultaneos.
- **FR-004**: Ningun votante MUST poder seleccionarse a si mismo. Una papeleta con votante o
  candidato no elegible, ID duplicado, auto-seleccion, cantidad incorrecta o votante completado MUST
  rechazarse sin escritura parcial.
- **FR-005**: Con metodo verbal, `successive` MUST exigir exactamente un sospechoso y `single`
  MUST admitir entre uno e `impostorCount` sospechosos distintos en una unica decision agregada;
  IMP-7 MUST NOT fabricar votos individuales.
- **FR-006**: Con metodo secreto, cada votante elegible MUST registrar una papeleta privada e
  irrevocable. MUST seleccionar un sospechoso para un puesto y entre uno e `impostorCount`
  sospechosos distintos para `single` multi-impostor.
- **FR-007**: Una papeleta privada MUST comenzar cubierta; al cerrarla, la seleccion y sus candidatos
  MUST desmontarse del DOM antes de volver a la superficie compartida.
- **FR-008**: Confirmar un voto secreto MUST persistirlo antes de marcar al votante como completado,
  cerrar la papeleta o mostrar cualquier efecto de exito.
- **FR-009**: Un voto confirmado MUST ser irrevocable y no debe poder consultarse, repetirse ni
  cambiarse mediante navegacion, recarga, doble pulsacion o entrada manipulada.
- **FR-010**: La superficie compartida MUST mostrar solo el progreso pendiente/completado; MUST NOT
  mostrar seleccion individual, recuento parcial, rol, categoria, concepto o compañeros impostores.
- **FR-011**: El recuento secreto MUST permanecer bloqueado hasta N/N votos durables y MUST requerir
  confirmacion explicita antes de cerrar la papeleta.
- **FR-012**: El recuento MUST sumar una aprobacion por cada candidato incluido en una papeleta y
  MUST ignorar candidatos con cero aprobaciones. El numero de puestos efectivos MUST ser el menor
  entre `impostorCount` y los candidatos con aprobacion positiva. Si el orden descendente permite
  llenar esos puestos sin empate en el corte, MUST producirlos como un unico conjunto eliminado.
- **FR-013**: Un empate que cruza el ultimo puesto MUST crear exactamente un desempate. Los
  candidatos estrictamente por encima del corte quedan provisionales, los candidatos del desempate
  son solo los empatados y todos los participantes siguen siendo votantes.
- **FR-014**: Cada papeleta de desempate MUST seleccionar el menor entre puestos pendientes y
  candidatos validos distintos del votante. Ser candidato no elimina el derecho a votar y la
  prohibicion de auto-seleccion permanece.
- **FR-015**: Si el desempate llena sin ambiguedad los puestos pendientes, MUST unirlos al conjunto
  provisional y confirmar todos los eliminados atomicamente. Si persiste el empate de corte, MUST
  descartar el conjunto provisional y producir `persistent-tie`, motivo `second-tie`, con
  `eliminatedPlayerIds: []` y sin tercera papeleta.
- **FR-016**: Los votos de una papeleta anterior MUST quedar cerrados y MUST NOT reutilizarse como
  votos de desempate.
- **FR-017**: El unico contrato hacia IMP-8 MUST ser `VoteResolutionHandoff` con
  `schemaVersion`, `resultId`, `gameId`, `roundNumber`, `phaseNumber`, `participantIds`,
  `outcome` (`eliminated` o `persistent-tie`), `eliminatedPlayerIds`, `reason` y
  `confirmedAt`. MUST NOT contener votos individuales, conteos privados, activos derivados ni
  secretos. `participantIds` MUST conservar el orden canonico del `CluePhaseHandoff`.
  `eliminated` MUST tener una lista no vacia y motivo `verbal-selection`, `first-count` o
  `tiebreak-count`; `persistent-tie` MUST tener motivo `second-tie` y lista eliminada vacia.
  `resultId` MUST ser estable para el resultado confirmado de esa fase.
- **FR-018**: Repetir confirmacion de voto, recuento o resultado ya durable MUST ser idempotente y
  MUST NOT crear escrituras, resultados o navegaciones duplicadas.
- **FR-019**: Fallos de persistencia MUST conservar el ultimo snapshot confirmado y MUST NOT marcar
  votos como completados ni emitir resultados hasta completar la escritura durable.
- **FR-020**: Conflictos de revision MUST recargar el snapshot vigente sin reproducir automaticamente
  la intencion obsoleta; el permiso de escritor MUST aplicarse a todo comando.
- **FR-021**: En modo observador IMP-7 MUST ser estrictamente de solo lectura, limitarse a la
  proyeccion compartida y no abrir superficies privadas.
- **FR-022**: La recuperacion offline MUST conservar papeleta, progreso, votos confirmados y resultado
  sin reabrir una vista privada ni revelar elecciones.
- **FR-023**: Datos futuros, incompatibles o parciales MUST activar modo seguro sin borrado
  automatico. URL, navigation state, errores publicos, consola capturada y payloads publicos MUST
  excluir votos individuales, roles, concepto y categoria.
- **FR-024**: Con `single`, una decision verbal MUST eliminar entre uno e `impostorCount`
  sospechosos y un recuento secreto sin empate MUST eliminar entre uno e `impostorCount`;
  cualquiera de sus resultados MUST cerrar IMP-7 para esa fase.
- **FR-025**: Con `successive`, `eliminated` MUST contener exactamente un ID. IMP-7 MUST
  entregar el handoff a IMP-8 y esperar otro `CluePhaseHandoff`; MUST NOT inferir activos, preparar
  pistas ni abrir otra votacion.
- **FR-026**: IMP-7 MUST NOT comprobar roles, resolver victoria, ejecutar ultimo intento, revelar el
  concepto, puntuar ni decidir siguiente fase/ronda; esas responsabilidades pertenecen a IMP-8/IMP-9.
  En ciclos successive MUST preservar el `ResolutionLedger` versionado de IMP-8 como payload opaco,
  sin proyectarlo, inspeccionarlo ni mutarlo.
- **FR-027**: Las pantallas MUST distinguir `loading`, lista compartida, papeleta privada cubierta,
  papeleta privada activa, `saving-vote`, listo para recuento, `counting`, desempate, resultado,
  error recuperable, observador y modo seguro, sin exponer controles incompatibles con cada estado.
- **FR-028**: Todos los textos visibles MUST estar externalizados; la interfaz MUST funcionar en
  vertical a 320 px con foco visible, controles tactiles, dialogos accesibles y anuncios de progreso
  y errores que no verbalicen votos individuales.
- **FR-029**: Toda la votacion MUST funcionar offline tras la primera carga y respetar el presupuesto
  de bundle vigente; IMP-7 MUST NOT introducir telemetria.

### Key Entities

- **VotingSnapshot**: estado versionado y durable de una votacion, con identidad, metodo, elegibles,
  papeleta activa, progreso, revision y resultado cerrado.
- **Ballot**: primera papeleta o desempate; conserva votantes elegibles, candidatos permitidos y
  estado abierto/cerrado sin exponer elecciones en su proyeccion publica.
- **SecretVote**: conjunto durable e irrevocable de uno o mas candidatos asociado a un votante y una
  papeleta, disponible solo para recuento interno.
- **PublicVotingProgress**: proyeccion compartida con nombres y estado pendiente/completado, sin voto.
- **VoteTally**: conteo interno confirmado que ordena aprobaciones, identifica el corte, puestos
  provisionales y candidatos empatados.
- **VoteResolutionHandoff**: unico handoff publico e idempotente hacia IMP-8, con participantes,
  eliminados simultaneos o empate persistente, sin interpretar activos, roles ni victoria.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100 % de papeletas aceptadas contiene la cantidad exigida de candidatos elegibles
  distintos; se aceptan cero auto-selecciones, duplicados o candidatos fuera de papeleta.
- **SC-002**: El 100 % de votos confirmados permanece irrevocable tras doble pulsacion, navegacion,
  recarga, conflicto o reapertura offline.
- **SC-003**: Cero superficies compartidas, URLs, estados de navegacion, errores, logs o payloads
  publicos contienen elecciones individuales, roles, categoria o concepto.
- **SC-004**: El 100 % de recuentos se inicia con N/N votos durables y produce un unico resultado
  durable antes de cualquier transicion.
- **SC-005**: El 100 % de empates de corte limita candidatos a los empatados y conserva todos los
  votantes; el 100 % de segundos empates produce cero eliminados y termina sin tercera papeleta.
- **SC-006**: El 100 % de fallos de escritura y conflictos conserva el ultimo estado confirmado y
  emite cero resultados prematuros o duplicados.
- **SC-007**: El 100 % de reaperturas offline restaura progreso y resultado sin reabrir papeletas
  privadas ni permitir repetir votos.
- **SC-008**: El 100 % de vistas observer carece de comandos y contiene solo la proyeccion publica.
- **SC-009**: Los recorridos verbal, secreto, desempate, segundo empate y successive pasan controles
  automatizados de teclado, semantica, privacidad y ausencia de overflow a 320 px.

## Assumptions and dependencies

- IMP-3 aporta `voting` (`verbal` o `secret`) y `elimination` (`single` o `successive`) ya confirmados.
- IMP-6 aporta participantes elegibles en orden canonico mediante `CluePhaseHandoff`; IMP-7 no usa
  el orden de turnos de pistas para ordenar o filtrar papeletas.
- En desempate cambian solo los candidatos: todos los participantes elegibles conservan derecho a
  voto, sujeto a la prohibicion de auto-voto.
- El segundo empate cierra IMP-7 como `persistent-tie`, motivo `second-tie`, con cero
  eliminados; IMP-8 decide sus consecuencias.
- En voto secreto `single`, cada candidato incluido recibe una aprobacion y se intentan llenar
  hasta `impostorCount` puestos con aprobacion positiva. Ninguna eliminacion provisional se
  confirma si persiste el empate en el corte.
- IMP-8 dispone del estado secreto interno necesario para interpretar al eliminado, resolver
  victoria, ultimo intento y, si procede, emitir continuidad hacia IMP-6.
- `ProposedUI` orienta la separacion entre lista compartida y papeleta privada, pero su tally local,
  sus empatados de muestra y su navegacion directa no son comportamiento normativo.
