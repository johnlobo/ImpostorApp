---

description: "Implementation tasks for IMP-1 mobile installable offline platform"
---

# Tasks: Plataforma movil instalable y offline

**Input**: Design documents from `/specs/001-mobile-offline-platform/`

**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`

**Tests**: Required by the specification, quickstart, and project constitution. Test tasks must be written first and fail for the intended reason before implementation.

**Organization**: Tasks are grouped by user story so each story remains independently testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and has no dependency on an incomplete task
- **[Story]**: Maps the task to its owning user story
- Every task names the exact file or directory it changes

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the single-package React PWA and its quality gates.

- [X] T001 Initialize the React 19.2, TypeScript 5.9, and Vite 8.2 project with runtime and test dependencies in `package.json` and `package-lock.json`
- [X] T002 Configure strict TypeScript, Vite, Vitest, and browser build settings in `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, and `vite.config.ts`
- [X] T003 [P] Configure ESLint and Prettier quality commands in `eslint.config.js`, `.prettierrc.json`, and `.prettierignore`
- [X] T004 [P] Configure Playwright projects for Chromium, WebKit, mobile viewports, and production preview in `playwright.config.ts`
- [X] T005 [P] Create the application entry point and test bootstrap in `index.html`, `src/main.tsx`, and `src/test/setup.ts`
- [X] T006 [P] Create CI quality-gate and GitHub Pages deployment workflows in `.github/workflows/ci.yml` and `.github/workflows/deploy-pages.yml`
- [X] T007 [P] Add repository-safe Node, build, coverage, Playwright, and environment exclusions in `.gitignore`

**Checkpoint**: The empty application installs, formats, lints, type-checks, tests, and builds in CI.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Establish shared types, composition, error handling, localization, and mobile styling required by every story.

**CRITICAL**: No user story work starts until this phase is complete.

- [X] T008 Define versioned persisted entities, lifecycle states, writer lease, and public error unions in `src/domain/entities/platform.ts`
- [X] T009 [P] Define framework-independent persistence, lifecycle, connectivity, clock, and writer-coordination ports in `src/domain/ports/platform.ts`
- [X] T010 [P] Implement typed Spanish translations for lifecycle, installation, storage, update, and recovery messages in `src/i18n/es.ts` and `src/i18n/translate.ts`
- [X] T011 [P] Create global design tokens, safe-area handling, visible focus, touch targets, and narrow portrait layout rules in `src/styles/global.css`
- [X] T012 Implement reducer-based internal navigation and shared application composition in `src/app/navigation.ts`, `src/app/AppShell.tsx`, and `src/app/App.tsx`
- [X] T013 [P] Add deterministic fixture builders for platform states and persisted records in `tests/fixtures/platform.ts`
- [X] T014 Add foundational unit tests for public errors, state transitions, and secret-free serialization in `src/domain/entities/platform.test.ts`

**Checkpoint**: The domain contracts and accessible mobile shell are ready; infrastructure remains replaceable and contains no game secrets in shared state or URLs.

---

## Phase 3: User Story 1 - Jugar sin conexion despues de la primera carga (Priority: P1) MVP

**Goal**: Prepare the installed version for offline use, reopen it without a network, tolerate connectivity changes, and explain an interrupted first load.

**Independent Test**: Complete one production load online, wait for `offline-ready`, close all windows, reopen offline, and use every available screen; separately interrupt the first load and verify `first-load-required` with a retry action.

### Tests for User Story 1

- [X] T015 [P] [US1] Write failing lifecycle unit tests for first-load, offline-ready, degraded, connectivity-change, and retry transitions in `src/features/platform/services/offlineLifecycle.test.ts`
- [X] T016 [P] [US1] Write failing component tests for readiness, first-load-required, and storage failure messages and actions in `src/features/platform/components/OfflineStatus.test.tsx`
- [X] T017 [P] [US1] Write failing production-build E2E tests for precache completion, interrupted first load, offline reopening, and detection plus safe recovery when a previously prepared cache is removed in `tests/e2e/offline.spec.ts`

### Implementation for User Story 1

- [X] T018 [US1] Configure `vite-plugin-pwa` generateSW precaching, prompt registration, repository base path, and offline manifest assets in `vite.config.ts`
- [X] T019 [P] [US1] Implement connectivity observation without navigation or session interruption in `src/infrastructure/pwa/browserConnectivity.ts`
- [X] T020 [US1] Implement the offline lifecycle state machine and public recovery actions in `src/features/platform/services/offlineLifecycle.ts`
- [X] T021 [US1] Connect service-worker registration events and cache readiness to the lifecycle port in `src/infrastructure/pwa/registerServiceWorker.ts`
- [X] T022 [US1] Build the accessible readiness, degraded-mode, and first-load recovery UI in `src/features/platform/components/OfflineStatus.tsx` and `src/features/platform/hooks/useOfflineLifecycle.ts`
- [X] T023 [US1] Integrate offline lifecycle state into the application shell without network-dependent runtime calls in `src/app/App.tsx`

**Checkpoint**: US1 passes independently against a production build with online/offline transitions and no required runtime request.

