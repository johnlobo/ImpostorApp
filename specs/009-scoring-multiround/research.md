# Research: Puntuacion y continuidad multirronda

## Durable aggregate across recovery phases

**Decision**: crear `game-scoreboards`, keyed por `gameId`, y mantener en `recoverySnapshots` solo una
`ScoringRecoveryReference` cuando la superficie activa sea marcador o ranking.

**Rationale**: el recovery cambia entre contenido, reparto, pistas, voto y resolucion. El ledger debe
sobrevivir esos reemplazos sin obligar a IMP-5..8 a copiarlo en sus payloads.

**Alternatives rejected**: incluir el ledger en todos los envelopes acopla cuatro epicas; recalcular
desde recovery pierde rondas anteriores; localStorage carece de transaccion y safe mode.

## Internal result and public projection

**Decision**: un coordinador interno IMP-8->9 persiste `RoundResolutionHandoff` dentro de
`AppliedResultRecord` y `RoundPreparationSource` dentro del agregado, pero el puerto de feature
devuelve solo `PublicGameScoreboard`.

**Rationale**: el payload completo distingue retry idempotente; el source conserva PreparedGame y
seleccion confirmada para la siguiente ronda sin exponerlos a App. Un hash agrega complejidad.

## Ledger rather than mutable totals

**Decision**: `ScoreMovement[]` inmutable es fuente de verdad; los totales son cache validado al leer.

**Rationale**: permite auditar tabla, bonus y duplicados sin conservar votos. Recomputar un maximo de
20 jugadores por 10 rondas es trivial.

## Competition ranking

**Decision**: total descendente, roster solo como orden visual y posiciones `1,1,3`; todos los maximos
finales son ganadores. No existe desempate oculto.

## Atomic scoring confirmation

**Decision**: transaccion sobre `game-scoreboards`, `recoverySnapshots` y `metadata`, con writer lease
y expected revision. Retry igual es no-op; divergente falla sin escribir.

## Next-round orchestration

**Decision**: un nuevo comando atomico `prepareNextFromScoreboard` consume directamente
`scoreboard-active`; no encadena el `SecretRoundRepository.prepare` existente, que solo admite
`content-selected|round-prepared`. La transaccion conjunta cubre `game-scoreboards`, `used-concepts`,
`role-assignment-history`, `recoverySnapshots` y `metadata`, ejecutando draw antes de roles.

**Rationale**: conserva el orden IMP-4 -> IMP-5 sin consumir concepto si falla la asignacion.
Introducir un staging `content-selected` o llamar antes a `ConceptDrawRepository.drawAndMarkUsed`
perderia recovery del marcador y crearia exactamente ese estado parcial.

## Rematch

**Decision**: crear nuevo `gameId`; copiar roster, reglas y seleccion como borradores editables y
recorrer IMP-2 -> IMP-3 -> IMP-4 antes de IMP-5. No copiar ledger, secretos ni historiales.

## Migration

**Decision**: migracion Dexie aditiva version 3, `game-scoreboards: '&key'`, sin upgrade destructivo.
Version futura o agregado invalido activa safe mode sin borrado.
