# Feature Specification: Desarrollo de rondas, pistas y temporizador

**Feature Branch**: `006-round-clues-timer`  
**Created**: 2026-08-08  
**Status**: Ready for implementation
**Jira Epic**: `IMP-6`

## Scope and boundaries

IMP-6 comienza cuando IMP-5 entrega un `RoundHandoff` despues de que todos los jugadores hayan consultado su rol. Gestiona exclusivamente la fase compartida de pistas y conversacion: resuelve el orden aplicable, mantiene un temporizador opcional, permite cerrar la fase y produce una entrega publica estable hacia IMP-7.

IMP-6 no registra votos, no decide empates, no elimina jugadores y no revela roles; esas responsabilidades pertenecen a IMP-7. Tampoco determina ganadores, ofrece el ultimo intento, revela el concepto ni inicia la siguiente ronda; esas responsabilidades pertenecen a IMP-8.

La epica consume sin reinterpretar la configuracion confirmada en `PreparedGame`. En particular, la conversacion temporizada usa sus segundos ya validados (30 a 600, en pasos de 30). IMP-6 no ofrece presets ni permite cambiar la duracion. Los valores de 1, 2, 3, 5 o 10 minutos mencionados en Jira ya pueden llegar como segundos confirmados; ampliar los accesos rapidos de la pantalla de configuracion pertenece a una mejora separada de IMP-3.

## User Scenarios & Testing

### User Story 1 - Comenzar una fase de pistas con un orden estable (Priority: P1)

Como grupo que ya conoce sus roles, quiero comenzar la fase de pistas con instrucciones coherentes con el orden configurado, para saber quien participa y cual es la siguiente accion sin mostrar ningun secreto en la pantalla compartida.

**Why this priority**: Es el punto de entrada de toda ronda jugable y la base que consumen el temporizador y la votacion posterior.

**Independent Test**: Dado un `RoundHandoff` y su `PreparedGame`, iniciar la fase una vez produce el mismo orden publico durable en lecturas y reaperturas posteriores, sin incluir roles ni concepto.

**Acceptance Scenarios**:

1. **Given** `turnOrder: roster`, **When** comienza la fase, **Then** los jugadores elegibles se presentan en el orden confirmado del roster y el primer jugador es el primero de esa lista.
2. **Given** `turnOrder: random`, **When** comienza la fase con una fuente aleatoria inyectada, **Then** se confirma una permutacion Fisher-Yates completa, sin repeticiones, y su primer elemento es quien comienza.
3. **Given** `turnOrder: free`, **When** comienza la fase, **Then** se informa que la participacion es libre sin inventar un primer jugador, speaker activo ni una secuencia obligatoria.
4. **Given** una fase ya confirmada, **When** se repite la accion de inicio, **Then** se recupera el mismo estado sin volver a consumir aleatoriedad ni crear otra fase.
5. **Given** cualquier orden, **When** se muestra en una superficie compartida, **Then** contiene unicamente nombres, posiciones e instrucciones publicas, nunca concepto, rol o companeros.
6. **Given** orden roster o random, **When** un jugador completa su pista y el anfitrion avanza, **Then** el turno actual pasa durablemente al siguiente ID de la secuencia y los anteriores quedan marcados como completados.
7. **Given** el ultimo turno gestionado, **When** se avanza, **Then** la pantalla pasa a conversacion general sin inventar mas participantes; el temporizador, si existe, continua con el mismo deadline.

---

### User Story 2 - Controlar una conversacion libre o temporizada (Priority: P1)

Como grupo, quiero conversar sin limite o con el tiempo configurado y poder pausar y reanudar un temporizador, para mantener el ritmo acordado aunque la aplicacion pase a segundo plano.

**Why this priority**: El control de duracion es el comportamiento central expresado por IMP-6.

**Independent Test**: Una fase temporizada parte exactamente de los segundos de `PreparedGame`, conserva su deadline tras reapertura, pausa sin perder tiempo y al expirar muestra un aviso sin avanzar automaticamente; una fase libre nunca expira por reloj.

