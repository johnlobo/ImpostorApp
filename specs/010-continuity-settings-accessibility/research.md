# Research: Continuidad, ayuda, ajustes y accesibilidad

## Public-only feature adapters

**Decision**: Registrar adaptadores de continuidad por feature. Cada adaptador interpreta su propio
snapshot dentro de su frontera y solo devuelve `SafeResumeSummary`, `SafeResumeRoute` y resultados
publicos de pausa. Un discriminante versionado debe resolver exactamente un adapter; cero o varios
producen safe mode.

**Rationale**: Los envelopes de IMP-5..9 retienen secretos necesarios. Una union central de payloads
en Home o React permitiria filtrarlos accidentalmente en props, navigation, errores o logs.

**Alternatives considered**:
- Pasar `RecoverySnapshot` al Home: descartado por FR-016/FR-021.
- Crear un resumen persistido paralelo: descartado; introduce dos commits y puede quedar stale.
- Inferir pantalla desde strings de phase en UI: descartado; duplica validacion y rompe ownership.

## Safe resume

**Decision**: Resume vuelve siempre a una superficie compartida o cubierta: reveal list, voting
list, `private-handoff` cubierto, fase publica, resolucion publica o scoreboard. La ruta contiene
solo feature/surface/identidad publica; la feature recarga el estado durable por su cuenta.

**Rationale**: Recovery conserva progreso confirmado sin reconstruir intenciones efimeras. Menu,
dialogos, papeletas abiertas y secretos descubiertos no son estados de resume.

## Pause orchestration

**Decision**: `pauseForHome` es un comando del adaptador activo. Para IMP-6 normaliza expiracion o
persiste paused con restante; para otras features confirma un checkpoint publico sin ejecutar votos,
revelaciones, cierre, resolucion o scoring. Solo despues del success el shell navega a Home.

**Rationale**: Una pausa generica sobre Dexie no conoce deadlines ni estados incompatibles. La
feature conserva su dominio; IMP-10 controla la intencion transversal y la navegacion.

## Abandon versus discard

**Decision**: Menu y Home usan el mismo comando idempotente de limpieza del agregado activo, con
copy contextual y confirmacion separada. `LocalDataRepository` es la unica autoridad y ejecuta en
una transaccion deleters game-scoped registrados por feature. Conserva preferencias y colecciones.

**Rationale**: Dos implementaciones producirian scopes distintos. La confirmacion no se persiste; al
reload se vuelve a una superficie segura y debe solicitarse otra vez.

## Preferences and optional device feedback

**Decision**: Extender `UserPreferences` a schema version siguiente con high contrast y onboarding;
mantener idioma `es` sin selector. Repositorio por campo hace merge optimista y devuelve copia.
Audio y vibracion son gateways `tryFeedback` que nunca lanzan hacia UI.

**Rationale**: Preferencias independientes no deben bloquearse entre si. Un unico patron generico
para hitos privados evita canales laterales por tipo, duracion o timing.

## Onboarding and help versioning

**Decision**: `OnboardingState` guarda skipped/completed y version vista. `HelpContentVersion` es una
constante de contenido local trazada a las specs; una version nueva puede ofrecer novedades sin
invalidar la decision inicial.

**Rationale**: No se necesita CMS ni red. El contenido se prueba junto a i18n y reglas publicadas.

## Transactional local deletion

**Decision**: Un unico `StoreRegistry` alimenta migrations, database, gateway e inventario.
`deleteAll` exige confirmacion y writer lease, vacia en una transaccion y verifica ausencia; si el
motor obliga a recrear la base, un marker durable permite retomar delete/recreate/reinitialize/verify
antes de Home. Cache Storage queda fuera. UserPreferences v1->v2 es upgrade de value/guard en el
store existente, no tabla nueva.

**Rationale**: El gateway actual ya centraliza clear, pero una lista manual debe evolucionar con
cada migracion. El inventario compartido por migraciones y borrado reduce omisiones.

## Accessible shell and primitives

**Decision**: Mejorar componentes reales/CSS, no importar primitives Tailwind. Usar HTML nativo
primero; dialogos implementan focus trap, Escape, inert y restore. Safe areas usan env(), viewport
`100dvh`, ancho fluido y no frame. Pruebas cubren 320 px y zoom 200 %.

**Rationale**: El shell actual ya aporta landmarks basicos. Evolucionarlo conserva bundle y estilos,
mientras el prototipo standalone no comparte dependencias ni contratos.

## Rematch routing

**Decision**: Consumir de IMP-9 una `RematchSeed` publica con source/new gameId y roster reusable;
IMP-10 solo abre jugadores editables, review/config y content review. No decide preservacion ni
reutiliza PreparedGame/PreparedContentSelection anteriores.

**Rationale**: Revancha es conveniencia de entrada, no permiso para saltar validaciones o repetir
secretos/draws.

## Dependencies

**Decision**: Cero dependencias nuevas. React, Dexie, PWA, CSS, i18n, Web Audio/Vibration opcionales,
Vitest, Playwright y axe cubren la entrega.
