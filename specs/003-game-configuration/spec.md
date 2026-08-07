# Feature Specification: Configuracion de partida

**Feature Branch**: `003-game-configuration`

**Created**: 2026-08-07

**Status**: Approved for planning

**Jira Epic**: `IMP-3`

**Input**: Permitir que el anfitrion configure las reglas y el ritmo de una partida a partir de una lista valida de jugadores, revise el resultado y confirme una configuracion estable para iniciar el juego.

## User Scenarios & Testing

### User Story 1 - Crear una configuracion valida rapidamente (Priority: P1)

Como anfitrion, quiero configurar el numero de rondas y de impostores con valores iniciales validos para preparar una partida sin conocer todas las opciones avanzadas.

**Why this priority**: Una configuracion valida es el contrato minimo necesario para que las futuras epicas puedan iniciar y ejecutar una partida.

**Independent Test**: Dada una lista preparada de 3 a 20 jugadores, la pantalla muestra valores iniciales validos, permite cambiar rondas e impostores dentro de sus limites y bloquea continuar cuando una combinacion deja de ser valida.

**Acceptance Scenarios**:

1. **Given** una lista preparada valida, **When** se abre la configuracion, **Then** se seleccionan inicialmente 3 rondas y 1 impostor.
2. **Given** una configuracion valida, **When** el anfitrion cambia las rondas a un valor entre 1 y 10, **Then** el valor queda seleccionado y la configuracion sigue siendo valida.
3. **Given** una lista de `N` jugadores, **When** se configura el numero de impostores, **Then** solo se admiten valores entre 1 y `min(3, floor(N / 3))`.
4. **Given** una entrada fuera de rango, **When** se intenta aplicar, **Then** se conserva el ultimo valor valido y se muestra una explicacion accionable.
5. **Given** que la lista de jugadores deja de coincidir con la usada para configurar, **When** el anfitrion intenta continuar, **Then** debe volver a validar la configuracion con la nueva lista.

---

### User Story 2 - Configurar el ritmo y la participacion (Priority: P2)

Como anfitrion, quiero decidir como se organiza cada ronda para adaptar la partida al tiempo y al estilo del grupo.

**Why this priority**: Estas opciones permiten partidas breves, estructuradas o informales sin alterar las reglas esenciales.

**Independent Test**: Se puede elegir conversacion libre o temporizada, establecer el orden de participacion, elegir votacion verbal o secreta y permitir una acusacion final; cada dependencia se representa de forma predecible.

**Acceptance Scenarios**:

1. **Given** una configuracion nueva, **When** se muestra el ritmo, **Then** la conversacion libre, el orden de la lista, la votacion verbal y el ultimo intento desactivado son los valores iniciales.
2. **Given** conversacion temporizada, **When** se elige una duracion predefinida de 60, 90 o 120 segundos, **Then** la duracion queda asociada a cada ronda.
3. **Given** conversacion temporizada, **When** se introduce una duracion personalizada, **Then** solo se aceptan valores de 30 a 600 segundos en pasos de 30.
4. **Given** la configuracion de participacion, **When** se elige un orden, **Then** se puede seleccionar libre, orden de la lista o aleatorio por ronda.
5. **Given** la configuracion de votacion, **When** el anfitrion cambia el metodo, **Then** puede seleccionar votacion verbal o votacion secreta.
6. **Given** votacion secreta, **When** una epica futura ejecute la votacion, **Then** cada jugador registra su voto privadamente en el dispositivo sin mostrarlo a los demas antes del recuento.
7. **Given** ultimo intento activado, **When** una epica futura resuelva la eliminacion, **Then** el jugador eliminado puede realizar una acusacion final antes de cerrar la ronda.

---

### User Story 3 - Configurar varios impostores (Priority: P2)

Como anfitrion, quiero definir como se asignan y coordinan varios impostores para ajustar la dificultad y la dinamica de grupos grandes.

**Why this priority**: La opcion solo afecta a partidas con varios impostores, pero sus decisiones deben quedar fijadas antes de iniciar el juego.

**Independent Test**: Con dos o mas impostores se pueden configurar asignacion, conocimiento mutuo y forma de resolver su participacion; con un solo impostor las opciones incompatibles quedan deshabilitadas sin producir un estado ambiguo.

**Acceptance Scenarios**:

1. **Given** dos o mas impostores, **When** se muestran sus opciones, **Then** la asignacion aleatoria, el desconocimiento mutuo y la resolucion unica son los valores iniciales.
2. **Given** dos o mas impostores, **When** se configura la asignacion, **Then** se puede elegir aleatoria o equilibrada.
3. **Given** dos o mas impostores, **When** se configura su visibilidad, **Then** se puede indicar si conocen o desconocen la identidad de los demas impostores.
4. **Given** dos o mas impostores, **When** se configura su participacion, **Then** se puede elegir resolucion unica o turnos sucesivos.
5. **Given** un solo impostor, **When** se muestra la configuracion avanzada, **Then** conocimiento mutuo y resolucion multiple permanecen deshabilitados y usan valores neutrales.
6. **Given** una configuracion equilibrada, **When** se confirma, **Then** el contrato expresa la politica elegida sin seleccionar todavia jugadores concretos.

