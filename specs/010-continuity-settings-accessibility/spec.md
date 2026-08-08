# Feature Specification: Continuidad, ayuda, ajustes y accesibilidad

**Feature Branch**: `010-continuity-settings-accessibility`
**Created**: 2026-08-08
**Status**: Ready for implementation
**Jira Epic**: `IMP-10`

## Scope and boundaries

IMP-10 define el shell de producto y las capacidades transversales que rodean una partida: inicio,
continuidad, pausa y abandono, ayuda, preferencias, borrado local y accesibilidad. Consume los
snapshots publicos y comandos seguros de IMP-1..IMP-9, pero no reimplementa sus reglas de dominio.

`ProposedUI/` es referencia no normativa para composicion y jerarquia movil. La implementacion real
mantiene React, Dexie, PWA, i18n y CSS existentes; no incorpora el proyecto standalone, Tailwind, su
Context global, sus mocks, el marco de telefono ni secretos en estado compartido.

## User Scenarios & Testing

### User Story 1 - Entrar y continuar una partida segura (Priority: P1)

Como jugador que abre la app, quiero ver si el dispositivo esta listo offline y continuar una
partida interrumpida desde un resumen publico, para volver exactamente al ultimo estado confirmado
sin exponer informacion privada.

**Independent Test**: Con y sin snapshot recuperable, Home muestra las acciones correctas; continuar
restaura la fase compartida confirmada y nunca reabre una vista privada o reproduce un comando.

**Acceptance Scenarios**:

1. **Given** primera preparacion completa, **When** se abre Home, **Then** muestra disponibilidad
   offline veraz y accesos a nueva partida, grupos, ayuda y ajustes.
2. **Given** una partida recuperable, **When** se muestra su resumen, **Then** contiene ronda,
   participantes y fase publica, nunca categoria, concepto, roles, votos ni resultado oculto.
3. **Given** una interrupcion en revelacion o voto privado, **When** se continua, **Then** abre la lista
   compartida cubierta correspondiente y conserva solo completados durables.
4. **Given** una interrupcion durante un ultimo intento privado de IMP-8, **When** se continua, **Then**
   abre `private-handoff` cubierto y no restaura la respuesta, concepto ni resultado en el DOM.
5. **Given** una fase compartida activa, pausada, expirada o cerrada, **When** se continua, **Then**
   restaura su proyeccion y comandos validos sin repetir RNG, tiempo, voto, cierre o puntuacion.
6. **Given** que no existe partida recuperable, **When** se abre Home, **Then** no muestra una tarjeta
   de continuidad ficticia.

---

### User Story 2 - Pausar, abandonar o descartar con consecuencias claras (Priority: P1)

Como anfitrion, quiero salir temporalmente o abandonar una partida desde pantallas compartidas, para
controlar la sesion sin perder datos por accidente.

**Independent Test**: Pausar una fase temporizada confirma primero el reloj pausado y vuelve a Home;
abandonar o descartar exige confirmacion y elimina solo el agregado de partida indicado.

**Acceptance Scenarios**:

1. **Given** una pantalla compartida de partida, **When** se abre el menu, **Then** ofrece Pausar
   partida y Abandonar partida; el menu no existe dentro de una vista privada descubierta.
2. **Given** las superficies compartidas de IMP-7, IMP-8 o IMP-9, **When** se renderizan lista de voto,
   desempate, resolucion, marcador o ranking, **Then** integran el menu; papeleta privada e intento
   final privado MUST NOT integrarlo, incluso cuando permanecen cubiertos.
3. **Given** un timer running, **When** se pausa la partida, **Then** persiste atomicamente su restante
   antes de volver a Home y continuar lo mantiene pausado hasta reanudacion explicita.
4. **Given** cualquier otra fase compartida, **When** se pausa, **Then** guarda el snapshot actual y
   vuelve a Home sin ejecutar la accion primaria de esa fase.
5. **Given** abandono o descarte desde Home, **When** se solicita, **Then** un dialogo enumera los
   datos que se perderan; cancelar no escribe y confirmar es idempotente.
6. **Given** abandono confirmado, **When** termina el borrado, **Then** elimina partida activa,
   asignaciones, votos, resolucion, puntuacion y progreso multirronda, pero conserva grupos,
   categorias personalizadas y preferencias.

---

### User Story 3 - Aprender a jugar sin bloquear el flujo (Priority: P2)

Como jugador nuevo, quiero una introduccion breve y una ayuda permanente, para comprender el pase
privado, las pistas, la votacion y el resultado sin necesitar conexion.

