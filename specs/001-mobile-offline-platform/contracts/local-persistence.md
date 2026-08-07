# Contract: Local Persistence

**Owner**: `IMP-1`

Este contrato define las garantías que los módulos de dominio pueden exigir al almacenamiento. No
expone Dexie ni IndexedDB fuera de infraestructura.

## PersistenceGateway

### `initialize()`

- Abre o crea el almacenamiento y ejecuta migraciones transaccionales.
- Devuelve `ready` con la versión comprendida o un error público tipado.
- No elimina datos ni reintenta una migración destructiva automáticamente.

### `loadRecoverySnapshot()`

- Devuelve el último `RecoverySnapshot` confirmado o `null`.
- Nunca devuelve una revisión parcial, inválida o de formato superior no comprendido.
- No emite el payload en logs, telemetría ni mensajes de error.

### `commitRecoverySnapshot(expectedRevision, nextSnapshot)`

- Requiere una concesión de escritura activa.
- Confirma snapshot y metadatos en una única transacción.
- Falla con `revision-conflict` si `expectedRevision` no coincide.
- Resuelve solo después de que la revisión completa sea durable.
- Ante cualquier fallo conserva la revisión anterior.

### `readCollection(namespace)` / `commitCollectionChange(namespace, change)`

- Los namespaces iniciales son `player-groups`, `custom-categories`, `used-concepts` y
  `preferences`.
- El módulo propietario valida el payload; infraestructura valida sobre, versión y revisión.
- Cada cambio de colección es atómico y no afecta otras colecciones si no se solicita una
  transacción conjunta.

### `clearAllData(confirmation)`

- Rechaza la operación sin confirmación explícita y sin permiso de escritura.
- Informa qué categorías de datos serán eliminadas.
- No se ofrece como recuperación automática ante errores.

## Error Contract

Solo se propagan códigos públicos y recuperables:

- `storage-unavailable`
- `storage-full`
- `incompatible-data`
- `migration-failed`
- `revision-conflict`
- `writer-unavailable`
- `unknown-storage-error`

Los errores conservan la causa técnica para desarrollo únicamente; las compilaciones públicas no
incluyen payloads, conceptos, roles ni votos.

## Atomicity Invariant

Si la interfaz indica que una acción terminó, una reapertura inmediata MUST devolver exactamente el
nuevo estado confirmado. Si la confirmación falla, la interfaz MUST conservar el estado anterior y
permitir reintentar o salir de forma segura.
