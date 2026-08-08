# Quickstart: Votacion, empates y eliminacion

## A. Prepare from a closed clue phase

1. Cerrar IMP-6 y obtener un `CluePhaseHandoff` durable.
2. Preparar votacion y verificar identidad, participantes canonicos y reglas efectivas.
3. Confirmar cambio atomico a recovery `voting-active` sin perder `secretRound`, handoffs ni el
   ResolutionLedger opaco de un ciclo successive; phase 1 conserva null.
4. Repetir prepare y verificar mismo snapshot, cero escritura y revision estable.
5. Probar handoff abierto, duplicado, ajeno o incoherente; debe fallar sin estado parcial.
6. Confirmar que el ledger no aparece en proyeccion, papeleta, handoff, observer, errores o logs.

## B. Confirm verbal decisions

1. En `successive` y un impostor, comprobar que solo un sospechoso habilita confirmar.
2. En `single` con K=2 y K=3, seleccionar 1..K IDs distintos y confirmar simultaneamente.
3. Probar cero, K+1, duplicado e ID ajeno; conservar la votacion abierta.
4. Confirmar y verificar commit antes de callback, outcome eliminated y reason verbal-selection.
5. Repetir confirmacion y verificar mismo resultId/handoff, sin revision ni navegacion adicional.
6. Confirmar que no se crean `SecretVote` ni conteos artificiales.

## C. Pass the device for secret ballots

1. Abrir un votante pendiente y verificar cortinilla antes de candidatos.
2. Comprobar que la lista excluye al propio votante.
3. Para un puesto, exigir exactamente un candidato; para `single` K=2/3, admitir 1..K.
4. Confirmar y verificar persist-first antes de completed/conceal.
5. Comprobar que el DOM compartido no conserva candidatos ni seleccion.
6. Intentar reabrir, cambiar o duplicar un voto; todos quedan bloqueados.
7. Antes de N/N, verificar que count esta deshabilitado y no hay parciales publicos.

## D. Count approvals without a cutoff tie

1. Construir papeletas con uno, dos y tres maximos permitidos.
2. Sumar una aprobacion por inclusion e ignorar candidatos con cero.
3. Calcular `effectiveSlots=min(K, positiveCandidateCount)`.
4. Verificar que conteos iguales enteramente dentro o fuera del corte no abren desempate.
5. Confirmar prefijo superior, reason first-count y 1..K eliminados.
6. Verificar que el tally agregado aparece solo despues del commit y sin atribuciones.

## E. Resolve one cutoff tiebreak

1. Crear conteos con candidatos claros sobre el corte y empate cruzando el ultimo puesto.
2. Confirmar count y verificar ballot 2 con provisionales, candidatos empatados y pendingSlots.
3. Comprobar que todos vuelven a votar y cada cardinalidad excluye al propio votante.
4. Resolver sin empate y verificar union atomica de provisionales+ganadores, reason tiebreak-count.
5. Repetir con segundo empate de corte y verificar persistent-tie/second-tie, cero eliminados y
   descarte de provisionales.
6. Verificar que nunca se abre ballot 3.

## F. Enforce single and successive

1. En `single`, confirmar 1..impostorCount eliminados y cerrar la votacion completa.
2. En `successive`, rechazar cualquier resultado con cero o mas de un eliminado.
3. Tras handoff successive, verificar que IMP-7 no deriva activos ni abre otra votacion.
4. Simular nuevo `CluePhaseHandoff` de IMP-6 y crear una identidad de votacion nueva.
5. Comprobar que un eliminado anterior ausente no es votante ni candidato.

## G. Recover, conflict and observe

1. Reabrir offline con 0/N, parcial, N/N, tiebreak y result; conservar estado exacto.
2. Forzar navigation state privado y verificar entrada a lista compartida.
3. Abrir dos writers; confirmar voto/count en uno y obtener revision-conflict en el stale.
4. Retry solo carga; no repite seleccion, recuento ni callback.
5. Transferir lease y verificar observer sin abrir papeleta ni comandos.
6. Probar payload futuro/parcial y obtener safe mode sin borrado.

## H. Audit privacy and accessibility

1. Inspeccionar `PublicVotingSession`, props, callbacks y handoff: sin votos individuales ni secreto.
2. Inspeccionar URL, navigation state, error, toast y consola en todos los estados.
3. Verificar que `loadPrivateBallot` nunca retorna un voto confirmado.
4. Operar lista, papeleta, confirmacion y desempate con teclado y foco restaurado.
5. Ejecutar axe y 320 px con 20 nombres y K=3.
6. Confirmar anuncios de progreso/error sin verbalizar selecciones.
7. Verificar Game Menu solo en superficies compartidas y cero telemetria.

## Quality commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test
npm run build
npm run test:e2e
node scripts/check-bundle-size.mjs
```

## Expected test evidence

- Matrices puras para cardinalidad verbal/secreta, aprobaciones, puestos positivos y corte.
- Tablas de primer empate, desempate resuelto y empate persistente all-or-nothing.
- fake-indexeddb para atomicidad, revisiones, no-ops, recovery y privacidad de proyecciones.
- Component tests para cortinilla, desmontaje, N/N, confirmaciones, observer y errores.
- Playwright/axe para pass-the-device, offline, teclado, foco, 320 px y ausencia de secretos.