**Independent Test**: La introduccion aparece solo segun preferencia de primera ejecucion, puede
omitirse y la misma informacion esencial permanece disponible desde Home y Ajustes offline.

**Acceptance Scenarios**:

1. **Given** primera ejecucion, **When** termina la preparacion real de plataforma, **Then** se ofrece
   una introduccion interactiva omisible sin temporizadores simulados ni enlaces de depuracion.
2. **Given** introduccion omitida o completada, **When** se vuelve a abrir la app, **Then** entra en
   Home y conserva la decision.
3. **Given** Como jugar, **When** se consulta offline, **Then** explica jugadores/configuracion,
   seleccion de contenido, revelacion privada, pistas, voto, resolucion y multirronda sin afirmar
   reglas distintas de las specs aprobadas.
4. **Given** ayuda abierta durante una partida, **When** se cierra, **Then** vuelve a la superficie
   compartida anterior y nunca a un secreto descubierto.

---

### User Story 4 - Configurar preferencias sin filtrar secretos (Priority: P2)

Como usuario, quiero controlar sonido, vibracion, contenido adulto y contraste, para adaptar la app
a mi dispositivo y necesidades.

**Independent Test**: Cada preferencia se persiste por separado, funciona sin su API opcional y no
produce senales distintas que permitan inferir un rol, voto o resultado antes de revelarlo.

**Acceptance Scenarios**:

1. **Given** sonido o vibracion desactivados, **When** ocurre un hito, **Then** ese canal no se usa y
   el flujo sigue completo visualmente y con lector de pantalla.
2. **Given** APIs de audio o vibracion no disponibles o permiso denegado, **When** se intenta un
   feedback, **Then** falla silenciosamente sin bloquear ni mostrar error tecnico.
3. **Given** una vista privada cubierta, **When** se revela ciudadano o impostor, **Then** sonido,
   patron haptico, duracion y momento son indistinguibles por rol; lo mismo aplica a votos privados.
4. **Given** modo adulto preferido, **When** se configura contenido, **Then** puede ofrecer la opcion
   adulta pero no omite la confirmacion explicita por partida definida en IMP-4.
5. **Given** alto contraste activado, **When** se recorre cualquier pantalla, **Then** aumenta
   contraste sin depender solo del color ni ocultar estados de foco.
6. **Given** que solo existe espanol, **When** se muestran ajustes, **Then** no se ofrece un selector
   de idioma inoperante; todos los textos siguen externalizados para ampliacion futura.

---

### User Story 5 - Borrar todos los datos locales de forma segura (Priority: P2)

Como propietario del dispositivo, quiero borrar todos los datos de juego con una confirmacion clara,
para restablecer la app sin desinstalarla.

**Independent Test**: Confirmar borrado elimina todas las colecciones y snapshots conocidos por una
operacion idempotente, conserva la instalacion/cache PWA y vuelve a estado inicial sin datos.

**Acceptance Scenarios**:

1. **Given** Ajustes, **When** se pulsa Borrar todos los datos, **Then** se enumeran jugadores,
   grupos, categorias, historiales, preferencias, partida y puntuaciones antes de confirmar.
2. **Given** cancelacion, **When** se cierra el dialogo, **Then** ninguna tabla cambia.
3. **Given** confirmacion, **When** finaliza el borrado, **Then** todas las tablas introducidas por
   IMP-1..IMP-9 quedan vacias, incluida metadata e historiales de conceptos/roles.
4. **Given** app instalada, **When** se borran datos, **Then** service worker, shell offline y
   manifest permanecen preparados; Home refleja que no hay partida ni colecciones guardadas.
5. **Given** fallo parcial del almacenamiento, **When** se informa, **Then** se usa un error publico
   sin secretos y se ofrece reintento o salida segura.

---

### User Story 6 - Usar un shell movil coherente y accesible (Priority: P2)

Como usuario movil, quiero pantallas consistentes y legibles en todo el recorrido, para reconocer la
accion siguiente y operar la app con tacto, teclado o lector de pantalla.

**Independent Test**: El inventario completo de pantallas pasa axe, teclado, foco, zoom y overflow a
320 px, con safe areas y una unica accion primaria clara por estado.

**Acceptance Scenarios**:

1. **Given** cualquier pantalla, **When** se presenta, **Then** usa cabecera compacta, cuerpo
   desplazable y CTA inferior estable cuando existe una accion primaria; no hay cards anidadas.
