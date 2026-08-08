# Specification Quality Checklist: Continuidad, ayuda, ajustes y accesibilidad

**Purpose**: Validate specification completeness before planning
**Created**: 2026-08-08
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] Product behaviour is separated from ProposedUI implementation details
- [x] User value, destructive consequences and privacy are explicit
- [x] All mandatory sections and screen states are present
- [x] IMP-10 boundaries against IMP-1..IMP-9 are explicit

## Requirement Completeness

- [x] Continue always returns to a safe shared surface
- [x] Final-attempt recovery returns to a covered private handoff without restoring secret DOM
- [x] Pause coordinates a running timer before navigating Home
- [x] Abandon, discard and global delete have distinct effects and confirmations
- [x] Onboarding/help behaviour and offline availability are testable
- [x] Sound, vibration, adult preference, contrast and language scope are resolved
- [x] Secret-independent feedback is required
- [x] Global data inventory includes future stores while retaining PWA shell
- [x] Screen inventory covers Home, menu, settings, help and confirmations
- [x] Game Menu coverage and private-surface exclusions are explicit for IMP-6 through IMP-9
- [x] Rematch follows editable player, configuration and content reviews before role assignment
- [x] No unresolved clarification markers remain

## Accessibility and Architecture

- [x] Safe areas, 320 px, 200 percent zoom and reduced motion are required
- [x] Toggle, segmented control, dialog, sheet, progress and toast semantics are required
- [x] Focus entry, Escape and focus restoration are testable
- [x] Tailwind, phone preview frame and mock Context are explicitly non-normative
- [x] Public projections prevent shell components from receiving secrets
- [x] Offline, writer, revision, idempotency and bundle gates are required

## Notes

Ready for planning after cross-epic review of the public pause/resume ports exposed by IMP-6..IMP-9.
