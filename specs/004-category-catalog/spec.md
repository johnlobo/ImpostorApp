# Feature Specification: Catalogo de categorias y conceptos

**Feature Branch**: `004-category-catalog`

**Created**: 2026-08-07

**Status**: Approved for planning

**Jira Epic**: `IMP-4`

**Input**: Proporcionar contenido variado para las rondas, permitir seleccionar categorias y crear contenido propio sin repetir conceptos durante una partida.

## User Scenarios & Testing

### User Story 1 - Seleccionar contenido para una partida (Priority: P1)

Como anfitrion, quiero elegir una, varias, todas o una categoria aleatoria para adaptar el contenido al grupo.

**Why this priority**: Una partida no puede preparar roles hasta disponer de un conjunto de conceptos valido y suficiente.

**Independent Test**: Con un `PreparedGame` valido y el catalogo inicial disponible, cualquier modo de seleccion valido confirma un pool no vacio sin incluir contenido adulto cuando el modo adulto esta desactivado.

**Acceptance Scenarios**:

1. **Given** el catalogo general, **When** el anfitrion selecciona una categoria, **Then** solo sus conceptos quedan incluidos en el pool.
2. **Given** varias categorias, **When** confirma la seleccion, **Then** el pool incluye conceptos de todas ellas.
3. **Given** el modo todas, **When** se confirma, **Then** incluye todas las categorias generales y personalizadas habilitadas.
4. **Given** el modo categoria aleatoria, **When** se prepara cada ronda, **Then** se elige una categoria habilitada con conceptos no usados y despues un concepto de ella.
5. **Given** una seleccion vacia o con menos conceptos disponibles que rondas pendientes, **When** intenta confirmarla, **Then** se bloquea y se explica como corregirla.
6. **Given** una seleccion valida, **When** se confirma, **Then** se crea un pool inmutable asociado al identificador de la partida preparada.

---

### User Story 2 - Obtener conceptos sin repeticiones (Priority: P1)

Como grupo, quiero que los conceptos no se repitan dentro de la partida hasta agotar el pool para mantener variadas las rondas.

**Why this priority**: La ausencia de repeticiones es una promesa central de la epica y el contrato que consume IMP-5.

**Independent Test**: Al extraer sucesivamente todos los conceptos de un pool, cada identificador aparece una vez; la siguiente extraccion queda bloqueada hasta reiniciar manualmente el historial de esa partida.

**Acceptance Scenarios**:

1. **Given** conceptos sin usar, **When** IMP-5 solicita el contenido de una ronda, **Then** recibe exactamente una categoria y un concepto validos.
2. **Given** una extraccion confirmada, **When** se prepara otra ronda, **Then** el concepto anterior no vuelve a seleccionarse.
3. **Given** una extraccion que falla antes de confirmarse, **When** se reintenta, **Then** ningun concepto queda marcado parcialmente como usado.
4. **Given** el pool agotado, **When** se solicita otra ronda, **Then** no se repite contenido y se requiere reinicio manual.
5. **Given** confirmacion de reinicio, **When** termina la operacion, **Then** todo el historial de esa partida se elimina y el pool completo vuelve a ser elegible.
6. **Given** cierre y reapertura offline, **When** se recupera la misma partida, **Then** conserva exactamente su pool y sus conceptos usados.
7. **Given** dos partidas distintas, **When** utilizan la misma categoria, **Then** sus historiales permanecen independientes.

---

### User Story 3 - Gestionar categorias personalizadas (Priority: P2)

Como anfitrion, quiero crear y mantener categorias propias para jugar con contenido adaptado a mi grupo.

**Why this priority**: El contenido personalizado extiende la vida del catalogo, aunque el catalogo integrado ya permite jugar.

**Independent Test**: Se crea una categoria con conceptos, se cierra y reabre la aplicacion offline y puede editarse, seleccionarse y eliminarse conservando sus identificadores estables.

**Acceptance Scenarios**:

1. **Given** un nombre unico y al menos un concepto valido, **When** se guarda, **Then** aparece como categoria personalizada.
2. **Given** una categoria personalizada, **When** cambia su nombre o conceptos, **Then** las futuras confirmaciones de pool usan la version actualizada.
3. **Given** conceptos existentes en la misma categoria, **When** intenta guardar un duplicado normalizado, **Then** se rechaza sin perder el borrador.
4. **Given** el mismo concepto en categorias distintas, **When** se guardan, **Then** ambos son validos y conservan identificadores diferentes.
5. **Given** una categoria personalizada, **When** confirma su eliminacion, **Then** desaparece y se limpian sus referencias de historial sin crear tombstones.
6. **Given** una categoria integrada, **When** intenta editarla o eliminarla, **Then** la operacion no esta disponible.
7. **Given** un fallo de almacenamiento, **When** guarda o elimina, **Then** conserva el ultimo estado confirmado y ofrece reintentar.

---

### User Story 4 - Separar el contenido adulto (Priority: P2)

