# Feature Specification: Asignacion secreta y revelacion segura de roles

**Feature Branch**: `005-secret-role-assignment`

**Created**: 2026-08-07

**Status**: Approved for planning

**Jira Epic**: `IMP-5`

**Input**: Repartir conceptos y roles con privacidad utilizando un unico movil compartido. Cada
jugador pulsa su nombre y accede a una pantalla privada que muestra la categoria y una cortinilla
con "Pulsa para ver el concepto". Tras pulsar vera el concepto o "IMPOSTOR"; una segunda pulsacion
lo ocultara y regresara a la lista. Los nombres completados quedaran grises y bloqueados. Al
terminar aparecera "Empezar ronda".

## User Scenarios & Testing

### User Story 1 - Asignar roles y reservar el contenido secreto de la ronda (Priority: P1)

Como aplicacion, quiero preparar de forma atomica el concepto y las asignaciones secretas a partir
de los snapshots confirmados de IMP-3 (`PreparedGame`) e IMP-4 (`DrawResult`) para que la ronda
tenga un unico estado secreto valido antes de que nadie consulte nada.

**Why this priority**: Ninguna revelacion privada ni inicio de ronda puede existir sin una
asignacion secreta ya persistida de forma atomica; es el cimiento del resto de la epica.

**Independent Test**: Con un `PreparedGame` y un `DrawResult` validos, confirmar la asignacion
produce un snapshot secreto inmutable con exactamente `impostorCount` impostores sin IDs repetidos,
o falla sin persistir ningun estado parcial.

**Acceptance Scenarios**:

1. **Given** un `PreparedGame` confirmado con `impostorCount` y `allocation`, **When** se prepara la
   ronda, **Then** se asigna exactamente el numero configurado de impostores sin identificadores de
   jugador repetidos.
2. **Given** una preparacion de ronda, **When** se confirma, **Then** el draw de IMP-4, el
   historial de conceptos y el snapshot secreto se persisten en una unica transaccion durable.
3. **Given** la misma preparacion, **When** la asignacion usa la fuente de aleatoriedad inyectada,
   **Then** el resultado es reproducible en pruebas y respeta `allocation` (random o balanced).
4. **Given** un fallo durante la persistencia, **When** se reintenta, **Then** no queda ninguna
   ronda parcial ni un secreto visible antes de la confirmacion durable.
5. **Given** una confirmacion ya durable, **When** se repite la misma operacion de preparacion,
   **Then** el resultado es idempotente y no genera una segunda asignacion ni un segundo draw.
6. **Given** un snapshot secreto confirmado, **When** se lee su version, **Then** incluye
   `schemaVersion` y es recuperable offline sin exponer su contenido fuera de un contexto privado.

---

### User Story 2 - Completar la entrega privada pasando un unico dispositivo (Priority: P1)

Como grupo compartiendo un movil, quiero que cada jugador pulse su nombre, vea su informacion en
una pantalla privada cubierta y la oculte de nuevo, para que el secreto solo exista en el instante
en que el dueno del rol lo consulta.

**Why this priority**: Es el mecanismo central de privacidad de la epica: sin una entrega privada
fiable, el juego no puede repartirse en un dispositivo compartido.

**Independent Test**: Con una asignacion secreta confirmada, pulsar un nombre no completado abre su
vista privada cubierta; revelar persiste el estado completado antes de mostrar contenido; ocultar
desmonta el contenido secreto sin permitir una segunda consulta.

**Acceptance Scenarios**:

1. **Given** la lista compartida, **When** se muestra antes de cualquier consulta, **Then** solo
   expone nombre, orden y estado de cada jugador, nunca categoria, concepto o rol.
2. **Given** un jugador no completado, **When** pulsa su nombre, **Then** accede a una vista privada
   que muestra la categoria y mantiene el concepto o rol cubierto con "Pulsa para ver el concepto".
3. **Given** la vista privada cubierta, **When** pulsa para revelar, **Then** el estado completado se
   persiste de forma durable antes de mostrar la categoria y el concepto o "IMPOSTOR".
4. **Given** el contenido revelado, **When** pulsa de nuevo para ocultar, **Then** el contenido
   secreto se desmonta del DOM y la aplicacion vuelve a la lista compartida.
5. **Given** un jugador completado, **When** se muestra en la lista, **Then** aparece atenuado y
   bloqueado sin permitir una nueva consulta.
6. **Given** un jugador ya completado, **When** recarga la pagina, navega o pulsa dos veces su
   nombre, **Then** ninguna accion permite repetir su consulta ni le muestra el secreto de nuevo.

---

