# Feature Specification: Puntuacion y continuidad multirronda

**Feature Branch**: `009-scoring-multiround`
**Created**: 2026-08-08
**Status**: Ready for implementation
**Jira Epic**: `IMP-9`

## Scope and boundaries

IMP-9 comienza cuando IMP-8 entrega un resultado de ronda durable y definitivo. Convierte ese
resultado en movimientos de puntuacion deterministas, presenta el marcador acumulado, decide si la
partida avanza a otra ronda configurada o al ranking final y ofrece las salidas de revancha y nueva
partida.

IMP-9 no registra votos, resuelve empates de votacion, elimina participantes, evalua condiciones de
victoria ni ejecuta el ultimo intento. Estas decisiones pertenecen a IMP-7 e IMP-8 y llegan como un
resultado cerrado. Tampoco asigna roles ni modifica el historial equilibrado: IMP-5 sigue siendo el
unico propietario de `ImpostorAllocationHistory` y prepara cada ronda nueva de la misma partida.

`ScoreboardScreen` y `FinalRankingScreen` de `ProposedUI/` son referencias no normativas para la
jerarquia visual. Su formula ilustrativa de puntos, su seleccion de un unico ganador y su boton de
revancha no definen comportamiento de producto.

## User Scenarios & Testing

### User Story 1 - Registrar una ronda una sola vez (Priority: P1)

Como grupo, quiero que el resultado confirmado de una ronda se convierta en puntos de forma clara y
consistente, para que el marcador refleje lo que ocurrio sin depender de calculos manuales.

**Why this priority**: Sin un registro durable e idempotente de la ronda no existe una fuente fiable
para el marcador, el ranking ni la progresion.

**Independent Test**: Entregar un resultado valido de IMP-8 crea exactamente un registro de ronda y
los movimientos de puntuacion esperados por la tabla; repetir el mismo resultado no cambia puntos ni
revision.

**Acceptance Scenarios**:

1. **Given** una victoria ciudadana, **When** se confirma el resultado, **Then** cada ciudadano recibe
   1 punto base y cada impostor recibe 0 puntos base.
2. **Given** una victoria impostora, **When** se confirma el resultado, **Then** cada impostor original
   de la ronda recibe 2 puntos base y cada ciudadano recibe 0 puntos base.
3. **Given** uno o varios ultimos intentos acertados ya resueltos por IMP-8, **When** se puntua la
   ronda, **Then** cada autor de un acierto recibe 1 punto adicional, con independencia del bando
   ganador, y ningun fallo produce puntos.
4. **Given** una ronda con varios impostores y resolucion sucesiva, **When** IMP-8 entrega su resultado
   final, **Then** la puntuacion base se aplica una sola vez al bando final y los bonus se aplican solo
   a los actores identificados por IMP-8.
5. **Given** un resultado ya aplicado, **When** se reenvia con el mismo identificador y contenido,
   **Then** se devuelve el marcador confirmado sin otra escritura ni puntos duplicados.
6. **Given** el mismo identificador de resultado con contenido diferente, **When** se intenta aplicar,
   **Then** se rechaza como conflicto sin cambiar el marcador confirmado.

---

### User Story 2 - Consultar un marcador y ranking estables (Priority: P1)

Como participante, quiero ver la puntuacion acumulada y la clasificacion de forma estable, para
entender la posicion de todos y reconocer correctamente los empates.

**Why this priority**: El marcador es el valor visible principal de la epica y debe evitar falsos
desempates o cambios de orden entre reaperturas.

**Independent Test**: Con un historial fijo de rondas se obtiene siempre la misma clasificacion,
incluidos empates, y el ranking final marca a todas las personas con la puntuacion maxima como
ganadoras.

**Acceptance Scenarios**:

1. **Given** una o mas rondas puntuadas, **When** se abre el marcador, **Then** cada fila muestra
   posicion, nombre y total, y puede mostrar el desglose por ronda sin revelar votos ni secretos de
   rondas futuras.
