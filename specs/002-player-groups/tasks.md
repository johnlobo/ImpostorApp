---
description: "Implementation tasks for IMP-2 player and saved-group management"
---

# Tasks: Gestion de jugadores y grupos habituales

**Input**: Documents in `specs/002-player-groups/`  
**Tests**: Required by the constitution and mapped to each story.

## Phase 1: Setup and contracts

- [X] T001 Define player, draft, group and validation entities in `src/domain/entities/playerGroup.ts`
- [X] T002 Define the prepared-roster and repository ports in `src/domain/ports/playerGroups.ts`
- [X] T003 Add typed Spanish messages for all player-group states in `src/i18n/es.ts`

## Phase 2: Foundational domain and persistence

- [X] T004 Write failing table-driven draft rule tests in `src/domain/entities/playerGroup.test.ts`
- [X] T005 Implement normalization, validation and immutable draft commands in `src/domain/entities/playerGroup.ts`
- [X] T006 Write failing repository integration tests in `tests/integration/playerGroupsRepository.spec.ts`
- [X] T007 Implement record parsing and the typed repository in `src/infrastructure/persistence/playerGroupsRepository.ts`
- [X] T008 Verify the existing player-groups schema needs no migration and cover typed records in `tests/integration/playerGroupsRepository.spec.ts`

## Phase 3: User Story 1 - Prepare players (P1)

- [X] T009 [US1] Write failing service and component tests for add, rename, remove, reorder and limits
- [X] T010 [US1] Implement draft orchestration in `src/features/player-groups/services/playerGroupsService.ts`
- [X] T011 [US1] Implement `usePlayerGroups` state and command hook
- [X] T012 [US1] Build the accessible ordered-player editor in `PlayerGroupsScreen.tsx`
- [X] T013 [US1] Integrate player management and prepared-roster handoff in `src/app/App.tsx`

## Phase 4: User Story 2 - Saved groups (P2)

- [X] T014 [US2] Write failing service and component tests for list, save, load, update and delete
- [X] T015 [US2] Implement saved-group orchestration and duplicate pending-operation protection
- [X] T016 [US2] Add group save, load, edit and confirmed-delete controls to `PlayerGroupsScreen.tsx`
- [X] T017 [US2] Add offline save/reopen/load coverage in `tests/e2e/player-groups.spec.ts`

## Phase 5: User Story 3 - Safe failures (P3)

- [X] T018 [US3] Write failure tests for quota, unavailable storage, incompatible records and writer loss
- [X] T019 [US3] Map safe recovery actions without exposing entered data
- [X] T020 [US3] Add retry and continue-without-save states to the screen

## Phase 6: Polish and validation

- [X] T021 Add player-group layout, focus and responsive styles in `src/styles/global.css`
- [X] T022 Add axe and mobile-overflow coverage in `tests/accessibility/player-groups.spec.ts`
- [X] T023 Execute quickstart A-E and record evidence in `specs/002-player-groups/checklists/implementation.md`
- [X] T024 Run all quality gates, reconcile Jira and open the GitHub pull request