2. **Given** un movil real, **When** se abre la app, **Then** ocupa el viewport completo y respeta safe
   areas; el marco de telefono del prototipo nunca aparece en produccion.
3. **Given** ancho 320 px, zoom 200 % o nombres maximos, **When** se recorre la UI, **Then** no hay
   scroll horizontal, solapes ni texto cortado que impida comprender o actuar.
4. **Given** teclado o lector, **When** se usan segmented controls, toggles, sheets, dialogos,
   progreso y toasts, **Then** exponen nombre, rol, estado, foco inicial, Escape y restauracion de foco.
5. **Given** movimiento reducido, **When** se revela o navega, **Then** animaciones se reducen sin
   ocultar informacion; shimmer y feedback nunca son la unica indicacion.

### Edge Cases

- La app se cierra mientras el menu o un dialogo de confirmacion esta abierto.
- Pausar partida compite con expiracion, voto o cierre en otra pestana.
- Home encuentra snapshot futuro o parcialmente borrado.
- El dispositivo no permite vibracion, bloquea audio o activa ahorro de energia.
- El usuario borra datos mientras otra pestana conserva writer lease.
- Una preferencia cambia durante una vista privada.
- El contenido de ayuda queda desfasado respecto a una regla de epica posterior.

## Requirements

### Functional Requirements

- **FR-001**: Home MUST mostrar estado offline real, nueva partida, grupos, ayuda y ajustes.
- **FR-002**: Una tarjeta de continuidad MUST existir solo con snapshot confirmado y MUST usar una
  proyeccion publica estructuralmente libre de secretos.
- **FR-003**: Continuar MUST restaurar la ultima superficie compartida segura y MUST NOT reabrir ninguna vista privada descubierta ni reproducir una intencion pendiente. Recovery de `final-attempt` MUST volver a `private-handoff` cubierto sin respuesta, concepto ni resultado en DOM.
- **FR-004**: El menu de partida MUST estar disponible en ready/pistas/discusion compartidas de
  IMP-6, lista y desempate de IMP-7, resolucion publica de IMP-8 y marcador/ranking de IMP-9. MUST
  estar ausente en papeleta privada de IMP-7 e intento final privado de IMP-8, cubiertos o
  descubiertos, y mientras cualquier vista privada contiene rol, concepto, voto o intento.
- **FR-005**: Pausar una partida MUST confirmar durablemente el estado actual antes de navegar a
  Home mediante el puerto publico de la feature. El adaptador IMP-6 MUST convertir running a paused,
  conservar expired y tratar paused como no-op.
- **FR-006**: Abandonar y descartar MUST requerir confirmacion, ser idempotentes y borrar solo el
  agregado de partida activa mediante una unica autoridad `LocalDataRepository.clearActiveGame`.
  Los adapters MUST NOT borrar datos; deleters game-scoped MUST retirar recovery, historiales de
  concepto/rol, votos, resolucion, score y progreso del gameId, conservando colecciones y preferencias.
- **FR-007**: La introduccion MUST reflejar preparacion real, ser omisible y persistir su estado; MUST
  NOT incluir esperas artificiales ni controles de preview en produccion.
- **FR-008**: Como jugar MUST permanecer accesible offline desde Home y Ajustes y MUST derivar su
  contenido de reglas aprobadas.
- **FR-009**: Sonido y vibracion MUST poder desactivarse independientemente y MUST degradar sin error
  cuando las APIs no existan.
- **FR-010**: Feedback audiovisual o haptico MUST ser indistinguible entre secretos alternativos
  hasta su revelacion publica.
- **FR-011**: La preferencia adulta MUST NOT sustituir la confirmacion por partida de IMP-4.
- **FR-012**: Alto contraste MUST conservar semantica, foco y distinciones no dependientes solo de
  color; idioma MUST permanecer externalizado sin selector inoperante.
- **FR-013**: Borrar todos los datos MUST vaciar atomicamente o de forma recuperable todas las tablas,
  metadata, historiales, snapshots y preferencias introducidos por IMP-1..IMP-9. Un unico registry
  MUST alimentar migraciones, database, gateway e inventario; el fallback MUST usar un marker durable
  y retomar borrado/recreacion/verificacion tras un cierre.
- **FR-014**: El borrado global MUST conservar assets, caches y service worker necesarios para abrir
  offline la app ya instalada.
- **FR-015**: Todos los comandos MUST respetar writer lease, revision optimista e idempotencia; un
  conflicto MUST recargar sin replay automatico.
