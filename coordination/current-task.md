# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** **MVP push (deadline compression).** Ship a complete, playable
Beacon loop on top of the existing role-views: Pilot can move the ship,
the game ends with a clear win (ship reaches port) or loss (ship hits
rock), and a "play again" button generates a new grid. README at the
repo root is added/updated to describe the game, who it is for, and how
to play. **The beam is cut for MVP** — see the decision log entry
"Deadline compression: collapse remaining slices into one MVP push".
This task closes the MVP per the brief.

**Assigned:** 2026-05-01 — Engineer

**Status:** in-progress

**Definition of done (all required):**

1. **Movement (Pilot input).** Pilot's screen shows four directional
   tap controls (up / down / left / right). Each tap sends an `input`
   message to the DO. The DO is authoritative: it validates the move
   (in bounds, target cell exists), updates the ship position, and
   broadcasts a fresh role-tailored `game-state` to both clients.
   Move attempts off the grid are no-ops (drop silently). Move
   attempts onto a `rock` cell trigger a **loss** (see below). Move
   attempts onto the `port` cell trigger a **win**.
2. **Win/loss endings.** When the game ends, the DO broadcasts
   `{ type: "ended", outcome: "win" | "loss" }` to both clients. Both
   players see a clear ending screen — *both roles* see the same
   outcome (win is shared, loss is shared; this is co-op). Wording
   should be British English and warm — e.g. "You made it home" /
   "You hit the rocks".
3. **Play again.** The ending screen shows a "Play again" button.
   Tapping it on either client sends a `restart` message to the DO.
   The DO regenerates the grid (fresh seed — *not* deterministic from
   the session code this time, because we want a different layout
   each round) and broadcasts new `game-state` messages. Both clients
   re-enter the playing state. Roles persist across restarts.
4. **Lighthouse view updates live.** When the Pilot moves, the
   Lighthouse view re-renders with the new ship position within ~1
   frame of the broadcast. (No new feature — but make sure the
   existing Lighthouse renderer responds to repeated `game-state`
   messages, not just the first one.)
5. **Pilot fog updates live.** The Pilot's porthole follows the ship
   — every move, the new neighbours are revealed and the old ones
   (now outside the radius) are fogged again. Wire still sends only
   the visible cells.
6. **README at repo root.** Add (or replace) `README.md` at
   `/Users/kevinwilson/Documents/GitHub/r-and-d-days/the-rivals/game-rivals-beta/README.md`
   with a short description of Beacon, who it is for, the deployed
   URL, and a one-paragraph "how to play" (one phone starts a session
   and shares the link, the second phone joins, A is the Pilot and
   taps to navigate, B is the Lighthouse and watches the chart, win
   by reaching the port, lose by hitting a rock). British English.
7. **Phone portrait still primary.** No horizontal scroll at 390px;
   tap targets comfortable for thumbs.
8. **Playwright spec extended.** Add a fourth spec that drives a full
   round end-to-end against the deployed URL: both contexts join,
   the Pilot moves at least once (assert ship cell coordinates change
   on the Lighthouse view), and either a win or a loss is reached
   (one easy way: rig the test to start a session with a known seed
   that places port adjacent to ship, OR — simpler — tap until the
   game ends and assert that an ending screen with `data-ended`
   appears with `data-outcome` of `win` or `loss`). Then click "Play
   again" and assert the playing state returns. The previous specs
   must continue to pass.
9. **Deployed.** `pnpm --filter product deploy` succeeds and the
   deployed URL behaves as above. Local-only does not count.

**Out of scope (cut for MVP — do NOT build):**

- The Lighthouse beam / ping. Cut. The asymmetry constraint is
  satisfied by views + inputs (Pilot moves, Lighthouse watches); see
  the decision log for the rationale.
- A clock or time limit. The endings are reach-port or hit-rock; no
  timer.
- Reconnection on dropped sockets. A drop still ends the round.
- Visual polish beyond legibility. Don't burn time on animation.
- Refactoring the existing spine. Extend, don't rewrite.

**Notes:**

- Hard rules apply: curly braces always, no `any`, prefer `type` over
  `interface`, named exports, British English. Commit small and
  often (≤15 min between commits). Do not sign commits. If commit
  signing prompts, drop the signature.
- Use the existing typed message envelopes; extend them. Suggested
  wire shape: `{ type: "input", action: "move", direction: "up" |
  "down" | "left" | "right" }` from client; `{ type: "game-state",
  view: …, state: … }` (already defined) and `{ type: "ended",
  outcome: "win" | "loss" }` from server; `{ type: "restart" }` from
  client. The DO is authoritative — never trust the client for
  movement.
- DO ignore `input` messages from the Lighthouse role; only the
  Pilot can drive the ship in MVP. Drop silently rather than
  erroring.
- This is the deadline-compressing slice. **Speed over polish.**
  Land it, append the review claim with the deployed URL and the
  fourth Playwright spec name, and hand back. Status protocol
  unchanged: `in-progress` when you start, `awaiting-review` when
  the claim is appended. Do NOT mark the task shipped — Reviewer
  PASS still required.