---

## Phase 4: User Story 2 - Instalar y abrir como una aplicacion movil (Priority: P1)

**Goal**: Make ImpostorApp installable with recognizable branding and device-appropriate installation help on supported iPhone and Android browsers.

**Independent Test**: Install on representative iPhone and Android devices, launch from the home-screen icon, and verify standalone portrait presentation; request help where automatic installation is unavailable.

### Tests for User Story 2

- [X] T024 [P] [US2] Write failing component tests for iOS, Android, unsupported, and already-installed help states in `src/features/platform/components/InstallHelp.test.tsx`
- [X] T025 [P] [US2] Write failing manifest and standalone presentation checks in `tests/e2e/installability.spec.ts`
- [X] T026 [P] [US2] Write failing accessibility and narrow portrait viewport checks for install flows in `tests/accessibility/install-help.spec.ts`

### Implementation for User Story 2

- [X] T027 [P] [US2] Add maskable and Apple touch application icons and icon source documentation in `public/icons/` and `public/icons/README.md`
- [X] T028 [US2] Complete the Spanish PWA manifest, theme metadata, standalone display, and Apple mobile metadata in `vite.config.ts` and `index.html` after T018 establishes the shared PWA configuration
- [X] T029 [US2] Implement capability-based installation detection and install-prompt handling in `src/infrastructure/pwa/installCapability.ts`
- [X] T030 [US2] Build device-appropriate accessible installation help and fallback messaging in `src/features/platform/components/InstallHelp.tsx` and `src/features/platform/hooks/useInstallPrompt.ts`
- [X] T031 [US2] Expose installation help from the shared application shell in `src/app/AppShell.tsx`

**Checkpoint**: US2 is independently installable and usable in portrait, with clear fallback guidance when installation cannot be prompted.

---

## Phase 5: User Story 3 - Conservar la informacion local (Priority: P2)

**Goal**: Persist supported local records and the last confirmed game snapshot atomically across closes, restarts, and compatible migrations while preserving incompatible data safely.

**Independent Test**: Save representative records, interrupt a snapshot commit, restart, and apply a compatible migration; the last complete revision and all supported records remain available, while incompatible data opens read-only without being cleared.

### Tests for User Story 3

- [X] T032 [P] [US3] Write failing persistence contract tests for initialization, collections, revision conflicts, atomic snapshots, explicit clearing, and public errors in `tests/integration/persistenceGateway.spec.ts`
- [X] T033 [P] [US3] Write failing migration rollback and future-schema safe-mode tests with fake IndexedDB in `tests/integration/persistenceMigrations.spec.ts`
- [X] T034 [P] [US3] Write failing multi-tab writer/observer handoff tests in `tests/integration/writerCoordination.spec.ts`
- [X] T035 [P] [US3] Write failing E2E tests for close recovery, interrupted writes, storage failures, browser- or OS-initiated IndexedDB removal or unavailability, and explicit user-confirmed data deletion in `tests/e2e/recovery.spec.ts`

### Implementation for User Story 3

- [X] T036 [P] [US3] Define Dexie tables, indexes, current schema, and transactional migrations in `src/infrastructure/persistence/database.ts` and `src/infrastructure/persistence/migrations.ts`
- [X] T037 [US3] Implement the persistence gateway with atomic revision checks, typed error mapping, and payload-safe diagnostics in `src/infrastructure/persistence/dexiePersistenceGateway.ts`
- [X] T038 [P] [US3] Implement exclusive writer lease acquisition, observer fallback, heartbeat, and safe handoff in `src/infrastructure/coordination/writerLease.ts`
- [X] T039 [US3] Implement recovery orchestration that initializes storage and exposes the last confirmed snapshot or safe mode in `src/features/platform/services/recoveryService.ts`
- [X] T040 [US3] Build accessible recovery, observer-mode, storage-full, incompatibility, and confirmed data-deletion UI in `src/features/platform/components/RecoveryStatus.tsx`
- [X] T041 [US3] Compose persistence, writer coordination, and recovery state into application startup in `src/app/App.tsx`

**Checkpoint**: US3 recovers only durable data, never silently clears incompatible state, and permits writes from one proven owner only.

---

## Phase 6: User Story 4 - Recibir actualizaciones sin interrumpir la partida (Priority: P3)

**Goal**: Detect complete updates, defer them during active play, and apply them once at an explicit safe point without losing local data.

**Independent Test**: Serve version B while a simulated game runs on version A; verify A is not reloaded, postpone B, finish the game, apply B once, and confirm persisted data remains intact.

### Tests for User Story 4

- [X] T042 [P] [US4] Write failing unit tests for update available, active-game deferral, durable-state guard, apply-once, and failed-update transitions in `src/features/platform/services/updateCoordinator.test.ts`
- [X] T043 [P] [US4] Write failing component tests for postpone, safe apply, applying, and failed-update actions in `src/features/platform/components/UpdatePrompt.test.tsx`
- [X] T044 [P] [US4] Write failing two-version E2E tests for interrupted downloads, active-game deferral, single reload, and data preservation in `tests/e2e/update.spec.ts`

