# Quickstart: Continuidad, ayuda, ajustes y accesibilidad

## A. Home and safe resume

1. Abrir sin snapshot: Home muestra offline real y no muestra continuidad ficticia.
2. Para cada fase IMP-2..9, derivar resumen y comprobar solo ronda, participantes y fase publica.
3. Interrumpir role reveal/private vote/final attempt; continuar vuelve a shared list o
   `private-handoff` cubierto, nunca al secreto/entrada.
4. Recuperar active/paused/expired/closed y verificar cero replay de RNG, voto, cierre o score.
5. En observer, mostrar summary pero no comandos mutables.
6. Probar discriminante con exactamente uno, cero y varios adapters; los dos ultimos entran safe mode.

## B. Pause, abandon and discard

1. Abrir Game Menu en cada superficie shared del inventario; verificar ausencia en todas las private.
2. Pausar timer running: persistir remaining/paused antes de Home; resume permanece paused.
3. Pausar otra fase shared: checkpoint durable sin ejecutar CTA principal.
4. Simular fallo/conflict: permanecer en superficie, reload sin replay y retry consciente.
5. Cancelar abandon/discard: cero escrituras. Confirmar: limpiar agregado activo una vez y conservar
   grupos, categorias y preferencias.
6. Para IMP-6 probar running->paused, paused no-op, expired preservado, observer bloqueado y stale sin replay.
7. Verificar que ningun store/historial game-scoped retiene el gameId abandonado.

## C. Onboarding and help

1. Tras preparacion real y onboarding pending, ofrecer introduccion sin delay/debug controls.
2. Skip/complete, reload offline y verificar decision durable.
3. Recorrer ayuda local y contrastar pasos con specs IMP-2..9.
4. Abrir/cerrar ayuda durante partida y volver a shared/covered surface segura.

## D. Preferences and feedback

1. Cambiar sonido, vibracion, adulto y alto contraste por separado; reload offline conserva valores.
2. Simular APIs ausentes/denegadas: feedback no lanza, bloquea ni muestra error tecnico.
3. Comparar cues citizen/impostor y votos alternativos: mismo patron, duracion y timing.
4. Activar adulto: IMP-4 sigue exigiendo confirmacion por partida.
5. Verificar ausencia de selector de idioma y textos mediante i18n.
6. Cargar UserPreferences v1 y verificar upgrade a v2; datos future activan safe mode.

## E. Delete all local data

1. Poblar cada store registrado, metadata, snapshot e historiales.
2. Abrir confirmacion y verificar inventario legible; cancelar deja todo intacto.
3. Confirmar con writer: una transaccion vacia todos los stores y verifyEmpty es true.
4. Repetir delete sobre vacio: success idempotente.
5. Simular fallo/lease conflict: error publico, retry/safe exit, sin secretos.
6. Verificar que Cache Storage/service worker/manifest permanecen y la PWA abre offline en Home vacio.
7. Simular crash tras marker y durante fallback; initialize retoma, verifica vacio y solo entonces
   devuelve marker idle/Home.

## F. Rematch

1. Desde final ranking consumir `RematchSeed` publico y crear nuevo gameId.
   Rechazar un seed que reutilice el mismo ID.
2. Pasar por jugadores editables, configuration review/confirm y content review/confirm.
3. Verificar que no se reutiliza PreparedGame, PreparedContentSelection, draw ni roles anteriores.
4. Solo tras las tres revisiones entrar en IMP-5.
5. Confirmar que el shell no decide que datos preservar; esa politica permanece en IMP-9.

## G. Accessible shell

1. Recorrer inventario a 320 px y zoom 200 %: sin overflow, solapes ni texto inoperable.
2. Validar full viewport/safe areas/header/body/footer y una CTA primaria por estado.
3. Operar menu, toggles, segmented, dialogs, sheets, progress y toast con teclado/lector.
4. Verificar foco inicial, trap, Escape, inert y restore en todos los dialogos destructivos.
5. Ejecutar axe WCAG A/AA y contraste normal/high contrast.
6. Activar reduced motion y comprobar que no se pierde informacion.
7. Inspeccionar DOM/URL/navigation/errors/toasts/console: cero secretos.

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

## Expected evidence

- Contract tests por adaptador IMP-2..9 para summary, safe route, pause y observer.
- fake-indexeddb para preference migration, abandon scope, atomic delete e inventory completeness.
- Component tests para Home/menu/settings/help/onboarding y focus lifecycle.
- Playwright Chromium/WebKit para offline resume, private recovery, installed delete, 320 px/zoom.
- Axe, teclado, contraste, reduced motion, privacy sinks y bundle sin Tailwind/assets remotos.
