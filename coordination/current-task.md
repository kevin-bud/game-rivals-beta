# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Generate a per-session game grid in the Durable Object and
render the two role-specific views ("Beacon" — Pilot vs Lighthouse). No
movement, no beam, no win condition yet — this slice proves the
asymmetry: two devices on the same session see *different* views of the
*same* authoritative state.

**Assigned:** 2026-05-01 13:25 — Engineer

**Status:** in-progress

**Game context (read once before coding):**

The chosen game is "Beacon" — see decision log entry "Game concept:
'Beacon'" dated 2026-05-01 13:25 for the full design. Short version:
cooperative two-player game on a small grid. Pilot (role A) navigates a
craft through fog of war toward a port without hitting rocks.
Lighthouse (role B) sees the whole grid and (later) rotates a beam to
guide the Pilot. This task is *only* the first slice — the visible
asymmetry, not the gameplay.

**Definition of done:**

- When the second player joins (the spine already detects this), the
  Durable Object generates a fresh game grid and broadcasts an
  authoritative `game-state` message containing role-appropriate views
  to each connected client.
- The grid is a 2D array of cells. Suggested dimensions: 6 columns × 10
  rows (phone-portrait friendly, comfortable tap targets). Cell types:
  `empty`, `rock`, `port`, `ship`. Exactly one `port`, exactly one
  `ship`, between 6 and 10 `rock` cells, the rest `empty`. Generation
  is procedural (seeded from the session code or a fresh random — your
  choice; record it in the commit message).
- The Pilot's view shows only the cells within a fog-of-war radius
  around the ship (suggested: cells at Chebyshev distance ≤ 1, i.e. the
  ship and its 8 neighbours). All other cells render as fog. The Pilot
  must be able to *see* their ship and the cells immediately around
  it; rocks within view are visible; the port is only visible if it is
  within view. The Pilot does not see anything outside the fog.
- The Lighthouse's view shows the entire grid: ship position, all
  rocks, the port. The Lighthouse does *not* see the Pilot's fog
  radius — they see the full board.
- Both views render correctly on a phone in portrait (~390px wide). No
  horizontal scroll. The lobby layout still works for the two-players-
  joined case as a fallback if anything goes wrong.
- Role labels remain visible: the local player can still see whether
  they are A/Pilot or B/Lighthouse.
- The grid state is held in the DO. The two clients receive
  *different* messages tailored to their role; do not send the full
  state to the Pilot. (This matters — the asymmetry is real, not
  cosmetic.)
- A Playwright spec extends the existing test to assert: after both
  players connect, the Pilot's page shows fog cells AND a ship cell
  AND no full-grid markup; the Lighthouse's page shows all rock cells
  AND the port AND the ship. Pick stable selectors (e.g. `data-cell`,
  `data-cell-type`, `data-fog`) so the assertions are direct.
- `pnpm --filter product deploy` succeeds and the deployed URL behaves
  as above. Local-only success is not "done".

**Out of scope for this task:**

- Movement (Pilot taps to move). That is the *next* slice.
- The beam (Lighthouse rotates a direction). Slice after movement.
- Win/loss/timeout, restart, "play again". Later.
- Visual polish beyond legible cells (a dark theme is welcome but not
  required). Naming the game "Beacon" in the UI is optional this
  slice; "session" wording is fine until the gameplay is in place.

**Notes:**

- The game state goes inside `SessionRoom` (the existing DO). Don't
  introduce a new DO class. Add a `GameState` type and a generator
  function; the DO emits role-specific `game-state` messages on the
  same socket the spine already uses. Use a typed message envelope
  (`{ type: "game-state", view: "pilot" | "lighthouse", … }`) so the
  client can switch on it.
- Keep the client minimal — extend the existing single-page script,
  no framework. If the inline `<script>` is becoming hard to read,
  splitting into a small ES module served from the same Worker is
  fine; document the choice in the commit.
- Hard rules apply: curly braces on every conditional, no `any`,
  prefer `type` over `interface`, named exports, British English in
  any human-facing copy. Commit small and often (≤15 min of active
  work between commits). Do not sign commits.
- When done, append a claim to `coordination/review-queue.md` with
  the deployed URL, the commit sha, the role-view assertions the
  Reviewer should run, and the new Playwright spec name. Do not mark
  this task "shipped" yourself — that requires a Reviewer PASS.
