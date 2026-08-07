# Data Model: Plataforma móvil instalable y offline

**Feature**: `IMP-1` / `001-mobile-offline-platform`

El modelo separa los datos persistidos de los estados efímeros del navegador. Las entidades de
juego se completarán en sus épicas; IMP-1 define sus sobres versionados y garantías de integridad.

## Persisted Entities

### AppMetadata

Registro único con información necesaria para interpretar la base local.

| Field | Type | Rules |
|---|---|---|
| `id` | literal `app` | Clave única |
| `schemaVersion` | positive integer | Nunca disminuye |
| `appVersion` | semantic version string | Versión que confirmó el registro |
| `createdAt` | ISO timestamp | Inmutable |
| `updatedAt` | ISO timestamp | Se actualiza en la misma transacción que el cambio |
| `lastSuccessfulOpenAt` | ISO timestamp or null | Solo después de una apertura completa |

### RecoverySnapshot

Último estado completo y recuperable de una partida. Solo existe un registro activo.

| Field | Type | Rules |
|---|---|---|
| `id` | literal `active-game` | Clave única |
| `schemaVersion` | positive integer | Identifica el formato del payload |
| `revision` | non-negative integer | Aumenta exactamente en uno por confirmación |
| `savedAt` | ISO timestamp | Momento de confirmación |
| `phase` | string union | Fase pública de alto nivel; se amplía en specs de juego |
| `payload` | versioned object | Validado por el módulo propietario antes de guardar |
| `integrity` | literal `confirmed` | Solo las transacciones terminadas producen el registro |

**Validation rules**:

- Una revisión menor o igual que la almacenada se rechaza salvo restauración explícita validada.
- `payload` nunca se registra en logs y no se replica fuera del dispositivo.
- Una escritura de snapshot y sus metadatos forma una única transacción.
- Un fallo conserva íntegramente la revisión anterior.

### PlayerGroupRecord

Reserva el contrato de persistencia para los grupos definidos por `IMP-2`.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Generado localmente |
| `schemaVersion` | positive integer | Versiona el contenido |
| `name` | string | Validación definitiva en IMP-2 |
| `payload` | versioned object | Propiedad del módulo de grupos |
| `updatedAt` | ISO timestamp | Obligatorio |

### CustomCategoryRecord

Reserva el contrato de persistencia para categorías de `IMP-4`.

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Generado localmente |
| `schemaVersion` | positive integer | Versiona el contenido |
| `adult` | boolean | `false` por defecto |
| `payload` | versioned object | Propiedad del catálogo |
| `updatedAt` | ISO timestamp | Obligatorio |

### UsedConceptRecord

Referencia opaca para impedir repeticiones sin copiar el concepto secreto en metadatos generales.

| Field | Type | Rules |
|---|---|---|
| `scopeId` | string | Identifica la selección o historial |
| `conceptId` | string | Identificador, no texto del concepto |
| `usedAt` | ISO timestamp | Obligatorio |

La clave compuesta es `(scopeId, conceptId)`.

### UserPreferences

Registro único de preferencias no secretas.

| Field | Type | Rules |
|---|---|---|
| `id` | literal `preferences` | Clave única |
| `schemaVersion` | positive integer | Versiona las preferencias |
| `locale` | string | `es` por defecto |
| `soundEnabled` | boolean | Valor inicial definido por su epic |
| `vibrationEnabled` | boolean | Valor inicial definido por su epic |
| `adultContentEnabled` | boolean | MUST ser `false` por defecto |
| `updatedAt` | ISO timestamp | Obligatorio |

## Ephemeral Entities

### OfflineLifecycleState

```text
initializing
  ├─> offline-ready
  ├─> update-available ─> applying-update ─> initializing
  └─> error
```

`error` contiene un código público (`first-load-required`, `storage-full`, `storage-unavailable`,
`incompatible-data`, `update-failed`) y una acción segura. No contiene datos privados.

### WriterLease

| Field | Type | Rules |
|---|---|---|
| `instanceId` | UUID | Nuevo por pestaña/ventana |
| `acquiredAt` | timestamp | Momento de adquisición |
| `heartbeatAt` | timestamp | Se renueva mientras la instancia está activa |
| `mode` | `writer` or `observer` | Solo una instancia puede ser escritora |

Si no se puede demostrar que una concesión caducó, una instancia MUST permanecer como observadora.

## Relationships

```text
AppMetadata 1 ─── 0..1 RecoverySnapshot
AppMetadata 1 ─── 0..* PlayerGroupRecord
AppMetadata 1 ─── 0..* CustomCategoryRecord
AppMetadata 1 ─── 0..* UsedConceptRecord
AppMetadata 1 ─── 1 UserPreferences

WriterLease (ephemeral) ──authorizes──> all persisted writes
OfflineLifecycleState (ephemeral) ──describes──> installed app resources
```

## Migration Rules

1. Declarar cada versión previa necesaria; no saltar directamente desde una base desconocida.
2. Ejecutar transformaciones dentro de la transacción de actualización.
3. Validar todos los registros transformados antes de confirmar.
4. Si algo falla, abortar y conservar la versión anterior; nunca limpiar como reparación automática.
5. Una versión de datos superior a la comprendida abre en modo seguro sin escribir.
6. La eliminación total requiere confirmación explícita fuera de una partida activa.
