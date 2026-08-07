# Contract: PWA Platform Lifecycle

**Owner**: `IMP-1`

## Public States

| State | Meaning | Allowed user action |
|---|---|---|
| `initializing` | Se comprueban almacenamiento y recursos | Esperar o ver ayuda si tarda demasiado |
| `online-not-ready` | Falta completar la primera preparación | Reintentar con conexión |
| `offline-ready` | La versión instalada puede ejecutarse offline | Continuar |
| `update-available` | Hay una versión completa esperando | Aplicar ahora si es seguro o posponer |
| `applying-update` | Se activa una versión confirmada | Esperar; no iniciar acciones nuevas |
| `degraded` | Puede abrirse, pero alguna garantía no está disponible | Seguir en modo seguro o consultar ayuda |
| `fatal-safe` | Los datos no pueden interpretarse sin riesgo | Conservar datos, exportar cuando exista o salir |

## Events

### `OFFLINE_READY`

- Se emite una vez que los recursos necesarios de la versión están completamente disponibles.
- Puede mostrarse un aviso no modal y descartable.
- No contiene información de partida.

### `UPDATE_AVAILABLE`

- Se emite cuando la nueva versión completa está instalada y espera activación.
- Si hay una partida activa, la acción primaria es posponer.
- Si no hay una partida activa, se puede ofrecer `Aplicar actualización`.

### `APPLY_UPDATE`

- Solo se acepta tras acción explícita o durante un inicio sin partida activa.
- Antes de activar, confirma que el último estado durable está guardado.
- Una activación correcta puede recargar la aplicación una sola vez.

### `CONNECTIVITY_CHANGED`

- Actualiza indicadores informativos, pero no navega, recarga ni cancela acciones.
- Volver online puede iniciar una comprobación de actualización no bloqueante.

### `INSTALL_HELP_REQUESTED`

- Muestra instrucciones específicas cuando la plataforma puede determinarse de forma fiable.
- Si la instalación no es compatible, explica que la aplicación sigue disponible en navegador.

## Privacy Invariants

- Ningún estado, evento, mensaje, atributo accesible, sonido o vibración cambia según un rol o voto.
- Ningún secreto se incluye en URL, título de documento, notificación, manifest, caché nombrada o
  mensaje de error.
- Los estados compartidos entre pestañas contienen únicamente versión, concesión y disponibilidad.

## Update Safety Invariants

- Una partida activa nunca se recarga automáticamente.
- Una descarga parcial nunca sustituye la versión completa anterior.
- Una migración fallida nunca limpia ni sobrescribe los datos anteriores.
- Una instancia observadora nunca confirma escrituras.