### User Story 3 - Habilitar el inicio solo cuando todos esten preparados (Priority: P1)

Como grupo, quiero que "Empezar ronda" permanezca bloqueado hasta que todos los jugadores hayan
completado su revelacion, para que IMP-6 reciba siempre una ronda estable y sin ambiguedad.

**Why this priority**: Sin esta compuerta, una ronda podria comenzar con jugadores que aun no
conocen su rol, rompiendo la mecanica del juego.

**Independent Test**: Con N jugadores en la asignacion, el boton de inicio permanece bloqueado
mientras el progreso publico marca menos de N/N completados; al llegar a N/N se habilita y la
transicion hacia IMP-6 es idempotente.

**Acceptance Scenarios**:

1. **Given** una ronda en reparto, **When** se muestra el progreso publico, **Then** indica cuantos
   jugadores han completado su revelacion sin revelar roles ni contenido.
2. **Given** menos de N/N jugadores completados, **When** se intenta iniciar la ronda, **Then**
   "Empezar ronda" permanece deshabilitado.
3. **Given** N/N jugadores completados, **When** se pulsa "Empezar ronda", **Then** la aplicacion
   entrega la ronda a IMP-6 sin exponer secretos en URL, navegacion, errores o registros.
4. **Given** una transicion de inicio ya confirmada, **When** se repite la accion, **Then** el
   resultado es idempotente y no reinicia ni duplica el reparto.
5. **Given** un dispositivo en modo observador, **When** consulta el estado de la ronda, **Then**
   solo puede ver el progreso publico, nunca contenido privado.

---

### User Story 4 - Informar de forma segura a varios impostores (Priority: P2)

Como impostor en una partida con mas de un impostor, quiero conocer o no a mis companeros segun la
politica configurada en IMP-3, para que la informacion compartida respete exactamente lo que el
grupo acordo antes de jugar.

**Why this priority**: Solo aplica a partidas con dos o mas impostores; el reparto de un unico
impostor ya funciona sin esta politica, por lo que no es indispensable para el MVP de la epica.

**Independent Test**: Con `impostorAwareness` en `unknown`, cada impostor ve unicamente "IMPOSTOR" y
su categoria; con `known`, ve ademas los nombres de sus companeros impostores; los ciudadanos nunca
reciben esa lista en ningun caso.

**Acceptance Scenarios**:

1. **Given** `impostorAwareness` en `unknown`, **When** un impostor revela su vista privada,
   **Then** solo ve "IMPOSTOR" y la categoria, sin nombres de companeros.
2. **Given** `impostorAwareness` en `known`, **When** un impostor revela su vista privada, **Then**
   ve unicamente los nombres de los otros jugadores impostores, sin su concepto ni el de nadie mas.
3. **Given** cualquier politica, **When** un ciudadano revela su vista privada, **Then** nunca recibe
   la lista de impostores.
4. **Given** un unico impostor configurado, **When** revela su vista privada, **Then** su lista de
   companeros esta normalizada a vacia independientemente de la politica.
5. **Given** partidas con uno, dos y tres impostores, **When** se ejecutan las pruebas de la
   politica, **Then** ninguna superficie publica filtra el numero ni la identidad de los impostores.

---

### User Story 5 - Recuperar una revelacion interrumpida sin filtrar secretos (Priority: P2)

Como grupo jugando offline, quiero cerrar y reabrir la aplicacion durante el reparto sin perder el
progreso ni alterar los roles ya asignados, para que un cierre accidental no obligue a repetir la
preparacion de la ronda.

**Why this priority**: La recuperacion offline es un requisito transversal de la aplicacion, pero
solo se vuelve relevante una vez que existe un reparto secreto que proteger; por eso se completa
despues de las historias que crean y consumen ese reparto.

**Independent Test**: Cerrar la aplicacion durante el reparto y reabrirla restaura la misma
asignacion, el mismo concepto y los mismos jugadores completados sin volver a ejecutar el RNG ni
reabrir automaticamente una vista privada ya confirmada.

**Acceptance Scenarios**:

1. **Given** un reparto en curso, **When** la aplicacion se cierra y se reabre offline, **Then**
   conserva la asignacion, el concepto y los jugadores completados sin repetir la aleatoriedad.
2. **Given** cualquier reapertura, **When** la aplicacion carga, **Then** siempre presenta primero
   una superficie compartida segura, nunca una vista privada abierta automaticamente.
3. **Given** una consulta ya confirmada antes del cierre, **When** la aplicacion se reabre, **Then**
   ese jugador permanece bloqueado y no puede repetir su consulta.