- **FR-016**: Ninguna URL, navigation state, error, toast, log, resumen Home o preferencia MUST incluir
  concepto, roles, votos, companions o resultados aun privados.
- **FR-017**: La UI MUST usar safe areas, viewport movil completo, cabeceras compactas, cuerpos
  desplazables y CTA estable sin depender del marco de telefono del prototipo.
- **FR-018**: Controles principales MUST medir al menos 44 por 44 CSS px y exponer semantica, estado,
  foco visible, Escape y restauracion de foco segun corresponda.
- **FR-019**: Todos los estados MUST funcionar a 320 px y 200 % zoom sin scroll horizontal ni
  solapes; movimiento reducido MUST desactivar animacion no esencial.
- **FR-020**: Todos los textos MUST estar externalizados y las pantallas MUST pasar axe WCAG A/AA,
  teclado, lector, contraste y pruebas de privacidad.
- **FR-021**: IMP-10 MUST integrar puertos publicos de IMP-1..IMP-9 y MUST NOT recibir sus snapshots
  secretos completos en Home, ajustes, menu o ayuda. Un discriminante publico versionado MUST
  seleccionar exactamente un adapter; cero o varios MUST activar safe mode.
- **FR-022**: La feature MUST funcionar offline despues de la primera preparacion y MUST mantener el
  presupuesto de bundle sin importar Tailwind ni el proyecto standalone.
- **FR-023**: La accion Revancha MUST consumir un `RematchSeed` publico propiedad de IMP-9 con nuevo
  `gameId` y conducir a revision editable de jugadores, configuracion y contenido; IMP-10 solo posee
  shell/routing y MUST NOT reconstruir politica, saltar al reparto ni reutilizar confirmaciones.

### Key Entities

- **SafeResumeSummary**: proyeccion publica con partida, ronda, participantes y fase recuperable.
- **GamePauseRequest**: comando transversal que coordina persistencia de la feature activa y retorno
  a Home.
- **LocalPreferences**: sonido, vibracion, adulto, contraste e introduccion completada.
- **LocalDataInventory**: registro central de stores y efectos incluidos en borrado global.
- **HelpContentVersion**: version de contenido de ayuda alineada con reglas publicadas.

## Screen inventory

- **Platform preparation / blocked offline**: progreso real de primera carga, retry y explicacion.
- **Home**: readiness offline, continuidad segura, nueva partida, grupos, ayuda y ajustes.
- **Game menu sheet**: pausa y abandono; confirmacion separada para la accion destructiva.
- **IMP-8 recovery**: `resolving`, `private-handoff` cubierto, `private-entry`, `saving-attempt`, `continuation-ready`, `terminal-reveal`, error y conflict, observer y safe mode.
- **Rematch review route**: jugadores, configuracion y contenido, todos editables y revalidados bajo el nuevo `gameId` antes del reparto.
- **Settings**: sonido, vibracion, adulto, alto contraste, ayuda y zona de borrado global.
- **How to play / onboarding**: pasos publicos, omision y retorno seguro.
- **Confirm discard / abandon / delete**: dialogos accesibles con consecuencias y foco controlado.

## Success Criteria

- **SC-001**: El 100 % de snapshots confirmados reabre la superficie compartida correcta; cero
  reaperturas muestran un secreto automaticamente.
- **SC-002**: El 100 % de pausas desde timer running conserva el restante durable antes de Home.
- **SC-003**: Cero abandonos, descartes o borrados ocurren sin confirmacion explicita.
- **SC-004**: El 100 % de preferencias se restaura offline y su ausencia de API no bloquea el flujo.
- **SC-005**: Cero patrones de sonido, vibracion, timing o texto permiten distinguir secretos.
- **SC-006**: El 100 % de stores registrados queda vacio tras borrado global y la app instalada vuelve
  a abrir offline.
- **SC-007**: Todas las pantallas pasan axe, teclado, foco, contraste, 320 px y zoom 200 %.
- **SC-008**: El bundle permanece dentro del presupuesto y no incorpora Tailwind ni assets remotos.

## Assumptions and dependencies

- IMP-1 aporta plataforma, recovery base, writer lease y borrado; IMP-10 extiende el inventario a
  stores introducidos posteriormente.
- Cada feature IMP-2..IMP-9 debe exponer una proyeccion publica y un comando seguro de pausa/recovery;
  IMP-10 no inspecciona payloads secretos.
- Solo se soporta espanol en esta entrega, con i18n preparado para futuros idiomas.
- La propuesta visual orienta composicion, no contratos de dominio ni tecnologia.
