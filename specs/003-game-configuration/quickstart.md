# Quickstart: Configuracion de partida

## A. Configure the default quick path

1. Prepare Ana, Bruno and Carla in player management.
2. Continue to game configuration.
3. Verify 3 rounds, 1 impostor, free conversation, roster order and verbal voting.
4. Verify final attempt is off and multi-impostor policies show random, unknown and single.
5. Review and confirm the configuration.

## B. Validate numerical boundaries

1. Set rounds to 1 and 10 and verify both are accepted.
2. Try 0 and 11 and verify the previous value remains with an actionable error.
3. For rosters of 3, 6, 9 and 20 players verify maximum impostors are 1, 2, 3 and 3.
4. Verify a value above the derived maximum cannot be confirmed.

## C. Configure conversation and participation

1. Switch from free conversation to the 60, 90 and 120 second presets.
2. Enter 30 and 600 seconds and verify both boundaries.
3. Try a non-30-second increment and verify it is rejected without changing the draft.
4. Select roster, random and free turn order.
5. Select verbal and secret voting.
6. Enable final attempt and verify the review describes one final accusation by the eliminated player.

## D. Configure multiple impostors

1. Use a roster supporting at least two impostors.
2. Select balanced allocation, known impostors and successive elimination.
3. Verify each independent choice appears in the review.
4. Return to one impostor and verify confirmation remains valid without hidden roster changes.

## E. Recover and protect state

1. Confirm a configuration while offline and close the application.
2. Reopen offline and verify the configured `PreparedGame` is restored from RecoverySnapshot.
3. Simulate a revision conflict, writer loss and unavailable storage.
4. Verify the draft remains, retry is available and the prior confirmed snapshot is intact.
5. Open in observer mode and verify review is possible but confirmation is disabled.

## F. Accessibility and privacy

1. Complete the flow with keyboard-only input and visible focus.
2. Run axe on defaults, timer, validation, review and storage-error states.
3. Verify no horizontal overflow at 320 px and supported mobile viewports.
4. Verify URLs, logs and public errors contain no player names or recovery payload.

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