**Acceptance Scenarios**:

1. **Given** conversacion libre, **When** transcurre cualquier periodo, **Then** la fase permanece activa hasta que el anfitrion ejecuta la accion explicita de terminar pistas.
2. **Given** conversacion temporizada, **When** comienza la fase, **Then** el contador usa exactamente `PreparedGame.conversation.seconds`, incluidos valores personalizados validos.
3. **Given** un temporizador activo, **When** el anfitrion lo pausa, **Then** el tiempo restante se conserva de forma durable y no disminuye hasta una reanudacion explicita.
4. **Given** un temporizador pausado, **When** se reanuda, **Then** continua desde el tiempo restante confirmado y no reinicia la duracion completa.
5. **Given** un temporizador activo, **When** la app queda oculta o se cierra y pasa tiempo real, **Then** al volver se calcula el restante desde el deadline confirmado sin depender de ticks ejecutados en segundo plano.
6. **Given** que el tiempo llega a cero, **When** se actualiza la superficie compartida, **Then** se muestra un aviso accesible y la fase queda expirada, pero no navega ni vota automaticamente.
7. **Given** una fase expirada, **When** el anfitrion decide continuar, **Then** debe usar la misma accion explicita de terminar pistas que en una fase libre.
8. **Given** cualquier estado del temporizador, **When** se muestran sus controles, **Then** no existe una accion para reiniciar o ampliar la duracion confirmada.

---

### User Story 3 - Terminar las pistas y entregar una fase segura a votacion (Priority: P1)

Como anfitrion, quiero cerrar manualmente las pistas y avanzar a votacion una sola vez, para que IMP-7 reciba un estado publico completo sin filtrar el concepto ni los roles.

**Why this priority**: Sin una salida durable e idempotente, la fase no puede integrarse con el siguiente paso del juego.

**Independent Test**: Desde una fase activa, pausada o expirada, confirmar su cierre produce el mismo handoff publico en intentos repetidos y nunca incluye contenido secreto.

**Acceptance Scenarios**:

1. **Given** una fase activa, pausada o expirada, **When** el anfitrion pulsa terminar pistas, **Then** se solicita confirmacion para evitar cierres accidentales.
2. **Given** la confirmacion aceptada, **When** se guarda el cierre, **Then** la fase deja de aceptar inicio, pausa o reanudacion y entrega a IMP-7 su partida, ronda, numero de fase, participantes elegibles en orden canonico de roster, instante y motivo de cierre (`manual` o `timer-expired`).
3. **Given** una entrega ya confirmada, **When** se repite la accion, **Then** se obtiene el mismo resultado sin una segunda escritura ni una segunda navegacion.
4. **Given** cualquier entrega hacia IMP-7, **When** se inspeccionan sus datos publicos, **Then** no contiene concepto, categoria, roles, companeros impostores ni votos.
5. **Given** un fallo de persistencia, **When** se intenta cerrar la fase, **Then** se conserva la fase anterior y se ofrece reintento sin avanzar a IMP-7.

---

### User Story 4 - Recuperar la fase offline de forma predecible (Priority: P2)

Como grupo jugando offline, quiero reabrir una fase de pistas conservando orden, estado y tiempo, para continuar sin reiniciar la ronda ni cambiar quien comienza.

**Why this priority**: La recuperacion es obligatoria para la plataforma, aunque depende de que la fase basica ya exista.

**Independent Test**: Cerrar y reabrir offline una fase en cada estado restaura su proyeccion publica y sus comandos validos sin volver a ejecutar RNG ni superar el maximo restante del ultimo comando durable.

**Acceptance Scenarios**:

