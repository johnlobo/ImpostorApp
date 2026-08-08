# Implementation Checklist: Votacion, empates y eliminacion

**Purpose**: Track implementation and delivery evidence for Jira epic IMP-7
**Feature**: [spec.md](../spec.md)
**Tasks**: [tasks.md](../tasks.md)

## Traceability

- [ ] `[IMP-44]` decision verbal esta asignada y trazada.
- [ ] `[IMP-45]` papeleta secreta esta asignada y trazada.
- [ ] `[IMP-46]` recuento/corte/desempate esta asignada y trazada.
- [ ] `[IMP-47]` handoff successive esta asignada y trazada.
- [ ] `[IMP-48]` recovery/observer/privacidad esta asignada y trazada.
- [ ] `[IMP-49]` integracion y entrega esta asignada y trazada.

## Domain and persistence

- [ ] IMP-7 no añade tabla ni migracion.
- [ ] Envelope `voting-active` conserva secreto/votos solo internamente.
- [ ] Puerto publico no expone votos, roles, concepto ni conteos parciales.
- [ ] Verbal single acepta 1..impostorCount sospechosos simultaneos.
- [ ] Secret single confirma approval sets de 1..impostorCount.
- [ ] Successive y un impostor exigen exactamente una seleccion.
- [ ] Auto-seleccion, duplicados y cardinalidades invalidas no escriben.
- [ ] Voto confirmado es durable, irrevocable e idempotente.

## Count and handoff

- [ ] Recuento usa solo aprobaciones positivas y maxSlots efectivo.
- [ ] Empate se detecta solo cuando cruza el corte final.
- [ ] Provisionales y pendingSlots se conservan correctamente.
- [ ] Desempate usa solo empatados y todos los votantes elegibles.
- [ ] Segundo empate descarta provisionales y elimina cero personas.
- [ ] `VoteResolutionHandoff` exacto se confirma antes del callback IMP-8.
- [ ] IMP-7 no inspecciona roles ni decide victoria/supervivientes.

## Recovery and privacy

- [ ] Reload abre lista compartida, nunca papeleta privada.
- [ ] Observer no ofrece comandos ni superficies privadas.
- [ ] Conflicto recarga sin replay y safe mode no borra datos.
- [ ] Private ballot desmonta candidatos/seleccion antes del handoff.
- [ ] Game Menu existe solo en superficies compartidas.
- [ ] URL, navigation, errores, consola y payloads no filtran votos.

## UI and delivery

- [ ] Verbal, secret progress, ready/counting, tiebreak y result estan completos.
- [ ] Covered/selecting/confirming/saving/concealed estan completos.
- [ ] Textos, semantica, foco, teclado, tacto y dialogs estan validados.
- [ ] Axe, contraste, 320 px y nombres maximos pasan.
- [ ] E2E cubre verbal/secreto/single simultaneo/corte/desempate/offline.
- [ ] Format, lint, typecheck, unit, integration, build y bundle estan verdes.
- [ ] Quickstart, PR, CI, Pages y Jira quedan reconciliados con evidencia.

## Evidence

Pendiente de implementacion. Todas las casillas permanecen abiertas hasta disponer de evidencia.
