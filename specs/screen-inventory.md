# ImpostorApp Screen Inventory and UI Decisions

**Date**: 2026-08-08
**Reference prototype**: `ProposedUI/` (non-normative)
**Applies to**: IMP-1 through IMP-10

## Purpose

This inventory turns the completed visual proposal into traceable product surfaces. Domain specs,
privacy contracts and durable state remain authoritative. The standalone prototype is a storyboard:
its React 18/Tailwind stack, global Context, mocks, inline secrets, fake RNG, local timers and phone
preview frame are not implementation inputs.

## Global UI contract

- Production is a full-viewport mobile PWA with safe areas; the desktop phone frame is review-only.
- Shared screens use a compact header, scrollable body and stable lower CTA when one primary command
  exists. Private screens remove global navigation and game-menu actions.
- Screen changes follow durable domain transitions. Navigation never precedes persistence for role
  reveal, vote, phase close, resolution or score application.
- Home, URL, navigation state, errors, toasts, console and public serialized payloads never contain
  category, concept, roles, companions, votes or results that are not yet public.
- Visual intent is low-light and game-focused with distinct neutral, accent, citizen, impostor,
  warning and success roles. Exact prototype gradients, emojis, radii and colors are not normative;
  final CSS must avoid a one-note dark-purple palette, nested cards and decorative excess.
- Icons are semantic controls with accessible names. Emoji may support copy but is never the only
  carrier of status. Text remains externalized.
- All screens must support 320 px width, 200 percent zoom, safe areas, visible focus, reduced motion,
  keyboard, screen reader and WCAG A/AA automated checks.

## Screen map

| Screen / surface | Owner | Required states | Input -> output |
|---|---|---|---|
| Platform preparation | IMP-1 / IMP-10 | preparing, ready, first-load blocked, retry, fatal-safe | platform lifecycle -> Home |
| Home | IMP-10 | no game, recoverable game, observer-safe, storage issue | public recovery summary -> new/continue/discard/help/settings |
| Players | IMP-2 | empty, invalid, valid, editing, storage error | local collections -> PreparedRoster |
| Saved groups | IMP-2 | empty, list, replace confirmation, rename, delete | SavedGroup -> player draft |
| Game configuration | IMP-3 | edit, validation, review, confirmed | PreparedRoster -> PreparedGame |
| Configuration review | IMP-3 | summary, back-to-edit, confirm, persistence error | draft -> confirmed snapshot |
| Category selection | IMP-4 | modes, adult confirmation, insufficient pool, review | PreparedGame -> PreparedContentSelection |
| Category editor | IMP-4 | list, empty, create, edit, delete confirmation | custom categories -> local collection |
| Shared role-reveal list | IMP-5 | 0/N..N/N, observer, retry, safe recovery | SecretRoundSnapshot public projection -> RoundHandoff |
| Private role reveal | IMP-5 | covered, revealed, concealing, persistence error | selected player -> durable completion |
| Round ready | IMP-6 | roster/random/free summary, ready, observer | RoundHandoff -> durable clue phase begin |
| Managed clues | IMP-6 | current player, completed turns, final turn | active phase -> next turn/general discussion |
| Free clues / discussion | IMP-6 | untimed, running, paused, expired | active phase -> confirmed CluePhaseHandoff |
| Close-clues confirmation | IMP-6 | confirm, cancel, retry/conflict | phase -> durable handoff to IMP-7 |
| Shared voting list | IMP-7 | verbal, secret 0/N..N/N, observer, retry, Game Menu | CluePhaseHandoff -> voting session |
| Private vote | IMP-7 | covered voter, candidate selection, confirm, completed; no Game Menu | voter/candidates -> one durable hidden ballot |
| Tiebreak voting | IMP-7 | tied candidates, private/verbal method, second tie, Game Menu on shared surface | first tally -> VoteResolutionHandoff |
| Round resolution | IMP-8 | loading, resolving, continuation-ready, terminal-reveal, storage-error, conflict-reload, observer, safe-mode; Game Menu on shared states | VoteResolutionHandoff + secret envelope -> RoundResolutionHandoff or NextCluePhaseRequest |
| Final-attempt private flow | IMP-8 | private-handoff covered, private-entry, saving-attempt, completed; recovery covered; no Game Menu | eligible impostor -> durable attempt |
| Scoreboard | IMP-9 | applied once, ties, next round, final-round route, observer/error, Game Menu | RoundResolutionHandoff -> cumulative standings |
| Final ranking | IMP-9 | one/shared winners, rematch, new game, observer/error, Game Menu | completed match -> reset/preservation decision |
| Rematch review route | IMP-9 / IMP-10 | new gameId, editable players, configuration review, content review, validation errors | completed match -> revalidated setup -> IMP-5 role assignment |
| Game menu | IMP-10 | menu, pause pending, abandon confirm/error | active public feature -> Home or abandoned state |
| Settings | IMP-10 | preferences, unavailable APIs, delete confirm/error | LocalPreferences/LocalDataInventory -> persisted settings/reset |
| How to play / onboarding | IMP-10 | first-run, skipped, completed, contextual return | public rules -> Home/previous shared surface |

