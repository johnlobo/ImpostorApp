# Implementation Checklist: Desarrollo de rondas, pistas y temporizador

**Purpose**: Track implementation and delivery evidence for IMP-6
**Feature**: [spec.md](../spec.md)

- [ ] IMP-38 orden, ready e inicio durable completados.
- [ ] IMP-39 conversacion libre/temporizada completada.
- [ ] IMP-40 cierre durable y handoff a IMP-7 completados.
- [ ] IMP-41 recovery, observer y conflictos completados.
- [ ] IMP-42 fases sucesivas completadas.
- [ ] IMP-43 integracion y entrega completadas.
- [ ] Roster, free y Fisher-Yates tienen matriz determinista.
- [ ] Progreso de turno es durable, idempotente y sin saltos visuales.
- [ ] Timer usa duracion exacta, deadline y maximum durable.
- [ ] Pause/resume son persist-first y no existe reset.
- [ ] Expiry efectivo se normaliza antes de cada mutacion.
- [ ] Close es persist-first, confirmado e idempotente.
- [ ] `CluePhaseHandoff` es publico, canonico y sin secretos.
- [ ] Fase sucesiva usa subconjunto estricto como entrada directa.
- [ ] Historial minimo tiene identidad, orden y cardinalidad exactos.
- [ ] Recovery offline cubre todos los estados y progreso.
- [ ] Observer y safe mode no ofrecen mutaciones ni borran datos.
- [ ] URL, navegacion, errores, consola y payloads pasan auditoria de privacidad.
- [ ] Inventario de pantallas, CTA unica y limite de Game Menu estan implementados.
- [ ] Adaptador IMP-6 public-only cubre summary, safe route y pauseForHome sin secretos.
- [ ] Solo IMP-10 renderiza Game Menu; IMP-6 expone capability/slot.
- [ ] Textos externos, teclado, foco, tacto, 320px y contraste validados.
- [ ] Format, lint y typecheck verdes.
- [ ] Unit, integration, build y bundle verdes.
- [ ] E2E, axe y offline smoke verdes.
- [ ] Quickstart, PR, CI, Pages y Jira reconciliados con evidencia.

## Evidence

Pendiente de implementacion. Ninguna casilla de entrega se marca durante especificacion.
