# Feature Specification: Gestion de jugadores y grupos habituales

**Feature Branch**: `002-player-groups`

**Created**: 2026-08-07

**Status**: Approved for planning

**Jira Epic**: `IMP-2`

**Input**: Permitir que el anfitrion configure entre 3 y 20 participantes y reutilice grupos habituales sin cuentas ni sincronizacion.

## User Scenarios & Testing

### User Story 1 - Preparar los jugadores de una partida (Priority: P1)

Como anfitrion, quiero crear y ordenar la lista de participantes para iniciar una partida con las personas presentes.

**Why this priority**: Ninguna partida puede configurarse ni jugarse sin una lista valida de participantes.

**Independent Test**: Desde una instalacion vacia se pueden anadir, renombrar, reordenar y eliminar jugadores hasta obtener una lista valida de 3 a 20 personas, con una accion de continuar disponible solo cuando la lista cumple las reglas.

**Acceptance Scenarios**:

1. **Given** una lista vacia, **When** el anfitrion introduce tres nombres validos, **Then** ve los tres participantes en el orden de alta y puede continuar.
2. **Given** una lista valida, **When** el anfitrion renombra un jugador, **Then** el nuevo nombre aparece en la misma posicion.
3. **Given** varios jugadores, **When** el anfitrion mueve uno arriba o abajo, **Then** cambia exactamente una posicion y el resto conserva su orden relativo.
4. **Given** tres jugadores, **When** el anfitrion elimina uno, **Then** la lista se conserva pero continuar queda bloqueado con una explicacion de que faltan participantes.
5. **Given** veinte jugadores, **When** intenta anadir otro, **Then** no se modifica la lista y se explica el limite.
6. **Given** un nombre vacio o duplicado sin distinguir mayusculas ni espacios exteriores, **When** intenta guardarlo, **Then** no se modifica la lista y el campo muestra un error accionable.

---

### User Story 2 - Guardar y reutilizar un grupo habitual (Priority: P2)

Como anfitrion, quiero guardar una lista valida con un nombre reconocible para recuperarla en futuras partidas sin volver a escribir todos los participantes.

**Why this priority**: Reduce la preparacion repetitiva para grupos frecuentes y cumple el valor diferencial de la epica.

**Independent Test**: Una lista valida puede guardarse como grupo, la aplicacion puede cerrarse y reabrirse offline, y el grupo vuelve a estar disponible para cargar sus jugadores y su orden.

**Acceptance Scenarios**:

1. **Given** una lista valida, **When** se guarda con un nombre de grupo unico, **Then** aparece en grupos guardados con sus jugadores en el mismo orden.
2. **Given** un grupo guardado, **When** se carga, **Then** sustituye la lista de preparacion actual solo despues de confirmacion cuando esta contiene cambios.
3. **Given** un grupo guardado, **When** se edita su nombre o integrantes y se confirma, **Then** las futuras cargas usan la version actualizada.
4. **Given** un grupo guardado, **When** se elimina tras confirmacion, **Then** desaparece del catalogo sin modificar la lista de preparacion activa.
5. **Given** un reinicio offline de la aplicacion, **When** se abre la gestion de jugadores, **Then** los grupos confirmados siguen disponibles.

---

### User Story 3 - Recuperarse de errores de almacenamiento (Priority: P3)

Como anfitrion, quiero comprender si un grupo no pudo guardarse o cargarse para no creer que mis cambios estan protegidos cuando no lo estan.

**Why this priority**: La plataforma promete persistencia recuperable y no debe ocultar fallos de almacenamiento.

**Independent Test**: Al simular indisponibilidad o falta de espacio, la interfaz conserva la lista en memoria, informa del fallo sin datos tecnicos y permite reintentar o continuar sin guardar.

**Acceptance Scenarios**:

1. **Given** un fallo al guardar, **When** termina el intento, **Then** la lista activa permanece intacta y se ofrecen reintento y continuar sin guardar.
2. **Given** un grupo ilegible o incompatible, **When** se intenta cargar, **Then** no reemplaza la lista activa y se explica que el grupo no puede recuperarse.
3. **Given** una operacion de guardado en curso, **When** el anfitrion pulsa de nuevo, **Then** no se crean duplicados ni operaciones concurrentes visibles.

### Edge Cases

- Los nombres se normalizan eliminando espacios exteriores y colapsando espacios interiores repetidos.
- Dos nombres son duplicados si coinciden tras normalizacion y comparacion española sin distinguir mayusculas; los acentos siguen siendo significativos.
- Un nombre puede contener hasta 30 caracteres visibles y el nombre de un grupo hasta 40.
- Una lista con menos de 3 o mas de 20 jugadores puede editarse y conservarse temporalmente, pero no puede continuar ni guardarse como grupo.
- Eliminar o editar un grupo no altera silenciosamente la lista de preparacion ya cargada.
- Cargar un grupo sobre una lista modificada requiere confirmacion; una lista vacia puede sustituirse directamente.
- Los controles de ordenacion no hacen nada fuera de los extremos y comunican su estado deshabilitado.
- Una perdida del permiso de escritura mantiene la experiencia en modo lectura y no presenta cambios como persistidos.

## Requirements

### Functional Requirements