2. **Given** totales distintos, **When** se ordena la clasificacion, **Then** se usa puntuacion
   descendente y despues el orden canonico del roster como criterio estable de presentacion.
3. **Given** dos o mas jugadores con el mismo total, **When** se calculan posiciones, **Then** comparten
   la misma posicion de competicion y la siguiente posicion salta el numero de empatados; por ejemplo,
   `1, 1, 3`.
4. **Given** la ultima ronda configurada, **When** se abre el ranking final, **Then** todas las personas
   con el total maximo se presentan como ganadoras compartidas; IMP-9 no ejecuta un desempate oculto.
5. **Given** una partida con varios impostores, **When** se muestra el marcador, **Then** los puntos de
   equipo se atribuyen individualmente segun la tabla sin multiplicarse por el numero de impostores.

---

### User Story 3 - Avanzar a la siguiente ronda configurada (Priority: P1)

Como anfitrion, quiero continuar desde el marcador a la siguiente ronda conservando la partida y sus
acumulados, para completar el numero de rondas acordado sin reconfigurarla.

**Why this priority**: La continuidad multirronda conecta la puntuacion con el reparto equilibrado y
el contenido sin repeticiones ya implementados.

**Independent Test**: Tras puntuar una ronda no final, una confirmacion durable incrementa el numero
de ronda una sola vez y solicita al coordinador preparar contenido mediante IMP-4 y despues roles mediante IMP-5 bajo el mismo `gameId`, preservando
marcador e historiales propietarios.

**Acceptance Scenarios**:

1. **Given** una ronda puntuada cuyo numero es menor que `PreparedGame.rounds`, **When** se muestra el
   marcador, **Then** se ofrece continuar a la ronda siguiente exacta.
2. **Given** la accion de continuar, **When** se confirma durablemente, **Then** el contador avanza una
   sola vez y se emite una solicitud publica al coordinador con el mismo `gameId` y el siguiente numero.
3. **Given** la misma partida, **When** el coordinador prepara la ronda siguiente, **Then** obtiene primero el draw durable de IMP-4 y despues solicita a IMP-5 los roles; IMP-5 conserva y consume su
   propio historial `role-assignment-history`; IMP-9 no lo lee, escribe, reinicia ni deriva.
4. **Given** la misma partida, **When** comienza otra ronda, **Then** se conservan puntuacion, resultados
   cerrados, configuracion, pool de contenido e historiales de conceptos y asignacion.
5. **Given** la ultima ronda configurada ya puntuada, **When** se consulta la progresion, **Then** no
   se puede preparar otra ronda y la unica progresion ordinaria es confirmar el ranking final.
6. **Given** un fallo al guardar la progresion, **When** se intenta continuar, **Then** permanece el
   marcador anterior y no se solicita preparar una ronda hasta que el avance sea durable.

---

### User Story 4 - Terminar, repetir o comenzar otra partida (Priority: P2)

Como grupo que ha terminado, quiero elegir entre una revancha con la misma preparacion o una nueva
partida, para volver a jugar sin conservar accidentalmente resultados o secretos anteriores.

**Why this priority**: Estas salidas completan el ciclo de uso y fijan que datos se reutilizan frente
a los que deben aislarse por partida.

**Independent Test**: Desde un ranking final, revancha crea un nuevo identificador y un borrador
prellenado con la preparacion reutilizable; nueva partida descarta la sesion terminada y vuelve al
flujo inicial conservando solo datos locales reutilizables.

**Acceptance Scenarios**:

1. **Given** un ranking final confirmado, **When** se elige revancha, **Then** se solicita confirmacion
   y se crea una nueva partida con nuevo `gameId`.
2. **Given** una revancha, **When** se crea su borrador, **Then** conserva roster y orden, reglas
   efectivas y seleccion de categorias como valores editables que deben revalidarse y confirmarse por
   sus epicas propietarias.