## Accepted prototype patterns

- One screen per major state, compact contextual headers and stable bottom actions.
- Separate shared lists and private pass-the-device surfaces for reveal and secret voting.
- Public N/N progress with completed players locked.
- Round header with current/total round, visible order policy, large timer and explicit expiry.
- Verbal and secret voting as different public workflows; tiebreak as a distinct state.
- Public resolution before scoreboard; scoreboard before next round; final ranking after configured
  rounds.
- Game Menu on shared IMP-6, IMP-7, IMP-8 and IMP-9 surfaces, never on role reveal, private vote or
  final-attempt flows. IMP-10 owns the control and dialogs; each feature only exposes a capability.
- Home continuity card, game-menu pause/abandon, settings danger zone and always-available help.

## Adapted patterns

- Managed clue chips become a durable sequence indicator. They are not arbitrary navigation; the
  primary command advances strictly to the next player.
- Prototype sheets become accessible dialogs/sheets with focus entry, Escape, inert background and
  focus restoration.
- Dark visual language is retained as intent, while palette balance, radii and component density are
  adapted to the real design system and accessibility requirements.
- Role/vote feedback may use motion, sound or vibration only through IMP-10 preferences and with
  secret-independent patterns.
- Home discard uses confirmation and the same durable abandonment boundary as the game menu.

## Rejected prototype behavior

- Local Context as source of truth, secrets in shared app state and any hardcoded concept/role.
- Reverse-array pseudo-random order, memory-only interval timers and reset-timer control.
- Direct navigation to voting, result or score before a durable idempotent commit.
- Fixed tied candidates, forced citizen victory, illustrative scoring or declaring the first tied
  player the sole winner.
- Revancha and Home sharing an identical reset action without an explicit preservation policy.
- Fake loading delays, preview/debug links, phone chrome, Tailwind import and production-only emoji
  controls.

## Specification ownership

- Closed IMP-1..IMP-5 specs remain domain-authoritative. Visual conformance work is delivered through
  IMP-10 and must preserve their acceptance criteria.
- IMP-6 owns ready/clues/discussion/timer/close screens and the public handoff to IMP-7.
- IMP-7 owns verbal/secret voting, private ballots, tally and tiebreak screens.
- IMP-8 owns final attempt, continuation decision and public role/concept resolution.
- IMP-9 owns scoring, standings, next-round preparation, final ranking and rematch policy.
- IMP-10 owns Home, onboarding/help, settings, game menu, global destructive actions and the shared
  accessible visual system.
- IMP-9 owns rematch data policy; IMP-10 owns its shell routing through editable player, configuration and content reviews before IMP-5.