4. **Given** un conflicto de revision durante la recuperacion, **When** se resuelve, **Then**
   prevalece el ultimo snapshot secreto confirmado.
5. **Given** datos de reparto con una version incompatible, **When** se detectan, **Then** la
   aplicacion entra en modo seguro y ningun mensaje de error contiene contenido secreto.

### Edge Cases

- La confirmacion de IMP-4 falla despues de asignar roles en memoria pero antes de persistir.
- Dos pestanas intentan completar la revelacion del mismo jugador simultaneamente.
- Un jugador cierra la vista privada arrastrando o navegando hacia atras en vez de pulsar ocultar.
- `impostorCount` es igual al numero de jugadores menos uno, dejando un unico ciudadano.
- `allocation` balanced con un historial previo de otras rondas de la misma partida.
- La aplicacion se cierra exactamente entre "revelar confirmado" y "contenido mostrado".
- Se intenta iniciar la ronda con un progreso publico manipulado o desincronizado del estado real.
- Un dispositivo en modo observador intenta acceder a una URL de vista privada directamente.
- Cambia `impostorAwareness` en una configuracion mientras existe un reparto ya confirmado de una
  partida anterior con la politica previa.
- El almacenamiento rechaza la escritura del snapshot secreto por cuota o permiso de escritor.
- Una recuperacion encuentra un snapshot secreto sin su `DrawResult` asociado o viceversa.

## Requirements

### Functional Requirements

- **FR-001**: IMP-5 MUST consumir el `PreparedGame` confirmado de IMP-3 y el `DrawResult` atomico de
  IMP-4 para preparar cada ronda; MUST NOT redefinir reglas de configuracion ni de contenido.
- **FR-002**: La preparacion de ronda MUST asignar exactamente `impostorCount` impostores sin
  identificadores de jugador repetidos, respetando `allocation` (random o balanced).
- **FR-003**: La asignacion MUST usar una fuente de aleatoriedad inyectable para permitir pruebas
  deterministas y reproducibles.
- **FR-004**: La confirmacion de una ronda MUST persistir el draw de contenido, el historial de
  conceptos y el snapshot secreto de asignacion en una unica transaccion durable.
- **FR-005**: Una preparacion fallida MUST NOT dejar rondas parciales ni exponer ningun secreto
  antes de que la persistencia se confirme.
- **FR-006**: Repetir la operacion de preparacion sobre una ronda ya confirmada MUST ser idempotente
  y MUST NOT generar una segunda asignacion ni un segundo draw.
- **FR-007**: El snapshot secreto MUST ser versionado (`schemaVersion`) y recuperable offline.
- **FR-008**: La superficie compartida MUST mostrar unicamente nombre, orden y estado de cada
  jugador; MUST NOT mostrar categoria, concepto ni rol en ningun momento.
- **FR-009**: La vista privada de un jugador MUST mostrar la categoria y comenzar con el concepto o
  rol cubierto mediante una llamada a la accion explicita.
- **FR-010**: Revelar MUST persistir el estado completado de forma durable antes de mostrar el
  concepto o "IMPOSTOR".
- **FR-011**: Ocultar MUST desmontar el contenido secreto del DOM y devolver a la lista compartida.
- **FR-012**: Un jugador completado MUST aparecer atenuado y bloqueado, y MUST NOT poder repetir su
  consulta mediante recarga, navegacion o pulsaciones adicionales.
- **FR-013**: El progreso publico MUST comunicar cuantos jugadores han completado su revelacion sin
  revelar roles ni contenido.
- **FR-014**: "Empezar ronda" MUST permanecer deshabilitado hasta que todos los jugadores completen
  su revelacion (N/N) y MUST ser una transicion idempotente hacia IMP-6.
- **FR-015**: El handoff hacia IMP-6 MUST NOT exponer secretos en URL, historial de navegacion,
  mensajes de error o registros.
- **FR-016**: Un dispositivo en modo observador MUST NOT poder acceder a contenido privado y MUST
  quedar limitado al progreso publico.
- **FR-017**: Con `impostorAwareness` en `unknown`, cada impostor MUST ver unicamente "IMPOSTOR" y
  su categoria, sin nombres de companeros.
- **FR-018**: Con `impostorAwareness` en `known`, cada impostor MUST ver unicamente los nombres de
  los demas impostores, sin exponer su concepto ni el de otros jugadores.
- **FR-019**: Los ciudadanos MUST NOT recibir en ningun caso la lista de impostores.
- **FR-020**: Con un unico impostor configurado, la lista de companeros impostores MUST
  normalizarse a vacia independientemente de `impostorAwareness`.
