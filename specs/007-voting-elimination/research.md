# Research: Votacion, empates y eliminacion

## Recovery ownership

**Decision**: Reemplazar `clues-active` por `voting-active` en el registro unico
`active-game`, conservando internamente `SecretRoundSnapshot`, handoffs de pistas y votacion.

**Rationale**: El secreto debe sobrevivir hasta IMP-8 y los votos deben compartir revision y commit
con el estado recuperable. La tabla y gateway existentes ya soportan esta transaccion.

**Alternatives considered**:
- Tabla independiente de votos: descartada por recovery parcial y doble revision.
- Pasar el secreto al servicio: descartado porque hook, observer y DOM compartido no deben recibirlo.
- Guardar solo progreso: descartado porque no permite recuperar ni contar votos confirmados.

## Approval ballot cardinality

**Decision**: Una papeleta secreta contiene un ID para `successive` o un impostor, y entre uno e
`impostorCount` IDs distintos para `single` multi-impostor.

**Rationale**: Permite seleccionar simultaneamente hasta el maximo configurado sin imponer que cada
votante acuse a personas sobre las que no tiene una decision. Cada inclusion equivale a una
aprobacion y cada jugador mantiene una unica papeleta irrevocable.

**Alternatives considered**:
- Exactamente `impostorCount`: descartado porque contradice “hasta” y fuerza selecciones.
- Un candidato y top K: descartado porque no representa una seleccion simultanea por votante.
- Ranking completo: descartado por complejidad y por introducir preferencias no solicitadas.

## Deterministic cutoff

**Decision**: Excluir conteos cero, calcular hasta K puestos efectivos y detectar empate solo cuando
varios candidatos comparten el conteo que cruza el ultimo puesto disponible.

**Rationale**: Los candidatos estrictamente por encima del corte son inequívocos. Un empate por
debajo del corte no afecta el resultado y no debe abrir otra papeleta.

**Alternatives considered**:
- Cualquier igualdad abre desempate: descartada porque empates irrelevantes bloquearian resultados.
- Orden roster como desempate: descartada por sesgo y porque ocultaria un desempate semantico.
- RNG: descartado por falta de aprobacion y recuperacion innecesariamente compleja.

## All-or-nothing persistent tie

**Decision**: Los candidatos por encima del primer corte son provisionales. Si el segundo recuento
sigue sin llenar los puestos pendientes, se confirma `persistent-tie` con cero eliminados.

**Rationale**: El contrato IMP-8 da precedencia al empate persistente y no mezcla en un mismo
handoff eliminaciones con victoria por empate. Una unica salida atomica evita resoluciones parciales.

**Alternatives considered**:
- Confirmar provisionales y empate para el resto: descartada porque contradice el outcome unico.
- Reducir puestos: descartada porque convertiría un empate en eliminacion arbitraria.
- Tercera papeleta: descartada por Jira y spec.

## Tiebreak ballot size

**Decision**: Todos los participantes vuelven a votar. Cada uno selecciona el menor entre puestos
pendientes y candidatos empatados distintos de si mismo.

**Rationale**: Mantiene prohibicion de auto-seleccion y evita exigir una cardinalidad imposible a un
votante que tambien es candidato.

**Alternatives considered**:
- Excluir candidatos como votantes: descartada; cambia el electorado.
- Permitir auto-seleccion: descartada por el contrato aprobado.
- Exigir siempre puestos pendientes: descartada cuando el propio votante reduce candidatos validos.

## Verbal mode

**Decision**: El anfitrion confirma directamente un conjunto agregado: uno en `successive`, entre
uno y K en `single`. No existe tally ni tiebreak verbal.

**Rationale**: La decision ya se produce fuera del dispositivo. Fabricar votos o empate degradaria
la fidelidad del metodo verbal.

## Private screen lifecycle

**Decision**: Covered y selecting son estados de vista. Solo submit persiste. Tras commit se
desmontan candidatos y seleccion, y se vuelve a la lista compartida.

**Rationale**: Evita que recovery reabra una eleccion y garantiza persist-first.

## Idempotency and concurrency

**Decision**: Serializar comandos locales por identidad; usar expectedRevision y writer lease.
Repetir una intencion ya confirmada es no-op; stale recarga sin replay.

**Rationale**: Un replay podria votar por otro usuario o confirmar un recuento distinto al visto.

## Public aggregate results

**Decision**: La proyeccion puede mostrar conteos agregados solo tras cerrar una papeleta. El handoff
a IMP-8 no los incluye y nunca existe atribucion votante-candidato en una salida publica.

**Rationale**: El grupo puede comprender corte/desempate sin comprometer elecciones individuales.

## Dependencies

**Decision**: No anadir dependencias ni migracion. Usar funciones TypeScript puras, Dexie y
herramientas de prueba existentes.

**Rationale**: N <= 20 y K <= 3; ordenar y agrupar es pequeño, determinista y auditable.
