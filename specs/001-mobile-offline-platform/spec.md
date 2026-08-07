# Especificación de funcionalidad: Plataforma móvil instalable y offline

**Feature Branch**: `001-mobile-offline-platform`

**Created**: 2026-08-07

**Status**: Approved

**Jira Epic**: `IMP-1`

**Input**: Aplicación web instalable con experiencia móvil para iPhone y Android que, después de
una primera carga correcta, permita utilizar sin conexión todas las funciones incluidas en la
versión instalada y conserve de forma segura la información local del juego.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Jugar sin conexión después de la primera carga (Priority: P1)

Como anfitrión que ya ha abierto correctamente la aplicación al menos una vez, quiero poder abrirla
y utilizar todas las funciones disponibles aunque el móvil no tenga conexión, para jugar en
cualquier lugar sin depender de la cobertura.

**Why this priority**: El funcionamiento offline es una promesa central del producto y condiciona
todas las funcionalidades posteriores.

**Independent Test**: Se puede validar completando una primera carga con conexión, activando el
modo avión, cerrando la aplicación, volviéndola a abrir y recorriendo todas las pantallas y acciones
disponibles en esa versión sin errores ni solicitudes de conexión.

**Acceptance Scenarios**:

1. **Given** que la aplicación completó previamente su preparación offline, **When** el anfitrión
   la abre sin conexión, **Then** accede a la pantalla inicial y puede usar todas las funciones de
   la versión instalada.
2. **Given** una sesión iniciada sin conexión, **When** la conectividad aparece y desaparece,
   **Then** la experiencia continúa sin interrumpirse ni perder información.
3. **Given** que el dispositivo nunca completó la primera carga, **When** se abre sin conexión,
   **Then** se explica claramente que se necesita una conexión inicial y cómo volver a intentarlo.

---

### User Story 2 - Instalar y abrir como una aplicación móvil (Priority: P1)

Como jugador, quiero añadir ImpostorApp a la pantalla de inicio y abrirla con una experiencia
adaptada al móvil, para encontrarla y utilizarla como cualquier otra aplicación.

**Why this priority**: La instalación y el comportamiento móvil cumplen el objetivo de ofrecer una
aplicación accesible sin mantener inicialmente dos aplicaciones nativas.

**Independent Test**: Se puede validar instalando la aplicación desde un navegador compatible en
un iPhone y un dispositivo Android, abriéndola desde su icono y comprobando la navegación y la
presentación en ambos dispositivos.

**Acceptance Scenarios**:

1. **Given** un dispositivo y navegador compatibles, **When** el usuario sigue la opción o las
   instrucciones de instalación, **Then** ImpostorApp queda accesible desde la pantalla de inicio.
2. **Given** la aplicación instalada, **When** se abre desde su icono, **Then** aparece con nombre,
   icono y presentación propios, sin una interfaz que parezca una página de escritorio.
3. **Given** que la instalación automática no está disponible, **When** el usuario solicita ayuda,
   **Then** recibe instrucciones apropiadas para su dispositivo o se le informa de la limitación.

---

### User Story 3 - Conservar la información local (Priority: P2)

Como anfitrión, quiero que la partida activa y mis datos guardados sobrevivan a cierres, reinicios y
actualizaciones, para no perder la preparación del grupo ni el progreso por accidente.

**Why this priority**: La continuidad protege el tiempo del grupo y es necesaria para que la
aplicación resulte fiable durante una reunión.

**Independent Test**: Se puede validar guardando datos representativos, cerrando forzosamente la
aplicación, reiniciando el dispositivo y aplicando una actualización compatible; después de cada
caso, los mismos datos deben seguir disponibles y ser coherentes.

**Acceptance Scenarios**:

1. **Given** información local guardada, **When** la aplicación se cierra y se abre de nuevo,
   **Then** la información continúa disponible sin alteraciones.
2. **Given** una partida activa guardada, **When** el dispositivo se reinicia, **Then** la
   aplicación puede recuperar el último estado confirmado.
