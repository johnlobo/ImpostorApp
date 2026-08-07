# Quickstart: Gestion de jugadores y grupos habituales

## A. Prepare a valid roster

1. Open player management with no saved state.
2. Add Ana, Bruno and Carla.
3. Rename Bruno to Brais.
4. Move Carla above Brais.
5. Verify the order Ana, Carla, Brais and continue availability.

## B. Validate boundaries

1. Try an empty name and a case-insensitive duplicate.
2. Verify inline errors and unchanged roster.
3. Reach 20 players and verify the twenty-first is rejected.
4. Remove players until two remain and verify continue is disabled.

## C. Save and reopen offline

1. Save a valid roster as Amigos.
2. Close the application.
3. Disable network and reopen the installed production build.
4. Load Amigos and verify names and order.

## D. Protect unsaved changes

1. Modify a loaded group draft.
2. Select another group.
3. Cancel replacement and verify the draft remains.
4. Confirm replacement and verify the selected group loads atomically.
5. Delete a saved group and verify the active draft remains.

## E. Storage failures and accessibility

1. Simulate quota, unavailable storage, incompatible data and writer loss.
2. Verify the draft remains and messages expose no entered names.
3. Run keyboard and axe checks on empty, valid, error and saved-group states.
4. Verify no horizontal overflow at 320 px and supported mobile viewports.

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
