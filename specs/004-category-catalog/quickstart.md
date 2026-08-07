# Quickstart: Catalogo de categorias y conceptos

## A. Validate the packaged catalog

1. Open content selection from a confirmed game while offline.
2. Verify all required general Spanish categories are available.
3. Verify every built-in category contains at least 10 valid unique concepts.
4. Verify adult categories are absent while adult content is disabled.

## B. Select content modes

1. Select one category and confirm its effective ID in review.
2. Select several categories and verify their order does not change the effective scope.
3. Choose all and verify every eligible general category participates.
4. Choose random category and draw several rounds with injected deterministic randomness.
5. Verify a fresh eligible category decision occurs on every draw.

## C. Manage custom categories

1. Create a custom category with valid unique concepts.
2. Rename it and edit one concept while preserving unchanged IDs.
3. Close and reopen the installed application offline and verify the category remains.
4. Cancel deletion and verify it remains; confirm deletion and verify it disappears.
5. Simulate a save failure and verify the editor draft is preserved with retry.

## D. Protect adult content

1. Verify adult content is disabled on a fresh installation.
2. Enable it and verify packaged adult categories become eligible without a network request.
3. Select an adult category, disable the preference and verify confirmation is blocked or the
   effective selection is safely recomputed.
4. Reopen offline and verify the persisted preference and filtering behavior.

## E. Enforce no repetition and exhaustion

1. Start with a confirmed `PreparedGame` and a small deterministic eligible pool.
2. Draw each concept and verify its ID is persisted before its text is exposed.
3. Verify no concept repeats within `PreparedGame.id`.
4. Exhaust the pool and verify further draws remain blocked with no automatic reset.
5. Cancel a manual reset and verify history remains; confirm reset and verify concepts are drawable.
6. Start a different game ID and verify it has independent history.

## F. Recover selection and failures

1. Confirm selection and verify RecoverySnapshot phase `content-selected`.
2. Close and reopen offline and verify `PreparedGame`, mode and effective categories recover.
3. Simulate quota, writer loss and revision conflict during draw.
4. Verify no concept text is exposed and retry does not consume two concepts.
5. Open observer mode and verify catalog browsing works while mutations and draw remain disabled.

## G. Accessibility, responsive layout and privacy

1. Complete selection, custom editing and reset confirmation using keyboard only.
2. Run axe on catalog, adult-enabled, editor, exhausted and storage-error states.
3. Verify no horizontal overflow at 320 px with maximum supported text lengths.
4. Verify URLs, console output, public errors and history records contain no concept text.

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