1. **Given** una fase activa, **When** se reabre offline, **Then** conserva orden, turno actual y completados, y calcula el tiempo desde el deadline durable sin superar `maximumRemainingSeconds`.
2. **Given** una fase pausada, **When** se reabre offline, **Then** conserva exactamente el restante confirmado y permanece pausada.
3. **Given** una fase cerrada, **When** se reabre, **Then** conserva el mismo handoff y no permite volver a mutar la fase.
4. **Given** un conflicto de revision, **When** se recarga el estado, **Then** prevalece el ultimo snapshot confirmado y la accion obsoleta no se repite automaticamente.
5. **Given** modo observador, **When** se consulta la fase, **Then** solo se muestra la proyeccion publica y no se ofrecen comandos de inicio, pausa, reanudacion o cierre.
6. **Given** datos incompatibles o incompletos, **When** se recuperan, **Then** la aplicacion entra en modo seguro sin borrar datos ni incluir secretos en el error.

---

### User Story 5 - Preparar fases de pistas sucesivas sin resolver eliminaciones (Priority: P2)

Como motor de juego, quiero poder iniciar otra fase de pistas con una lista elegible ya resuelta por una epica posterior, para admitir eliminaciones sucesivas sin duplicar la logica de orden y tiempo.

**Why this priority**: Solo afecta a configuraciones multi-impostor con eliminacion sucesiva y debe preservar el limite de responsabilidad entre IMP-6, IMP-7 e IMP-8.

**Independent Test**: Entregando una lista valida de IDs elegibles y un numero de fase siguiente, IMP-6 crea una fase independiente con nuevo orden random cuando corresponde, sin decidir quien fue eliminado ni evaluar condiciones de victoria.

**Acceptance Scenarios**:

1. **Given** un `NextCluePhaseRequest` producido por IMP-8 tras consumir el resultado de IMP-7 y confirmar que la partida continua, **When** se prepara la fase siguiente, **Then** solo participan esos IDs y su orden se resuelve segun `PreparedGame`.
2. **Given** orden aleatorio, **When** se inicia otra fase, **Then** confirma una nueva permutacion Fisher-Yates determinista con RNG inyectable sin alterar fases anteriores.
3. **Given** una lista vacia, duplicada, con IDs ajenos o que no reduce estrictamente los participantes de la fase anterior, **When** se intenta preparar, **Then** se rechaza sin persistir estado parcial.
4. **Given** una peticion de fase sucesiva, **When** IMP-7 todavia no ha confirmado sus elegibles, **Then** IMP-6 no infiere eliminaciones ni permite crearla.
5. **Given** fases sucesivas validas, **When** se consulta el historial recuperable, **Then** cada handoff mantiene identidad y cierre propios, y la cantidad total no puede superar el roster inicial.

### Edge Cases

- El reloj del dispositivo avanza o retrocede durante una fase temporizada.
- La aplicacion se cierra exactamente mientras confirma pausa, reanudacion o cierre.
- Dos pestanas intentan pausar o cerrar con la misma revision.
- El tiempo expira mientras el dialogo de confirmacion de cierre esta abierto.
- Una reanudacion llega cuando otra pestana ya cerro la fase.
- La duracion configurada es un valor personalizado valido que no aparece como preset visual.
- `turnOrder: random` recibe 0, 1 o un valor fuera del intervalo desde la fuente RNG.
- Una fase sucesiva contiene un solo jugador elegible.
- Una reapertura encuentra un handoff de IMP-5 valido pero ningun snapshot de fase aun confirmado.
- El modo observador pierde y recupera conectividad mientras el escritor cambia de pestana.
- El reloj entrega un valor no finito; un valor anterior a `confirmedAt` queda limitado por el maximo durable y no se trata como prueba de manipulacion.

## Requirements

### Functional Requirements