3. **Given** una revancha, **When** comienza, **Then** reinicia ronda a 1, puntuacion, resultados,
   roles, revelaciones, fases, votos, ultimo intento e historiales de conceptos y asignacion del nuevo
   `gameId`; no reutiliza ningun secreto ni snapshot recuperable de la partida anterior.
4. **Given** el ranking final, **When** se elige nueva partida, **Then** se cierra la partida actual y se
   vuelve a la preparacion de jugadores sin copiar automaticamente configuracion ni seleccion de
   contenido confirmadas.
5. **Given** una nueva partida, **When** se abre la preparacion, **Then** se conservan la lista activa de
   jugadores, grupos guardados, categorias personalizadas, modo adulto y preferencias porque sus
   propietarios las gestionan fuera de la sesion; el anfitrion puede editarlas o sustituirlas.
6. **Given** cualquier salida, **When** falla su confirmacion durable, **Then** el ranking final sigue
   siendo recuperable y no aparece una partida parcial nueva.

---

### User Story 5 - Recuperar puntuacion y progresion offline (Priority: P2)

Como grupo jugando offline, quiero reabrir el marcador o ranking exactamente donde quedo, para no
perder puntos ni iniciar dos veces una ronda despues de un cierre o conflicto.

**Why this priority**: La puntuacion es acumulativa e irreversible; su recuperacion debe cumplir las
garantias de plataforma y escritor unico.

**Independent Test**: Cerrar y reabrir offline en cada estado recupera el mismo historial, posiciones
y accion siguiente; dobles pulsaciones y revisiones obsoletas no duplican puntuacion ni progresion.

**Acceptance Scenarios**:

1. **Given** una ronda puntuada, **When** se reabre offline, **Then** se restaura el mismo marcador y la
   misma siguiente accion sin recalcular desde UI o memoria efimera.
2. **Given** un ranking final confirmado, **When** se reabre, **Then** se muestran los mismos ganadores
   compartidos y las opciones de salida validas.
3. **Given** dos pestanas con la misma revision, **When** ambas aplican resultado o avanzan de ronda,
   **Then** solo una confirmacion cambia el estado y la otra recarga el ultimo snapshot sin repetir su
   intencion automaticamente.
4. **Given** modo observador, **When** se consulta marcador o ranking, **Then** solo se expone la
   proyeccion publica y no se ofrecen acciones mutables.
5. **Given** datos futuros, incompatibles o parciales, **When** se recuperan, **Then** se activa modo
   seguro sin borrado automatico, puntos inventados ni filtracion de secretos.

### Edge Cases

- Un resultado contiene un jugador ajeno al roster, omite un participante o repite un ID.
- IMP-8 entrega bonus de ultimo intento a un ciudadano, a un ID duplicado o a un impostor que no
  participo en la ronda.
- Un resultado declara victoria ciudadana e impostora simultaneamente o no declara ningun bando.
- Una ronda recibida no es la siguiente esperada, excede el total configurado o llega antes de cerrar
  la anterior.
- La app se cierra despues de guardar puntos pero antes de mostrar el marcador.
- Dos jugadores empatados cambian sus nombres despues de confirmar el roster; la clasificacion no
  debe depender del texto ni cambiar el snapshot.
- Todos los jugadores terminan con cero puntos o con el mismo maximo.
- Un `PreparedGame` de una sola ronda llega al marcador.
- Se pulsa varias veces continuar, revancha o nueva partida mientras hay una escritura en curso.
- Una revancha revalida una categoria personalizada eliminada o un pool ya insuficiente.
- El historial equilibrado de IMP-5 existe pero el snapshot de puntuacion esta incompleto, o al reves.
- Se agota el pool de conceptos al solicitar la siguiente ronda; IMP-9 conserva el marcador y muestra
  el bloqueo devuelto por la epica propietaria.

## Requirements

### Functional Requirements