---

### User Story 4 - Revisar y confirmar la configuracion (Priority: P1)

Como anfitrion, quiero revisar jugadores y reglas antes de confirmar para evitar iniciar una partida con opciones equivocadas.

**Why this priority**: La confirmacion crea el limite transaccional entre la preparacion editable y la futura partida activa.

**Independent Test**: Una configuracion valida puede revisarse y confirmarse; el resultado es una copia inmutable y versionada que no cambia al modificar posteriormente el formulario o la lista de preparacion.

**Acceptance Scenarios**:

1. **Given** una configuracion valida, **When** el anfitrion abre la revision, **Then** ve los jugadores en orden y un resumen de todas las reglas efectivas.
2. **Given** el resumen, **When** vuelve a editar, **Then** conserva los valores introducidos y todavia no existe una configuracion confirmada nueva.
3. **Given** el resumen valido, **When** confirma, **Then** se crea exactamente un snapshot inmutable con lista, reglas, version e identificador propios.
4. **Given** una confirmacion en curso, **When** se pulsa de nuevo, **Then** no se crean snapshots duplicados.
5. **Given** un fallo de persistencia, **When** termina la confirmacion, **Then** la configuracion editable permanece intacta y se ofrecen reintento o regreso seguro.
6. **Given** un snapshot confirmado, **When** cambia el borrador de jugadores, **Then** el snapshot conserva los jugadores y reglas confirmados originalmente.

### Edge Cases

- La lista preparada contiene menos de 3, mas de 20, posiciones discontinuas o identificadores duplicados.
- El numero de impostores valido cambia porque se modifica la cantidad de jugadores.
- El anfitrion reduce los impostores de varios a uno despues de configurar opciones avanzadas.
- Una duracion personalizada queda vacia, contiene decimales, no es multiplo de 30 o se encuentra fuera del rango.
- La aplicacion se cierra durante la edicion o durante la confirmacion.
- El anfitrion pulsa confirmar repetidamente o desde dos pestañas.
- Se pierde el permiso de escritor mientras la configuracion esta abierta.
- Un snapshot almacenado tiene una version desconocida o datos incompatibles.
- La revision debe representar los valores efectivos, incluidos los valores neutrales de opciones deshabilitadas.
- La interfaz debe conservar su estructura sin overflow con 20 jugadores y los textos accesibles ampliados.

## Requirements

### Functional Requirements

- **FR-001**: La configuracion MUST consumir un `PreparedRoster` valido mediante el contrato estable de IMP-2 y MUST NOT depender de componentes de interfaz ni de registros de almacenamiento de IMP-2.
- **FR-002**: La configuracion MUST copiar jugadores, identificadores y orden del roster recibido sin modificarlos.
- **FR-003**: El anfitrion MUST poder configurar entre 1 y 10 rondas inclusive.
- **FR-004**: El numero inicial de rondas MUST ser 3.
- **FR-005**: El anfitrion MUST poder configurar entre 1 y `min(3, floor(N / 3))` impostores, donde `N` es la cantidad de jugadores.
- **FR-006**: El numero inicial de impostores MUST ser 1.
- **FR-007**: La configuracion MUST permitir conversacion libre o temporizada por ronda y MUST seleccionar conversacion libre inicialmente.
- **FR-008**: La conversacion temporizada MUST ofrecer 60, 90 y 120 segundos y MUST admitir duraciones enteras de 30 a 600 segundos en pasos de 30.
- **FR-009**: La configuracion MUST permitir participacion libre, en orden de la lista o en orden aleatorio por ronda y MUST seleccionar el orden de la lista inicialmente.
- **FR-010**: La configuracion MUST permitir votacion verbal o secreta y MUST seleccionar votacion verbal inicialmente.
- **FR-011**: La votacion secreta MUST representar el registro privado en el dispositivo de un voto por jugador, sin revelar votos individuales antes del recuento; su ejecucion pertenece a una epica posterior.
- **FR-012**: La configuracion MUST permitir activar o desactivar un ultimo intento y MUST desactivarlo inicialmente.
- **FR-013**: El ultimo intento MUST representar una acusacion final del jugador eliminado antes de cerrar la ronda; su ejecucion pertenece a una epica posterior.
- **FR-014**: Con varios impostores, la configuracion MUST permitir una politica de asignacion aleatoria o equilibrada y MUST seleccionar aleatoria inicialmente.
- **FR-015**: La politica equilibrada MUST expresar la intencion de minimizar repeticiones antes de reutilizar participantes, pero IMP-3 MUST NOT asignar roles concretos.
- **FR-016**: Con varios impostores, la configuracion MUST permitir indicar si conocen o desconocen la identidad de los demas impostores y MUST seleccionar desconocen inicialmente.
- **FR-017**: Con varios impostores, la configuracion MUST permitir resolucion unica o participaciones sucesivas y MUST seleccionar resolucion unica inicialmente.
- **FR-018**: Con un impostor, las opciones exclusivas de multiples impostores MUST quedar deshabilitadas y MUST producir valores efectivos neutrales y deterministas.
- **FR-019**: Cada operacion invalida MUST conservar el ultimo estado valido y mostrar un error junto al control afectado.
- **FR-020**: La aplicacion MUST mostrar una revision de jugadores ordenados y reglas efectivas antes de confirmar.
- **FR-021**: Confirmar MUST producir un snapshot inmutable con identificador, version de esquema, fecha de creacion, copia del roster y reglas efectivas.
- **FR-022**: El snapshot MUST exponer un contrato estable e independiente de la interfaz y la persistencia para las epicas que ejecuten la partida.
- **FR-023**: La confirmacion MUST ser atomica, idempotente durante una operacion en curso y respetar el permiso de escritor unico.
- **FR-024**: Un snapshot confirmado MUST persistir localmente como estado recuperable y permanecer disponible tras cierre y reapertura offline.
- **FR-025**: Un fallo de lectura, escritura, cuota o compatibilidad MUST conservar el borrador y ofrecer una accion de recuperacion o salida segura.
- **FR-026**: Los nombres de jugadores, reglas privadas, votos y futuros roles MUST NOT aparecer en URL, telemetria, logs tecnicos ni errores externos.
- **FR-027**: El recorrido completo MUST funcionar offline, en vertical, sin desplazamiento horizontal y con controles tactiles y nombres accesibles.
- **FR-028**: IMP-3 MUST NOT seleccionar impostores, conceptos, turnos, votos ni resultados; solamente valida y confirma las reglas que consumiran epicas posteriores.