- **FR-001**: IMP-6 MUST consumir un `RoundHandoff` valido de IMP-5 y el `PreparedGame` asociado; MUST NOT volver a asignar roles, sortear contenido ni completar revelaciones.
- **FR-002**: Cada fase MUST tener identidad estable compuesta por partida, ronda y numero de fase. El `RoundHandoff` MUST abrir primero una superficie `ready`; la accion explicita Comenzar pistas MUST persistir la fase y, si corresponde, su deadline antes de habilitar comandos de ejecucion.
- **FR-003**: Con `turnOrder: roster`, la secuencia MUST conservar el orden de jugadores elegibles del roster y MUST identificar al primero de esa secuencia.
- **FR-004**: Con `turnOrder: random`, la secuencia MUST ser una permutacion Fisher-Yates completa sin duplicados, creada una sola vez por fase mediante RNG inyectable; su primer elemento MUST ser quien comienza y la secuencia MUST recuperarse sin repetir RNG.
- **FR-005**: Con `turnOrder: free`, la aplicacion MUST comunicar participacion libre y MUST NOT presentar un primer jugador, speaker activo ni secuencia como obligatorios.
- **FR-006**: Toda superficie compartida MUST excluir concepto, categoria, roles, companeros impostores y votos.
- **FR-007**: IMP-6 MUST consumir `PreparedGame.conversation` como unica fuente de modo y duracion; MUST NOT reinterpretar presets ni ampliar sus limites validados por IMP-3.
- **FR-008**: Una conversacion libre MUST permanecer activa hasta un cierre manual confirmado.
- **FR-009**: Una conversacion temporizada MUST iniciar con los segundos confirmados y representar el tiempo activo mediante un deadline durable, no mediante la acumulacion de ticks.
- **FR-010**: Pausar MUST conservar de forma durable el restante calculado y reanudar MUST crear un nuevo deadline desde ese restante sin reiniciar la duracion.
- **FR-011**: Mientras un temporizador esta activo, el tiempo real transcurrido en background o con la aplicacion cerrada MUST descontarse al reabrir.
- **FR-012**: Llegar a cero MUST producir un estado expirado y un aviso accesible; MUST NOT cerrar la fase, navegar ni iniciar una votacion automaticamente.
- **FR-013**: Terminar pistas MUST ser una accion explicita disponible para conversacion libre y para temporizador activo, pausado o expirado, y MUST requerir confirmacion.
- **FR-014**: El cierre confirmado MUST ser durable e idempotente y MUST bloquear mutaciones posteriores de esa fase.
- **FR-015**: El handoff hacia IMP-7 MUST contener solo partida, ronda, numero de fase, IDs elegibles en el orden canonico del roster, instante y motivo de cierre; un cierre persistido desde estado expirado MUST usar `timer-expired` y cualquier otro MUST usar `manual`. El handoff MUST NOT interpretar el orden canonico como turnos en modo `free` y MUST NOT contener ningun secreto ni voto.
- **FR-016**: Un fallo de persistencia MUST conservar el ultimo estado confirmado y MUST NOT emitir un handoff hasta que el cierre sea durable.
- **FR-017**: Inicio, pausa, reanudacion y cierre MUST respetar revision optimista y permiso de escritor; un observador MUST ser estrictamente de solo lectura.
- **FR-018**: La recuperacion offline MUST restaurar orden, turno actual, completados, estado, restante o deadline y handoff sin repetir RNG. El restante calculado MUST estar limitado por `maximumRemainingSeconds` del ultimo comando durable; un ajuste hacia atras del reloj civil puede recuperar tiempo observado dentro de ese limite y no puede distinguirse de forma fiable tras reload.
- **FR-019**: Datos futuros, incompatibles o parciales MUST activar modo seguro sin borrado automatico. URL, navigation state, `PublicPlatformError`, consola capturada y payloads publicos serializados MUST excluir secretos; IMP-6 MUST NOT introducir telemetria.
- **FR-020**: IMP-6 MUST aceptar para una fase sucesiva un `NextCluePhaseRequest` emitido por IMP-8 despues de consumir el resultado de IMP-7 y confirmar que no existe victoria; MUST validar numero de fase e IDs elegibles contra el roster sin inferir eliminaciones. Los elegibles MUST formar un subconjunto estricto de los participantes anteriores, con al menos un ID menos.
- **FR-021**: Una fase sucesiva invalida MUST fallar sin escritura parcial; una valida MUST conservar
  fase activa, handoffs cerrados minimos y el `ResolutionLedger` versionado de IMP-8 como payload
  opaco hasta el siguiente consumidor, sin proyectarlo ni retener snapshots temporales completos.