### Implementation for User Story 4

- [X] T045 [US4] Implement update coordination with active-game and durable-snapshot guards in `src/features/platform/services/updateCoordinator.ts`
- [X] T046 [US4] Extend service-worker registration with complete-update notification, explicit activation, and apply-once protection in `src/infrastructure/pwa/registerServiceWorker.ts`
- [X] T047 [US4] Build the accessible non-modal update prompt and safe-point actions in `src/features/platform/components/UpdatePrompt.tsx` and `src/features/platform/hooks/useAppUpdate.ts`
- [X] T048 [US4] Integrate update availability and application into the shared shell without automatic active-game reloads in `src/app/App.tsx`

**Checkpoint**: US4 preserves the running version and durable data until an update is complete and explicitly safe to activate.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verify delivery, performance, accessibility, privacy, and real-device behavior across all stories.

- [X] T049 [P] Add automated axe checks for the shared shell and all platform states in `tests/accessibility/platform.spec.ts`
- [X] T050 [P] Add bundle-size and production offline smoke checks to CI in `scripts/check-bundle-size.mjs` and `.github/workflows/ci.yml`
- [X] T051 [P] Document supported browsers, local quality commands, PWA production validation, and data-loss limitations in `README.md`
- [X] T052 Execute and record all automated quickstart scenarios A-E in `specs/001-mobile-offline-platform/checklists/quickstart-results.md`
- [ ] T053 Execute and record the iPhone and Android installation matrix, portrait overflow checks, and offline-open timings in `specs/001-mobile-offline-platform/checklists/device-matrix.md`, then run the installation usability protocol with at least 10 participants and record device, browser, duration, success, and help received in `specs/001-mobile-offline-platform/checklists/installation-usability.md`
- [X] T054 Run `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`, and `npm run test:e2e`, then record final IMP-1 requirement and constitution traceability in `specs/001-mobile-offline-platform/checklists/implementation.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies.
- **Foundational (Phase 2)**: Depends on Setup and blocks every user story.
- **US1 and US2 (Phases 3-4)**: Both can begin after Foundational and mostly proceed in parallel; T028 waits for the shared PWA configuration from T018 to avoid concurrent edits to `vite.config.ts`.
- **US3 (Phase 5)**: Begins after Foundational; its persistence API is independently testable, while final app composition should follow US1 lifecycle composition.
- **US4 (Phase 6)**: Depends on US1 service-worker lifecycle and US3 durable snapshot guard.
- **Polish (Phase 7)**: Depends on every story selected for the release.

### User Story Dependency Graph

```text
Setup -> Foundational -> US1 (offline) --------> US4 (safe updates)
                    |-> US2 (installation)
                    |-> US3 (persistence) -----> US4 (safe updates)

US1 + US2 + US3 + US4 -> Polish and release validation
```

### Within Each User Story

- Write the story tests first and confirm they fail for the intended reason.
- Define adapters and services before composing UI into `App.tsx`.
- Complete the independent test at the checkpoint before starting a dependent story.
- Keep lifecycle messages and errors free of game payloads and future secret information.

### Parallel Opportunities

- In Setup, T003-T007 touch independent configuration files.
- In Foundational, T009-T011 and T013 can run in parallel after T008 is understood.
- After Foundational, US1, US2, and the persistence adapter portion of US3 can proceed concurrently.
- Within each story, all test tasks marked `[P]` can be authored concurrently before implementation.
- In Polish, T049-T051 can run concurrently before recorded validation.

---

## Parallel Examples

### User Story 1

```text
T015: lifecycle unit tests in src/features/platform/services/offlineLifecycle.test.ts
T016: readiness component tests in src/features/platform/components/OfflineStatus.test.tsx
T017: production offline E2E tests in tests/e2e/offline.spec.ts
```

### User Story 2

```text
T024: installation-help component tests
T025: manifest and standalone E2E checks
T026: accessibility and portrait viewport checks
```

### User Story 3

```text
T032: persistence gateway contract tests
T033: migration rollback tests
T034: writer coordination tests
T035: recovery E2E tests
```

### User Story 4

```text
T042: update coordinator unit tests
T043: update prompt component tests
T044: two-version update E2E tests
```

---

## Implementation Strategy

### MVP First (User Story 1)

1. Complete Setup and Foundational phases.
2. Complete US1 tests and implementation.
3. Run the US1 independent production-build offline test.
4. Demonstrate reliable reopening after first preparation before expanding scope.

### Incremental Delivery

1. Deliver US1 as the offline runtime MVP.
2. Add US2 installation and real-device presentation while preserving US1.
3. Add US3 transactional persistence and recovery.
4. Add US4 controlled update activation using US1 and US3 guarantees.
5. Complete cross-cutting validation and the device matrix before release.

### Task Completion Rules

- A task is complete only when its tests pass and its file changes satisfy the referenced contracts.
- Test tasks must fail for the expected missing behavior before implementation begins.
- Generated build and test artifacts are never committed.
- Commit after each task or small coherent group while preserving sequential task IDs in this document.