- **FR-001**: IMP-9 MUST consumir un `RoundResolutionHandoff` versionado, durable y definitivo emitido
  por IMP-8 mediante un coordinador interno repositorio-a-repositorio; servicio, hook, App,
  navigation y UI MUST NOT recibirlo ni inferirlo desde votos, roles visibles o temporizadores.
- **FR-002**: `RoundResolutionHandoff` MUST contener exactamente `schemaVersion`, `resultId`, `gameId`, `roundNumber`, `participantIds`, `originalRoles`, `winner`, `reason`, `eliminatedPlayerIds`, `activePlayerIds`, `attemptOutcomes` y `resolvedAt`. Cada elemento de `attemptOutcomes` MUST contener unicamente `playerId` y `outcome`; el handoff MUST NOT incluir votos, concepto ni una decision de continuidad o finalizacion de partida.
- **FR-003**: IMP-9 MUST validar que partida, ronda y jugadores coinciden con el `PreparedGame` y con
  la ronda esperada antes de escribir; una entrada invalida MUST NOT producir estado parcial.
- **FR-004**: La siguiente tabla es la decision normativa de producto para IMP-9 y MUST aplicarse sin
  reinterpretacion:

  | Condicion definitiva de IMP-8 | Ciudadano | Impostor original de la ronda |
  |---|---:|---:|
  | Victoria ciudadana | +1 base | +0 base |
  | Victoria impostora | +0 base | +2 base |
  | Ultimo intento acertado | +0 | +1 adicional solo para su autor impostor |
  | Ultimo intento fallido o no ofrecido | +0 | +0 adicional |

- **FR-005**: Con varios impostores, los puntos base MUST aplicarse individualmente a todos los
  miembros originales del bando ganador una sola vez; cada bonus MUST corresponder a un autor unico.
- **FR-006**: En resolucion sucesiva, IMP-9 MUST esperar el resultado final de ronda de IMP-8 y MUST
  NOT puntuar eliminaciones o fases intermedias.
- **FR-007**: Aplicar un resultado MUST persistir atomicamente el registro de ronda, sus movimientos,
  los totales y la siguiente accion de la partida.
- **FR-008**: Repetir el mismo resultado confirmado MUST ser un no-op sin escritura ni nueva revision;
  reutilizar su identificador con contenido distinto MUST devolver un conflicto publico tipado.
- **FR-009**: Cada movimiento MUST conservar jugador, ronda, cantidad, motivo (`citizen-win`,
  `impostor-win` o `last-stand-correct`) y referencia al resultado, de modo que el total sea auditable
  sin conservar votos.
- **FR-010**: La clasificacion MUST ordenar por total descendente y usar el orden canonico e inmutable
  del roster solo como orden estable de presentacion entre iguales.
- **FR-011**: Jugadores con el mismo total MUST compartir posicion de competicion (`1, 1, 3`) y todos
  los que compartan el total maximo al finalizar MUST ser ganadores.
- **FR-012**: El marcador intermedio MUST mostrar ronda completada, progreso sobre rondas configuradas,
  posiciones, nombres y totales; el ranking final MUST mostrar todos los ganadores y la tabla completa.
- **FR-013**: IMP-9 MUST derivar la siguiente accion exclusivamente comparando `roundNumber` con `PreparedGame.rounds`: si es menor, `next-round`; si es igual, `final-ranking`. MUST NOT aceptar ni inferir una finalizacion anticipada.
- **FR-014**: Avanzar MUST confirmarse durablemente antes de emitir `NextRoundRequest` al coordinador de ronda y
  MUST ser idempotente ante doble pulsacion o reapertura. Desde `scoreboard-active`, el coordinador
  MUST confirmar draw IMP-4 y roles IMP-5 en una unica transaccion sin staging `content-selected`;
  el draw ocurre antes de asignar roles y cualquier fallo conserva el marcador.
- **FR-015**: La siguiente ronda ordinaria MUST conservar el mismo `gameId`, configuracion, pool,
  resultados, puntuacion e historiales propietarios de conceptos y asignacion.