### Key Entities

- **Borrador de configuracion**: Estado editable asociado a una copia del roster y compuesto por reglas solicitadas y errores de validacion.
- **Reglas de ritmo**: Modo y duracion de conversacion, orden de participacion, tipo de votacion y ultimo intento.
- **Reglas de impostores**: Cantidad, politica de asignacion, conocimiento mutuo y resolucion unica o sucesiva.
- **Snapshot de configuracion**: Copia inmutable y versionada del roster y de todas las reglas efectivas confirmadas.
- **Resultado de validacion**: Errores tipados por campo o dependencia que no contienen nombres, votos ni informacion privada.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100 % de combinaciones validas de jugadores, rondas e impostores de la matriz de limites puede llegar a revision.
- **SC-002**: El 100 % de valores fuera de rango conserva el ultimo estado valido y muestra una explicacion accionable.
- **SC-003**: Una persona puede obtener una configuracion valida con los valores iniciales y llegar a revision en menos de 20 segundos desde un roster preparado.
- **SC-004**: El 100 % de dependencias entre cantidad de jugadores, impostores y opciones de multiples impostores produce valores efectivos deterministas.
- **SC-005**: El 100 % de snapshots confirmados conserva roster, orden y reglas tras cierre y reapertura offline.
- **SC-006**: Cero cambios posteriores del formulario o del roster modifica un snapshot ya confirmado.
- **SC-007**: El 100 % de fallos simulados de almacenamiento conserva el borrador y ofrece reintento o salida segura.
- **SC-008**: Todos los recorridos de IMP-3 pasan las pruebas automatizadas de teclado, semantica accesible, contraste y ausencia de overflow en los viewports moviles soportados.

## Assumptions

- Los limites aprobados son 1-10 rondas, 1-3 impostores y 30-600 segundos en pasos de 30.
- La formula `min(3, floor(N / 3))` garantiza al menos dos jugadores no impostores por cada impostor.
- La politica equilibrada se evalua al asignar roles en una epica posterior; IMP-3 solo la registra.
- Resolucion unica significa una accion compartida por ronda; sucesiva significa una accion separada por cada impostor. La ejecucion concreta pertenece a la futura maquina de estados.
- El ultimo intento es una acusacion final del jugador eliminado antes de cerrar la ronda; no cambia el resultado de la votacion ya resuelta.
- En voto secreto el dispositivo se pasa entre jugadores y oculta cada voto confirmado hasta el recuento; IMP-3 solo registra esta regla.
- La configuracion no conserva preferencias independientes entre partidas. Solo persiste el borrador recuperable y el snapshot confirmado.
- Cambiar jugadores despues de entrar en configuracion invalida la revision anterior y requiere crear un snapshot nuevo.
- La aleatoriedad y su semilla pertenecen al inicio o ejecucion de partida, no al snapshot de configuracion.
- IMP-3 termina al entregar un snapshot valido; no asigna roles ni inicia una ronda.
