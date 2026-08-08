# Implementation Checklist: Puntuacion y continuidad multirronda

**Purpose**: Track implementation and delivery evidence for Jira epic IMP-9
**Feature**: [spec.md](../spec.md)
**Tasks**: [tasks.md](../tasks.md)

## Traceability

- [ ] `[IMP-56]` registrar una ronda una sola vez esta asignada y trazada.
- [ ] `[IMP-57]` marcador/ranking estable esta asignada y trazada.
- [ ] `[IMP-58]` progresion IMP-4 -> IMP-5 esta asignada y trazada.
- [ ] `[IMP-59]` final/revancha/nueva partida esta asignada y trazada.
- [ ] `[IMP-60]` recovery/observer/privacidad esta asignada y trazada.
- [ ] `[IMP-61]` integracion y entrega esta asignada y trazada.

## Domain and persistence

- [ ] Migracion v3 aditiva crea `game-scoreboards` y conserva stores existentes.
- [ ] Allowlist de `RoundResolutionHandoff` rechaza claves faltantes/adicionales.
- [ ] Tabla normativa cubre 1, 2 y 3 impostores y todos los intentos.
- [ ] Ledger es fuente de verdad y totales se validan contra movimientos.
- [ ] Retry identico no escribe/revisiona; colision divergente falla.
- [ ] Transaccion score/recovery/metadata hace rollback completo.
- [ ] Agregado interno y roles nunca cruzan el puerto publico.

## Ranking and progression

- [ ] Ranking usa total descendente, roster y posiciones `1,1,3`.
- [ ] Todos los maximos finales son ganadores compartidos.
- [ ] Siguiente accion depende solo de ronda frente a rondas configuradas.
- [ ] Coordinador ejecuta draw IMP-4 antes de roles IMP-5 atomicamente.
- [ ] IMP-9 no lee, escribe ni reinicia `role-assignment-history`.
- [ ] Fallo de preparacion conserva marcador y no crea ronda parcial.

## Recovery and lifecycle

- [ ] Recovery reference restaura marcador/ranking offline.
- [ ] Conflictos recargan sin replay y observer no ofrece comandos.
- [ ] Future/partial data activa safe mode sin borrado.
- [ ] Revancha crea nuevo gameId y cero ledger/secrets/histories.
- [ ] Revancha revisa jugadores, configuracion y contenido antes de IMP-5.
- [ ] Nueva partida conserva solo datos reutilizables.

## UI and delivery

- [ ] Scoreboard/Final ranking cubren loading/ready/writing/error/observer/final.
- [ ] Game Menu existe solo en superficies compartidas.
- [ ] Textos, semantica, foco, teclado y tacto estan validados.
- [ ] Axe, contraste, 320 px, zoom 200 % y nombres maximos pasan.
- [ ] E2E cubre puntos, empates, multirronda, final, reload, offline y rematch.
- [ ] Privacidad cubre DOM publico, URL, navigation, errores y consola.
- [ ] Format, lint, typecheck, unit, integration, build y bundle estan verdes.
- [ ] Quickstart, PR, CI, Pages y Jira quedan reconciliados con evidencia.

## Evidence

Pendiente de implementacion. Todas las casillas permanecen abiertas hasta disponer de evidencia.