- **FR-001**: La aplicacion MUST permitir crear una lista local de jugadores en orden explicito.
- **FR-002**: Cada jugador MUST tener un identificador local estable independiente de su nombre y una posicion unica dentro de la lista.
- **FR-003**: La aplicacion MUST admitir listas validas de 3 a 20 jugadores inclusive.
- **FR-004**: El anfitrion MUST poder anadir, renombrar, eliminar y mover jugadores una posicion arriba o abajo.
- **FR-005**: Los nombres MUST normalizar espacios, tener entre 1 y 30 caracteres visibles y ser unicos dentro de la lista mediante comparacion española sin distinguir mayusculas.
- **FR-006**: Una operacion invalida MUST conservar el ultimo estado valido y mostrar junto al control una explicacion y una accion posible.
- **FR-007**: Continuar hacia la configuracion de partida MUST estar disponible solamente para listas validas.
- **FR-008**: El anfitrion MUST poder guardar una lista valida como grupo con nombre unico de entre 1 y 40 caracteres visibles.
- **FR-009**: Los grupos guardados MUST conservar identificador, nombre, jugadores ordenados y fechas de creacion y ultima modificacion.
- **FR-010**: El anfitrion MUST poder listar, cargar, renombrar, actualizar integrantes y eliminar grupos guardados.
- **FR-011**: Cargar un grupo MUST sustituir la lista activa de forma atomica y MUST requerir confirmacion si existen cambios activos no guardados.
- **FR-012**: Eliminar un grupo MUST requerir confirmacion y MUST NOT cambiar la lista activa.
- **FR-013**: Los grupos confirmados MUST persistir localmente y estar disponibles tras cerrar, reabrir y usar la aplicacion offline.
- **FR-014**: Los fallos de lectura, escritura, cuota o compatibilidad MUST conservar el estado activo, diferenciarse con mensajes comprensibles y ofrecer reintento o salida segura.
- **FR-015**: La aplicacion MUST impedir envios duplicados mientras una operacion persistente equivalente esta en curso.
- **FR-016**: Todas las operaciones MUST respetar el permiso de escritor unico de la plataforma y degradarse a lectura si se pierde.
- **FR-017**: La interfaz MUST ser utilizable en vertical, sin desplazamiento horizontal, con objetivos tactiles y nombres accesibles para alta, edicion, borrado y ordenacion.
- **FR-018**: Los datos MUST permanecer en el dispositivo y el flujo completo MUST funcionar offline sin cuentas, analitica ni servicios remotos.
- **FR-019**: Ningun nombre de jugador o grupo MUST aparecer en URL, logs tecnicos o mensajes de error externos.
- **FR-020**: La lista activa MUST exponerse mediante un contrato estable para que IMP-3 pueda consumirla sin depender de React ni IndexedDB.

### Key Entities

- **Jugador**: Participante local con identificador estable, nombre normalizado y posicion en la lista activa o en un grupo.
- **Lista de preparacion**: Borrador ordenado de jugadores que el anfitrion esta preparando; registra si contiene cambios no guardados y si cumple el rango permitido.
- **Grupo guardado**: Plantilla local identificada por nombre, con una copia ordenada de jugadores y metadatos de creacion y modificacion.
- **Resultado de validacion**: Errores tipados por campo y operacion que no contienen nombres ni otra informacion introducida por el usuario.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100 % de las listas con 3 a 20 nombres validos puede continuar y el 100 % de las listas fuera del rango queda bloqueado.
- **SC-002**: El 100 % de nombres vacios, demasiado largos o duplicados de la matriz de pruebas se rechaza sin perder el ultimo estado valido.
- **SC-003**: Crear, renombrar, reordenar y eliminar un jugador requiere como maximo una accion confirmatoria despues de seleccionar el jugador.
- **SC-004**: El 100 % de grupos confirmados en la matriz de persistencia conserva nombre, integrantes y orden tras cierre y reapertura offline.
- **SC-005**: El 100 % de cargas y borrados sobre datos activos aplica las confirmaciones definidas y nunca modifica silenciosamente otra lista.
- **SC-006**: El 100 % de fallos simulados de almacenamiento conserva la lista activa y presenta al menos una accion de recuperacion o salida segura.
- **SC-007**: Todos los recorridos de IMP-2 pasan las pruebas automatizadas de teclado, lector semantico, contraste y ausencia de overflow en los viewports moviles soportados.
- **SC-008**: Una persona puede recuperar un grupo guardado y dejar una lista lista para continuar en menos de 30 segundos, medido desde la pantalla inicial de gestion.

## Assumptions

- IMP-2 termina al entregar una lista valida a la futura configuracion de IMP-3; no inicia una partida.
- Los grupos representan plantillas y sus jugadores reciben identificadores nuevos al cargarse en una lista activa, evitando acoplar historiales futuros.
- No se permite guardar grupos con menos de 3 ni mas de 20 jugadores.
- Cargar un grupo sustituye la lista activa, no combina automaticamente participantes.
- La ordenacion inicial es la de alta y los controles accesibles de subir y bajar son suficientes para esta primera version.
- Solo existe una lista de preparacion activa en el dispositivo.
- La persistencia reutiliza los contratos, transacciones, migraciones y coordinacion de escritor de IMP-1.