Como anfitrion, quiero que el contenido adulto permanezca excluido salvo activacion explicita para evitar mostrarlo accidentalmente.

**Why this priority**: La separacion protege la adecuacion del contenido sin impedir partidas generales.

**Independent Test**: Con el valor inicial desactivado, ningun modo de seleccion ni extraccion devuelve contenido adulto; tras confirmacion clara aparece separado y al desactivarlo vuelve a quedar excluido.

**Acceptance Scenarios**:

1. **Given** una instalacion nueva, **When** abre el catalogo, **Then** el modo adulto esta desactivado.
2. **Given** el modo adulto desactivado, **When** selecciona todas o categoria aleatoria, **Then** ningun contenido adulto es elegible.
3. **Given** una activacion explicita, **When** confirma tras una explicacion clara, **Then** las categorias adultas aparecen identificadas y separadas.
4. **Given** contenido adulto seleccionado, **When** desactiva el modo antes de confirmar, **Then** queda fuera del pool efectivo.
5. **Given** una categoria personalizada, **When** la marca como adulta, **Then** se somete a las mismas reglas de visibilidad.

### Edge Cases

- Una categoria integrada esta vacia o no alcanza el minimo editorial esperado.
- Una seleccion contiene categorias eliminadas, incompatibles o deshabilitadas.
- Solo quedan conceptos usados en algunas categorias del pool.
- En modo aleatorio quedan conceptos en el pool, pero algunas categorias ya estan agotadas.
- Un concepto aparece con el mismo texto en categorias distintas.
- Se renombra un concepto que ya figura en el historial de una partida.
- Se elimina una categoria personalizada incluida en un pool ya confirmado.
- Se intenta guardar una categoria vacia, con duplicados o con nombre equivalente a otra personalizada.
- Se desactiva el modo adulto mientras existe una seleccion adulta sin confirmar.
- Se cierra la aplicacion durante una extraccion o un reinicio de historial.
- Dos pestañas intentan extraer contenido o modificar el mismo historial.
- Una actualizacion cambia el catalogo integrado mientras existe una partida recuperable.
- Una partida requiere mas conceptos que los disponibles sin repetir.

## Requirements

### Functional Requirements

- **FR-001**: La aplicacion MUST incluir Animales, Comida y bebida, Lugares y viajes, Cine y series, Musica, Deportes, Profesiones, Objetos cotidianos, Tecnologia, Personajes famosos, Videojuegos, Naturaleza, Cultura general, Palabras absurdas y contenido adulto.
- **FR-002**: El catalogo integrado MUST ser editorial propio, empaquetado con la aplicacion y versionado.
- **FR-003**: Cada categoria integrada MUST contener al menos 10 conceptos validos y cada categoria y concepto MUST tener un identificador estable independiente de su texto.
- **FR-004**: Las categorias integradas MUST ser de solo lectura.
- **FR-005**: La aplicacion MUST permitir seleccion explicita de una o varias categorias y los modos todas y categoria aleatoria.
- **FR-006**: Todas MUST incluir las categorias habilitadas con conceptos validos y MUST excluir cualquier categoria adulta cuando el modo adulto esta desactivado.
- **FR-007**: Categoria aleatoria MUST elegir en cada ronda una categoria no agotada del pool y despues un concepto no usado de ella.
- **FR-008**: La seleccion MUST consumir un `PreparedGame` de IMP-3 y MUST validar que existen al menos tantos conceptos elegibles como rondas pendientes.
- **FR-009**: Confirmar una seleccion MUST producir un pool inmutable y versionado asociado a `PreparedGame.id`.
- **FR-010**: Cambios posteriores del catalogo o de la seleccion MUST NOT alterar un pool ya confirmado.
- **FR-011**: IMP-4 MUST exponer a IMP-5 una operacion atomica de extraccion que devuelve exactamente una categoria y un concepto o un error tipado.
- **FR-012**: La extraccion MUST marcar el concepto como usado en la misma confirmacion durable que devuelve el contenido.
- **FR-013**: Una extraccion fallida MUST NOT consumir ni revelar parcialmente un concepto.
- **FR-014**: Un concepto usado MUST NOT volver a entregarse dentro del historial activo de la misma partida.
- **FR-015**: El historial MUST estar aislado por `PreparedGame.id`, ser recuperable offline y guardar identificadores, nunca textos de conceptos.
- **FR-016**: El agotamiento MUST bloquear nuevas extracciones y MUST NOT reiniciar ni repetir contenido automaticamente.
- **FR-017**: Reiniciar el historial MUST requerir confirmacion y eliminar todo el historial de esa partida.
- **FR-018**: La aplicacion MUST permitir crear, renombrar, editar conceptos y eliminar categorias personalizadas.
- **FR-019**: Una categoria personalizada MUST tener un nombre unico y al menos un concepto valido.
- **FR-020**: Nombres y conceptos MUST normalizar espacios y compararse en español sin distinguir mayusculas; los acentos siguen siendo significativos.
- **FR-021**: Los conceptos MUST ser unicos solamente dentro de su categoria; textos iguales en categorias distintas MUST ser validos.
- **FR-022**: Los conceptos personalizados MUST conservar su identificador al editar el texto.
- **FR-023**: Eliminar una categoria personalizada MUST requerir confirmacion; sus IDs huerfanos MUST limpiarse al reiniciar o descartar el historial, sin alterar pools ni historiales confirmados activos y sin conservar tombstones permanentes.
- **FR-024**: Eliminar o editar una categoria MUST NOT modificar pools ya confirmados.
- **FR-025**: Las categorias personalizadas MUST persistir localmente y sobrevivir cierre, reapertura y uso offline.
- **FR-026**: Una categoria personalizada MUST poder marcarse como adulta y MUST ser general por defecto.
- **FR-027**: El modo adulto MUST estar desactivado por defecto y persistir como preferencia local.
- **FR-028**: El contenido adulto integrado MUST usar conceptos no explicitos apropiados para grupos adultos y permanecer separado del contenido general.
- **FR-029**: Activar el modo adulto MUST requerir una accion explicita y una confirmacion clara sobre el tipo de contenido que habilita.
- **FR-030**: Desactivar el modo adulto MUST excluir inmediatamente todo contenido adulto de selecciones no confirmadas.
- **FR-031**: IMP-4 MUST NOT asignar roles, revelar contenido a jugadores ni iniciar rondas.
- **FR-032**: Los fallos de lectura, escritura, cuota, version, revision o permiso de escritor MUST conservar el estado anterior y ofrecer recuperacion segura.
- **FR-033**: Ningun concepto MUST aparecer en URL, historial de navegacion, logs, telemetria ni errores externos.
- **FR-034**: Catalogo, seleccion, historial y contenido personalizado MUST funcionar completamente offline.
- **FR-035**: La interfaz MUST ser accesible en vertical, sin overflow y distinguir semanticamente contenido integrado, personalizado y adulto.