- **FR-016**: `ImpostorAllocationHistory` y `role-assignment-history` MUST seguir bajo propiedad
  exclusiva de IMP-5. IMP-9 MUST NOT leerlos, escribirlos, reiniciarlos ni reproducir la politica
  `balanced`; solo solicita a IMP-5 preparar el siguiente numero de ronda del mismo juego.
- **FR-017**: Si el draw durable de IMP-4 o la preparacion de IMP-5 falla o queda bloqueada, IMP-9 MUST conservar marcador y
  progresion confirmados, mostrar un issue publico accionable y MUST NOT crear una ronda parcial ni repetir automaticamente la intencion.
- **FR-018**: Confirmar el ranking final MUST cerrar la partida de forma durable y conservar su
  marcador para recuperacion hasta que se confirme revancha, nueva partida o borrado global.
- **FR-019**: Revancha MUST crear un nuevo `gameId`, prellenar como borrador editable el roster y
  orden, reglas efectivas y seleccion de categorias, y exigir revalidacion/confirmacion de IMP-2,
  IMP-3 e IMP-4 antes de repartir roles.
- **FR-020**: Revancha MUST reiniciar ronda, puntuacion, resultados, roles, revelaciones, fases, votos,
  ultimo intento e historiales de conceptos y asignacion bajo el nuevo `gameId`; MUST NOT copiar
  secretos ni recovery de la partida terminada.
- **FR-021**: Nueva partida MUST cerrar la sesion y volver a preparacion sin copiar configuracion ni
  pool confirmados; MUST conservar lista activa, grupos, catalogo personalizado, modo adulto y
  preferencias locales bajo sus propietarios.
- **FR-022**: Revancha y nueva partida MUST requerir confirmacion, ser atomicas e idempotentes y dejar
  recuperable el ranking anterior si fallan.
- **FR-023**: Puntuacion, progresion, finalizacion y salidas MUST respetar revision optimista y permiso
  de escritor; un observador MUST ser estrictamente de solo lectura.
- **FR-024**: La recuperacion offline MUST restaurar registro de rondas, movimientos, totales,
  posiciones, estado final y siguiente accion sin duplicar puntos ni repetir callbacks.
- **FR-025**: Datos futuros, incompatibles o parciales MUST activar modo seguro sin borrado automatico
  ni reconstruccion especulativa de puntos.
- **FR-026**: Marcadores y rankings son superficies compartidas y MUST NOT contener concepto, categoria
  sorteada, roles de una ronda futura, votos individuales ni identidades secretas no reveladas por el
  resultado final de IMP-8.
- **FR-027**: Ningun dato privado MUST aparecer en URL, historial de navegacion, navigation state,
  `PublicPlatformError`, consola capturada o telemetria; IMP-9 MUST NOT introducir telemetria.
- **FR-028**: Todos los textos visibles MUST estar externalizados y las superficies loading, ready,
  writing, blocked, observer, error, final y empty-safe MUST ser distinguibles y accesibles.
- **FR-029**: Marcador, ranking, confirmaciones y recuperacion MUST funcionar offline, con teclado,
  foco visible, objetivos tactiles, semantica de tabla/lista y sin overflow a 320 px.
- **FR-030**: IMP-9 MUST mantener el presupuesto de bundle vigente y MUST NOT incorporar un motor de
  ranking remoto, cuentas, nube o servicios de puntuacion.

### Key Entities

- **RoundResolutionHandoff**: entrada durable de IMP-8 formada exactamente por `schemaVersion`, `resultId`,
  `gameId`, `roundNumber`, `participantIds`, `originalRoles`, `winner`, `reason`, `eliminatedPlayerIds`,
  `activePlayerIds`, `attemptOutcomes` (`playerId`, `outcome`) y `resolvedAt`.
- **ScoreMovement**: movimiento inmutable por jugador y ronda con cantidad, motivo y referencia al
  resultado que lo origino.
