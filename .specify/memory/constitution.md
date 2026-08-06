<!--
Sync Impact Report
- Version change: template (unversioned) -> 1.0.0
- Modified principles:
  - Template Principle 1 -> I. Specification and Traceability First
  - Template Principle 2 -> II. Secret Information Stays Private
  - Template Principle 3 -> III. Offline-First and Recoverable
  - Template Principle 4 -> IV. Tested, Deterministic Game Rules
  - Template Principle 5 -> V. Mobile Simplicity and Accessibility
- Added sections:
  - Product and Technical Constraints
  - Spec-Driven Delivery and Quality Gates
- Removed sections: none
- Follow-up TODOs: none
-->
# ImpostorApp Constitution

## Core Principles

### I. Specification and Traceability First
Every user-facing capability MUST originate in an approved Spec Kit specification. Each
specification MUST reference its Jira epic, express testable requirements and scenarios, and remain
the source of truth for implementation. A technical plan and an ordered task breakdown MUST exist
before production code is written. If implementation reveals a requirement change, the
specification MUST be amended before or together with the code. Jira tracks delivery; repository
specifications define expected behaviour.

Rationale: product intent must remain reviewable and traceable from an epic through requirements,
tasks, tests, and code rather than being trapped in chat history.

### II. Secret Information Stays Private
The shared-device experience MUST never expose a category, concept, role, vote, or previous private
choice outside its intended private screen. Role and voting flows MUST include an explicit conceal
step before control returns to a shared screen. Visual, audio, vibration, timing, accessibility
metadata, logs, and error messages MUST NOT vary in a way that reveals a secret role or vote.
Player names, custom categories, preferences, and game state MUST remain local by default. No
account, analytics, advertising, remote service, or data transmission may be introduced without an
approved specification and a constitution amendment covering privacy consequences.

Rationale: secrecy is a core game mechanic, while local-only data minimises privacy and security
risk for a social game used among friends.

### III. Offline-First and Recoverable
After its first successful load, every core activity required to configure, play, score, finish, and
restart a game MUST work without network access. The application MUST be installable as a PWA on
supported iPhone and Android browsers. Game state MUST be persisted at every irreversible
transition so an unexpected close or refresh can resume safely. Stored-data schema changes MUST
include a tested migration or a safe, clearly communicated fallback; application updates MUST NOT
silently destroy active games, saved groups, custom content, or preferences.

Rationale: a party game must remain dependable in homes, trips, and venues with unreliable
connectivity, and a shared phone must not lose the group's progress.

### IV. Tested, Deterministic Game Rules
Game rules MUST be implemented in a deterministic domain layer independent of presentation and
persistence. Before implementing or changing a rule, automated tests MUST describe its normal,
boundary, and invalid states and MUST initially fail for the intended reason. Random category,
concept, starting-player, and impostor selection MUST use an injectable source of randomness so
tests are reproducible. Combinatorial rules involving player counts, multiple impostors, voting,
ties, final guesses, victory, scoring, and multi-round allocation MUST have table-driven or
property-based coverage. A feature is incomplete while required tests, linting, type checks, or
build verification fail.

Rationale: configuration creates many interacting rule combinations that cannot be validated
reliably through manual play alone.

### V. Mobile Simplicity and Accessibility
Every primary flow MUST be designed for a single shared mobile screen and usable without prior
training. Controls MUST have clear Spanish labels, adequate touch targets, visible focus, sufficient
contrast, and semantic names for assistive technology. Essential information MUST NOT depend only
on colour, sound, vibration, animation, hover, or gesture. Motion, sound, and vibration MUST be
optional and MUST respect device preferences where available. The first release MUST be in Spanish,
while user-visible text MUST be externalised so additional languages do not require changing game
logic. New configuration options MUST have safe defaults and MUST not obstruct the quick-start path.

Rationale: the device changes hands frequently, often in noisy or dim environments, so clarity,
privacy, and accessibility directly determine whether the game works.

## Product and Technical Constraints

- The first release MUST support 3 to 20 local players sharing one device and MUST NOT require an
  account.
- The architecture MUST remain a client-only PWA unless an approved specification demonstrates why
  a backend is necessary.
- Persistent data MUST be limited to active-game recovery, saved player groups, custom content,
  used-concept history, and user preferences.
- Adult content MUST be isolated from general content and disabled by default.
- Dependencies MUST be justified by concrete functionality, maintenance health, bundle impact, and
  offline compatibility. A small internal implementation is preferred when it is safer and simpler.
- Business rules MUST remain independent of UI framework, browser storage adapter, service worker,
  and sound or vibration integrations.
- Supported mobile viewports MUST avoid horizontal scrolling and layout-breaking content. Core
  interactions MUST remain responsive during offline use on representative mid-range devices.
- No technology choice in this constitution replaces the architecture decisions recorded in each
  feature plan.

## Spec-Driven Delivery and Quality Gates

1. Select or create the Jira epic that owns the capability.
2. Run `$speckit-specify` and include the epic key in the specification metadata or introduction.
3. Run `$speckit-clarify` when any requirement, edge case, or rule interaction remains ambiguous.
4. Run `$speckit-plan` before selecting implementation details or modifying production code.
5. Run `$speckit-tasks`; tasks MUST be independently actionable, ordered by dependency, and mapped
   to requirements. Create or link the corresponding Jira stories and tasks.
6. Run `$speckit-analyze` before implementation. Critical inconsistencies or uncovered requirements
   MUST be resolved; lower-severity findings MUST be explicitly accepted or corrected.
7. Implement in small, reviewable increments. Each increment MUST include the relevant automated
   tests and preserve the offline and privacy invariants.
8. Before completion, run all applicable unit, integration, accessibility, lint, type, build, PWA,
   and offline checks. Acceptance criteria MUST be demonstrably satisfied.
9. A Jira item may move to Done only when its specification, tasks, tests, implementation, and
   documentation agree. Known deviations MUST be recorded rather than hidden.

Reviewers MUST reject changes that bypass the specification, expose secret information, introduce
unapproved network dependencies, make game rules non-deterministic in tests, or reduce required
accessibility. Complexity that is not required by an approved specification MUST be removed.

## Governance

This constitution governs all specifications, plans, tasks, implementation, and reviews for
ImpostorApp. When another project document conflicts with it, this constitution takes precedence.

An amendment MUST be proposed as a documented change describing the motivation, affected
principles, migration impact, and alternatives considered. Adoption requires explicit approval by
the project owner and simultaneous updates to any affected specifications or plans.

Versions follow semantic versioning:

- MAJOR for removing or incompatibly redefining a principle or governance rule.
- MINOR for adding a principle or materially expanding mandatory guidance.
- PATCH for clarifications that do not change obligations.

Every specification and implementation review MUST include a constitution-compliance check.
Exceptions MUST be documented in the relevant plan with scope, rationale, risk, owner, and removal
date. Permanent exceptions require a constitution amendment. The constitution MUST be reviewed at
the start of each epic and before any public release.

**Version**: 1.0.0 | **Ratified**: 2026-08-07 | **Last Amended**: 2026-08-07