- **FR-022**: IMP-6 MUST NOT registrar votos, resolver empates, elegir eliminados ni excluir candidatos por cuenta propia; todo ello pertenece a IMP-7.
- **FR-023**: IMP-6 MUST NOT revelar roles o concepto, evaluar victoria, ejecutar ultimo intento, iniciar revancha ni decidir la siguiente ronda; todo ello pertenece a IMP-8.
- **FR-024**: Todos los comandos MUST ser idempotentes ante doble pulsacion. Repetir pausa sobre una fase pausada o reanudacion sobre una fase activa MUST ser no-op sin nueva revision; un comando incompatible MUST devolver un issue publico tipado y un conflicto stale MUST recargar el ultimo snapshot sin repetir automaticamente la intencion obsoleta.
- **FR-025**: Todos los textos visibles MUST estar externalizados y la interfaz MUST funcionar en vertical a 320 px, con foco visible, controles tactiles y anuncios accesibles del temporizador.
- **FR-026**: La fase completa MUST funcionar offline tras la primera carga y MUST mantener el presupuesto de bundle vigente.
- **FR-027**: En orden roster o random, la fase MUST persistir `currentTurnIndex` y
  `completedCluePlayerIds` desde ready; avanzar MUST seguir estrictamente la secuencia y usar el
  indice observado como token idempotente, nunca como destino seleccionable. En free ambos campos
  MUST permanecer neutrales.
- **FR-028**: La experiencia MUST incluir estados compartidos diferenciados `ready`, pistas activas, conversacion general, temporizador pausado, expirado, confirmacion de cierre, error/retry y cerrado. La cabecera MUST mostrar ronda actual/total; la zona principal MUST mostrar politica de orden, turno actual o instruccion libre, secuencia publica y reloj cuando aplique; el CTA inferior MUST reflejar la unica accion primaria valida.
- **FR-029**: IMP-6 MUST exponer una capability/slot publica para el menu de partida en superficies
  compartidas y MUST ocultarla en cualquier superficie privada. IMP-10 es el unico owner que
  renderiza control, dialogos y comandos de pausa/continuidad/abandono; IMP-6 MUST NOT duplicarlos ni
  implementar un reset del temporizador.

### Key Entities

- **CluePhaseSnapshot**: estado versionado y durable de una fase; referencia la partida y ronda, contiene elegibles, orden publico, turno actual, pistas completadas, modo de conversacion, estado temporal, revision y cierre.
- **TurnSequence**: proyeccion publica del orden `roster` o `random`, o participacion `free` sin secuencia obligatoria.
- **ConversationClock**: estado `untimed`, `running`, `paused` o `expired`, representado por deadline o restante durable segun corresponda.
- **CluePhaseHandoff**: entrega publica e idempotente hacia IMP-7 despues del cierre confirmado; sus IDs conservan el orden canonico del roster, separado de cualquier orden de turnos.
- **EligibleRoster**: subconjunto canonico de IDs; la primera fase usa el roster completo de `PreparedGame` y las fases sucesivas usan el `NextCluePhaseRequest` autorizado por IMP-8.
- **NextCluePhaseRequest**: solicitud publica de IMP-8 con partida, ronda, siguiente numero de fase e IDs elegibles, emitida solo despues de resolver IMP-7 y descartar victoria.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100 % de fases con orden roster, random o free coincide con la politica confirmada; ninguna reapertura cambia un orden ya persistido.
- **SC-002**: El 100 % de temporizadores usa exactamente la duracion de `PreparedGame` y conserva el restante correcto con una tolerancia de un segundo tras pausa, background y reapertura.
- **SC-003**: El 100 % de fases libres permanece activa hasta una confirmacion manual.
- **SC-004**: Cero expiraciones causan navegacion o votacion automatica en la matriz de pruebas.
- **SC-005**: El 100 % de dobles comandos y conflictos conserva un unico estado confirmado y un unico handoff.
- **SC-006**: Cero conceptos, categorias, roles, companeros o votos aparecen en superficies compartidas, handoffs, URL, logs o errores publicos.
- **SC-007**: El 100 % de reaperturas offline restaura fase y reloj sin repetir RNG y el restante
  nunca supera `maximumRemainingSeconds` del ultimo comando durable.