### Key Entities

- **Categoria integrada**: Contenido editorial versionado y de solo lectura incluido en la aplicacion.
- **Categoria personalizada**: Contenido local editable con indicador adulto, conceptos y metadatos versionados.
- **Concepto**: Elemento identificable dentro de una categoria; su texto es secreto durante la partida.
- **Seleccion de contenido**: Modo y categorias elegidas antes de confirmar una partida.
- **Pool confirmado**: Copia inmutable de categorias y conceptos elegibles asociada a `PreparedGame.id`.
- **Historial de partida**: Identificadores de conceptos extraidos dentro del scope de `PreparedGame.id`.
- **Contenido de ronda**: Categoria y concepto obtenidos por una extraccion atomica para IMP-5.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100 % de las 15 categorias integradas contiene al menos 10 conceptos y esta disponible offline tras la primera carga.
- **SC-002**: El 100 % de selecciones validas produce pools compuestos exclusivamente por categorias habilitadas.
- **SC-003**: En una prueba que consume un pool completo, cero identificadores se repite antes del agotamiento.
- **SC-004**: El 100 % de extracciones fallidas conserva sin cambios el historial durable.
- **SC-005**: El 100 % de solicitudes sobre un pool agotado queda bloqueado hasta un reinicio manual confirmado.
- **SC-006**: Dos partidas con el mismo pool conservan historiales independientes en el 100 % de la matriz de recuperacion.
- **SC-007**: El 100 % de categorias personalizadas confirmadas conserva nombre, conceptos e identificadores tras reapertura offline.
- **SC-008**: Con modo adulto desactivado, cero selecciones o extracciones de la matriz devuelve contenido adulto.
- **SC-009**: El 100 % de fallos simulados conserva la ultima version confirmada y ofrece reintento o salida segura.
- **SC-010**: Una persona puede seleccionar categorias y confirmar contenido suficiente para una partida configurada en menos de 30 segundos.
- **SC-011**: Todos los recorridos pasan controles automatizados de teclado, semantica, contraste y ausencia de overflow movil.

## Assumptions

- El catalogo integrado se crea editorialmente para ImpostorApp y no depende de licencias ni descargas de terceros.
- Los conceptos adultos son sugerentes o maduros, pero no explicitos, y estan pensados para grupos adultos.
- El historial pertenece a una partida preparada concreta; una partida nueva comienza con historial vacio.
- El reinicio manual afecta al historial completo de esa partida, no a categorias individuales.
- Textos iguales en categorias distintas representan conceptos distintos.
- La eliminacion de contenido personalizado limpia referencias sin tombstones; no existe importacion en IMP-4.
- El sorteo aleatorio no necesita demostrar uniformidad estadistica, pero solo puede elegir opciones elegibles.
- Un pool confirmado conserva una copia estable aunque el contenido fuente cambie o se elimine.
- IMP-4 termina al confirmar el pool y ofrecer la extraccion atomica; IMP-5 controla la revelacion privada.