3. **Given** una actualización compatible de la aplicación, **When** el usuario la abre por primera
   vez después de actualizar, **Then** sus datos y la partida recuperable permanecen disponibles.
4. **Given** que una recuperación no puede completarse de forma segura, **When** la aplicación
   detecta la incompatibilidad, **Then** conserva los datos existentes, explica el problema y evita
   sustituirlos silenciosamente por datos vacíos.

---

### User Story 4 - Recibir actualizaciones sin interrumpir la partida (Priority: P3)

Como anfitrión, quiero que una versión nueva se aplique en un momento seguro y de forma comprensible,
para que una actualización no interrumpa una partida ni mezcle comportamientos de dos versiones.

**Why this priority**: Las actualizaciones son necesarias, pero su aplicación puede aplazarse hasta
no poner en riesgo el flujo principal.

**Independent Test**: Se puede validar publicando una versión nueva mientras existe una partida en
curso, comprobando que la partida continúa con normalidad y que la actualización se ofrece o aplica
después en un punto seguro.

**Acceptance Scenarios**:

1. **Given** una partida en curso y una versión nueva disponible, **When** la aplicación detecta la
   actualización, **Then** no recarga ni interrumpe automáticamente la partida.
2. **Given** una actualización preparada, **When** el usuario llega a un punto seguro, **Then** puede
   aplicarla mediante una acción clara o permitir que se aplique en el siguiente inicio.
3. **Given** una descarga de actualización interrumpida, **When** el usuario vuelve a abrir la
   aplicación, **Then** puede continuar usando la última versión completa disponible.

### Edge Cases

- El dispositivo pierde la conexión antes de terminar la primera preparación offline.
- El sistema operativo elimina recursos o datos por falta de espacio.
- El dispositivo se queda sin espacio mientras guarda datos o prepara una actualización.
- La aplicación se cierra durante una escritura o una actualización.
- El usuario abre simultáneamente la aplicación en dos pestañas o ventanas.
- El usuario utiliza navegación privada, almacenamiento restringido o un navegador incompatible.
- El usuario borra manualmente los datos del sitio o desinstala la aplicación.
- Una versión nueva necesita transformar datos creados por una versión anterior.
- La hora del dispositivo es incorrecta o cambia entre sesiones.
- El dispositivo rota, cambia de tamaño o utiliza una pantalla móvil estrecha.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: La aplicación MUST ofrecer una experiencia instalable desde los navegadores móviles
  compatibles definidos para la primera versión.
- **FR-002**: La aplicación MUST proporcionar nombre, icono y presentación móvil reconocibles al
  abrirse desde la pantalla de inicio.
- **FR-003**: La aplicación MUST informar si el dispositivo está preparado para uso offline.
- **FR-004**: Después de una primera preparación correcta, todas las capacidades incluidas en la
  versión instalada MUST permanecer utilizables sin conexión.
- **FR-005**: La aplicación MUST explicar cómo completar o repetir la preparación cuando se abre
  offline antes de haber finalizado la primera carga.
- **FR-006**: Un cambio de conectividad durante el uso MUST NOT interrumpir la sesión, provocar una
  navegación inesperada ni descartar información confirmada.
- **FR-007**: La aplicación MUST conservar localmente la partida recuperable, los grupos guardados,
  el contenido personalizado, el historial de conceptos utilizados y las preferencias cuando esas
  capacidades existan.
- **FR-008**: Cada transición irreversible de una partida MUST quedar confirmada localmente antes de
  mostrar al usuario que la acción terminó.
- **FR-009**: La recuperación después de un cierre MUST restaurar el último estado completo y MUST
  NOT presentar como válido un estado escrito parcialmente.
- **FR-010**: Las actualizaciones compatibles MUST preservar todos los datos locales soportados.
- **FR-011**: Si una actualización requiere transformar datos, la aplicación MUST conservar una
  alternativa segura hasta confirmar que la transformación terminó correctamente.