- **FR-021**: La recuperacion tras cierre o recarga MUST restaurar la misma asignacion y el mismo
  concepto sin volver a ejecutar la fuente de aleatoriedad.
- **FR-022**: Toda reapertura de la aplicacion MUST presentar primero una superficie compartida
  segura; MUST NOT reabrir automaticamente una vista privada.
- **FR-023**: Una consulta ya confirmada antes de un cierre MUST permanecer bloqueada tras la
  reapertura.
- **FR-024**: Un conflicto de revision durante la recuperacion MUST resolverse a favor del ultimo
  snapshot secreto confirmado.
- **FR-025**: Datos de reparto con una version incompatible MUST activar un modo seguro sin eliminar
  informacion y sin exponer contenido secreto en ningun mensaje de error.
- **FR-026**: Ningun concepto, rol o companero impostor MUST aparecer en URL, historial de
  navegacion, logs, telemetria ni errores externos.
- **FR-027**: El reparto y la revelacion MUST funcionar completamente offline tras la primera carga.
- **FR-028**: La interfaz MUST ser accesible en vertical, sin overflow, con foco visible y nombres
  semanticos que distingan la superficie compartida de la vista privada para tecnologia asistiva.

### Key Entities

- **RoleAssignment**: Asociacion secreta entre `playerId` y rol (`citizen` o `impostor`) para una
  ronda, generada con RNG inyectable a partir de `PreparedGame` y `allocation`.
- **SecretRoundSnapshot**: Copia inmutable y versionada que combina `RoleAssignment`, el
  `DrawResult` de IMP-4 y la politica de `impostorAwareness` resuelta; unica fuente de verdad
  secreta de la ronda.
- **RevealState**: Estado por jugador (`pending` o `completed`) que registra si ya consulto su
  vista privada, sin almacenar el contenido mostrado.
- **PublicRoundProgress**: Vista agregada y segura de `RevealState` (N/N completados) apta para la
  superficie compartida y el modo observador.
- **RoundHandoff**: Entrega estable hacia IMP-6 una vez que todos los jugadores completan su
  revelacion; no contiene roles ni contenido secreto.

## Success Criteria

### Measurable Outcomes

- **SC-001**: El 100 % de las asignaciones confirmadas contiene exactamente `impostorCount`
  impostores sin identificadores repetidos.
- **SC-002**: Cero secretos aparecen en la superficie compartida en el 100 % de una matriz de
  pruebas de estado publico.
- **SC-003**: El 100 % de los jugadores solo puede completar su revelacion una unica vez, incluso
  ante recarga, navegacion o doble pulsacion.
- **SC-004**: "Empezar ronda" permanece bloqueado en el 100 % de los estados con progreso menor a
  N/N y se habilita en el 100 % de los estados N/N.
- **SC-005**: En partidas de uno, dos y tres impostores, cero superficies publicas o de ciudadano
  filtran la identidad o el numero de impostores.
- **SC-006**: El 100 % de las reaperturas offline durante un reparto en curso conserva asignacion,
  concepto y completados sin repetir el RNG.
- **SC-007**: El 100 % de los fallos de persistencia simulados no deja rondas parciales ni secretos
  expuestos antes de la confirmacion durable.
- **SC-008**: Un jugador puede completar su consulta privada (pulsar, ver y ocultar) en menos de 10
  segundos en un dispositivo movil.
- **SC-009**: Todos los recorridos pasan controles automatizados de teclado, semantica, contraste y
  ausencia de overflow movil.

## Assumptions

- IMP-3 ya expone `PreparedGame` con `impostorCount`, `allocation` e `impostorAwareness`
  confirmados; IMP-5 no redefine ni valida de nuevo esas reglas.
- IMP-4 ya expone una operacion atomica de extraccion (`DrawResult`) que IMP-5 invoca una unica vez
  por ronda como parte de su propia transaccion de confirmacion.
- El snapshot secreto pertenece a una ronda concreta dentro de una partida preparada; una nueva
  ronda de la misma partida repite el flujo de preparacion desde el principio.
- El modo observador es un dispositivo adicional sin permiso de escritura, ya cubierto por el
  mecanismo de coordinacion multi-pestana existente en la plataforma.
- IMP-5 termina al entregar el `RoundHandoff` a IMP-6; el desarrollo de rondas, pistas y
  temporizador quedan fuera de esta especificacion.
- "Balanced" en `allocation` se apoya en el historial de asignaciones previas de la misma partida
  para repartir el rol de impostor de forma mas equitativa entre rondas, sin garantizar unicidad
  cuando el numero de rondas supera el de jugadores.