- **ScoredRound**: registro de una ronda aplicada una sola vez; agrupa resultado publico, movimientos
  y fecha de confirmacion.
- **GameScoreboard**: agregado versionado por `gameId` con roster canonico, rondas puntuadas, totales,
  revision, estado (`in-progress` o `final`) y siguiente accion.
- **RankingEntry**: proyeccion publica con ID, nombre copiado del roster confirmado, total, posicion y
  marcas `leader`/`winner` que admiten varios jugadores.
- **NextRoundRequest**: solicitud publica e idempotente al coordinador de ronda con `gameId` y siguiente numero; coordina draw durable IMP-4 y preparacion IMP-5 y no contiene roles, historial equilibrado ni contenido.
- **RematchSeed**: nueva identidad y roster reutilizable no confirmado para el shell IMP-10; nunca contiene puntos,
  secretos ni historiales de la partida anterior.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100 % de casos de la tabla, incluidos 1, 2 y 3 impostores y multiples bonus, produce
  exactamente los movimientos y totales definidos.
- **SC-002**: El 100 % de resultados repetidos, dobles pulsaciones y conflictos conserva un unico
  registro puntuado, una unica progresion y cero puntos duplicados.
- **SC-003**: El 100 % de empates mantiene posiciones estables y el 100 % de empates por el maximo
  presenta a todos sus miembros como ganadores.
- **SC-004**: El 100 % de partidas de 1 a 10 rondas ofrece siguiente ronda antes del limite y ranking
  final exactamente al alcanzarlo.
- **SC-005**: Cero operaciones de IMP-9 leen, escriben o reinician `role-assignment-history`; el 100 %
  de rondas siguientes delega su preparacion equilibrada a IMP-5.
- **SC-006**: El 100 % de reaperturas offline tras puntuar, avanzar o finalizar restaura los mismos
  totales, posiciones y siguiente accion.
- **SC-007**: El 100 % de revanchas crea una identidad nueva, conserva solo el borrador reutilizable y
  comienza con cero puntuacion, cero rondas y cero secretos previos.
- **SC-008**: Cero conceptos, votos o secretos no autorizados aparece en marcador, ranking, URL, logs,
  errores o payloads publicos en la matriz de privacidad.
- **SC-009**: Todos los recorridos pasan controles automatizados de teclado, semantica, foco,
  contraste y ausencia de overflow a 320 px.
- **SC-010**: Una persona puede interpretar lideres, empates, ronda completada y siguiente accion en
  menos de 10 segundos durante una prueba moderada con al menos 10 participantes.

## Assumptions and dependencies

- IMP-8 entregara por cada ronda exactamente el `RoundResolutionHandoff` definido en FR-002 y sera la unica autoridad sobre victoria, roles originales, motivo y resultados de ultimo intento.
- Un acierto de ultimo intento otorga exactamente 1 punto adicional al impostor autor y no cambia el
  bando ganador, conforme al contrato cerrado de IMP-8.
- Los puntos son individuales aunque las victorias sean de bando. No existen puntos negativos,
  redondeos, bonus por rapidez ni desempates adicionales.
- La posicion usa competicion estandar (`1, 1, 3`); el orden de roster entre empatados es solo visual
  y no los desempata semanticamente.
- La partida termina unicamente al puntuar `PreparedGame.rounds`; IMP-8 resuelve cada ronda pero no
  declara una finalizacion anticipada de la partida.
- Los historiales de conceptos y asignacion estan aislados por `gameId`. Mantener el ID en una ronda
  siguiente los conserva; crear otro en revancha empieza historiales nuevos por sus epicas propietarias.
- `ProposedUI/` no es codigo de produccion ni contrato. El ranking con un solo ganador y la formula
  `ciudadano = 1 por ronda` se sustituyen por esta especificacion.
- No existe telemetria integrada. Las pruebas de privacidad inspeccionan las superficies y canales
  publicos definidos por la constitucion.