- **SC-008**: El 100 % de listas sucesivas invalidas se rechaza sin escritura parcial y las validas no alteran fases anteriores.
- **SC-009**: Todos los recorridos pasan controles automatizados de teclado, semantica, anuncios de tiempo, contraste y ausencia de overflow a 320 px.
- **SC-010**: El 100 % de recorridos roster/random avanza por la secuencia confirmada sin saltos y recupera turno/completados; free nunca muestra un turno actual.
- **SC-011**: Cero pantallas de IMP-6 ofrecen reiniciar tiempo, navegar a votacion antes del cierre durable o abrir el menu de partida dentro de una vista privada.

## Assumptions and dependencies

- IMP-5 entrega un `RoundHandoff` solo despues de N/N revelaciones y conserva el snapshot secreto; IMP-6 trabaja exclusivamente con proyecciones publicas.
- `PreparedGame` de IMP-3 sigue siendo la fuente autoritativa de `conversation` y `turnOrder`.
- IMP-6 no presenta presets ni modifica la duracion. Los valores de 1, 2, 3, 5 y 10 minutos equivalen a segundos ya validos; anadir accesos rapidos en configuracion requiere una mejora separada de IMP-3.
- El reloj puede ajustarse: un salto adelante puede expirar la fase y uno hacia atras queda limitado por `maximumRemainingSeconds`, aunque puede recuperar tiempo observado dentro de ese maximo tras reload. Solo un valor no finito activa `invalid-clock`. El dominio se prueba con reloj inyectable de forma exacta; la UI admite una tolerancia visual maxima de un segundo.
- IMP-7 consume `CluePhaseHandoff` para votar. IMP-8 consume su resultado, decide si la ronda debe
  continuar y, solo entonces, puede emitir `NextCluePhaseRequest`; IMP-6 no prepara una fase sucesiva
  sin esa solicitud explicita.
- No existe telemetria integrada. La auditoria de privacidad inspecciona URL, navigation state, `PublicPlatformError`, consola capturada y payloads publicos serializados.
- Jira contiene IMP-38..IMP-42 para US1..US5 e IMP-43 para validacion/entrega. FR-006, FR-017..FR-019 y FR-024..FR-029 son gates transversales aunque tengan una historia primaria.

## Screen inventory

- **Round ready**: ronda actual/total, politica de orden, primer jugador o instruccion libre, secuencia publica y CTA `Comenzar pistas`; ningun reloj corre antes del commit.
- **Managed clues**: turno actual, completados, siguiente accion, secuencia no interactiva como atajo y CTA `Siguiente jugador`; tras el ultimo turno pasa a conversacion general.
- **Free clues / general discussion**: instruccion compartida sin speaker activo y CTA `Terminar pistas`.
- **Timed conversation**: reloj grande con pausa/reanudacion segun estado; no ofrece reset. Expiracion muestra aviso y conserva `Terminar pistas` como accion explicita.
- **Close confirmation**: explica que se avanzara a votacion; cancelar no escribe y confirmar persiste antes del handoff.
- **Observer / recovery / error**: misma proyeccion publica, sin comandos en observer; retry recarga sin replay y safe mode preserva datos.
- **Game menu integration**: acceso solo en pantallas compartidas. Su sheet de pausa, continuidad y abandono se especifica en IMP-10.