- **FR-012**: Una actualización disponible MUST NOT recargar, cerrar ni alterar automáticamente una
  partida en curso.
- **FR-013**: Si una actualización no se descarga completamente, la última versión completa MUST
  continuar disponible.
- **FR-014**: La eliminación de todos los datos locales MUST requerir una acción explícita y una
  confirmación que explique sus consecuencias.
- **FR-015**: La aplicación MUST distinguir entre pérdida de conexión, falta de preparación offline,
  falta de espacio, incompatibilidad y datos no recuperables, ofreciendo una acción adecuada para
  cada situación.
- **FR-016**: El uso offline MUST NOT depender de iniciar sesión, verificar una licencia, descargar
  contenido bajo demanda ni contactar con un servicio externo.
- **FR-017**: La experiencia principal MUST ser utilizable en orientación vertical sin desplazamiento
  horizontal en los tamaños móviles compatibles.
- **FR-018**: Las funciones que se incorporen en futuras épicas MUST demostrar su funcionamiento
  offline antes de considerarse terminadas, salvo que una especificación aprobada declare
  explícitamente una dependencia de red.

### Key Entities

- **Estado de preparación offline**: Indica si la versión instalada dispone de todo lo necesario
  para abrirse y utilizarse sin conexión, incluyendo el último resultado o problema conocido.
- **Datos locales de la aplicación**: Conjunto de partida recuperable, grupos, contenido
  personalizado, historial y preferencias. Cada elemento tiene una versión lógica y un estado de
  integridad.
- **Versión disponible**: Representa la versión completa actualmente utilizable y, cuando exista,
  una versión nueva pendiente de aplicar en un momento seguro.
- **Estado de recuperación**: Describe el último punto confirmado de una partida y si puede
  restaurarse con seguridad.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100 % de los recorridos funcionales disponibles en una versión puede completarse en
  modo avión después de una primera carga correcta.
- **SC-002**: En una prueba con al menos 10 participantes y dispositivos compatibles, al menos
  9 de cada 10 pueden instalar la aplicación y abrirla desde la pantalla de inicio en menos de 2
  minutos sin ayuda directa.
- **SC-003**: La pantalla inicial queda disponible en menos de 3 segundos en al menos el 95 % de las
  aperturas offline realizadas en los dispositivos representativos de prueba.
- **SC-004**: El 100 % de los escenarios de cierre forzado, reinicio y actualización de la matriz de
  pruebas recupera el último estado confirmado sin pérdida silenciosa de datos.
- **SC-005**: Cero actualizaciones de la matriz de pruebas interrumpe una partida activa o deja la
  aplicación sin una versión completa utilizable.
- **SC-006**: El 100 % de los errores simulados de primera carga, falta de espacio e incompatibilidad
  muestra una explicación comprensible y al menos una acción de recuperación o salida segura.
- **SC-007**: Todas las pantallas incluidas en la versión superan la revisión de uso en orientación
  vertical en los tamaños móviles compatibles sin desplazamiento horizontal.

## Assumptions

- La primera apertura y preparación offline requiere conexión a internet; las aperturas posteriores
  no la requieren.
- La compatibilidad inicial cubre las dos versiones principales más recientes de los navegadores
  móviles predominantes en iPhone y Android en la fecha de publicación.
- El sistema operativo puede eliminar datos por decisión del usuario o por presión extrema de
  almacenamiento; la aplicación informa de esta posibilidad, pero no puede impedirla.
- La navegación privada y los navegadores que bloquean el almacenamiento persistente no garantizan
  instalación, continuidad ni uso offline completo.
- La primera versión no se distribuye mediante App Store o Google Play y no incluye cuentas,
  sincronización entre dispositivos, analítica ni servicios remotos.
- Las funcionalidades concretas del juego se definen en sus propias épicas; esta especificación
  establece los requisitos de instalación, disponibilidad y persistencia que todas ellas deben
  cumplir.
- El contenido y los datos permanecen locales en el único dispositivo utilizado para jugar.
