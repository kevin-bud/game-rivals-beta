# Review queue

The Engineer adds entries here when claiming work is shipped. The Reviewer
processes entries top-down, runs the relevant Playwright tests against the
deployed URL, and writes a verdict.

A claim is not "shipped" until the Reviewer verifies it.

---

## Template

**Commit:** [sha]
**Claim:** What the Engineer says is now working.
**Reviewer verdict:** PASS / FAIL — [reasoning, evidence]

---

## 2026-05-01 — Session spine (lobby + role assignment)

**Commit:** 8f49a19
**Deployed URL:** https://game-rivals-beta-product.kevin-wilson.workers.dev

**Claim:** Two devices can land on the deployed product URL, create or join a single shared session via a 5-character code (or `?s=<code>` link), and both see each other connected in a phone-friendly lobby with distinct roles A and B. A third device on the same code is rejected with a "session is full" message. Backed by a Cloudflare Durable Object (`SessionRoom`) using the WebSocket Hibernation API.

**Implementation notes:**

- DO commitment: one `SessionRoom` Durable Object class per session, addressed by `env.SESSION.idFromName(code)`. SQLite migration `v1` (this is what current Workers DO requires for new classes — `new_sqlite_classes`). No persistence beyond DO memory required at this stage; sockets are managed via `acceptWebSocket` so the DO can hibernate.
- Worker routes: `GET /` serves the inline-scripted HTML lobby; `POST /api/new` returns a fresh `{ code }`; `GET /api/ws?s=<code>` upgrades and forwards to the DO.
- Code alphabet excludes 0/O/1/I/L for readability — five characters from a 31-char alphabet.
- "Session full" is delivered by accepting the WS, sending `{ "type": "full" }` and closing with code `4000`. Both signals are honoured by the client. (A pre-upgrade HTTP 409 would be cleaner but browsers cannot read the body of a failed WS handshake, so this is the practical path.)
- Client is plain TypeScript inline in one HTML page — no framework. Phone-portrait first; uses safe-area insets and a 420px max-width.
- Out of scope per the task: reconnection on dropped sockets, refresh resilience, gameplay. A drop is surfaced as "Disconnected. Start a new session to play again."

**Verification script for the Reviewer:**

1. From the repo root: `PRODUCT_URL=https://game-rivals-beta-product.kevin-wilson.workers.dev pnpm --filter product test:e2e` — should run two specs and both pass. The second spec covers two-context joining, distinct A/B role assignment, the phone-viewport no-horizontal-scroll check, and the third-device rejection.
2. Manual sanity (optional): open the deployed URL on a phone in portrait, tap "Start session", copy the link, open it on a second device. Both devices should within ~2s show both roles connected, with the local device's role highlighted as "you". Open a third device on the same link — it should land on the "Session is full" card.
3. `curl -X POST https://game-rivals-beta-product.kevin-wilson.workers.dev/api/new` should return `{"code":"<5 chars>"}` with status 200.

**Reviewer verdict:** PASS — Ran `PRODUCT_URL=https://game-rivals-beta-product.kevin-wilson.workers.dev pnpm --filter product test:e2e` from the repo root. Both specs passed in 6.4s against the deployed Worker:

- `home page renders the start-session card` (821ms): GET `/` returns 200; "Rivals Beta" heading and "Start session" button are visible.
- `two players can join the same session and see each other` (4.9s) — covers every assertion in the claim:
  - 5-character session code emitted from `Start session` matches `/^[A-Z2-9]{5}$/` (alphabet excludes 0/O/1/I/L as documented).
  - Phone viewport (390x844): `document.documentElement.scrollWidth <= 390`, no horizontal scroll.
  - Second context joins via `/?s=<code>` and sees the same code; both contexts show `#role-a` and `#role-b` with `data-state="connected"`.
  - Distinct A/B assignment verified by `data-self` attribute: `truefalse` on page A, `falsetrue` on page B.
  - Third browser context on the same code lands on a "Session is full" heading within 10s — rejection path is exercised end-to-end.

Sanity check: `curl -X POST https://game-rivals-beta-product.kevin-wilson.workers.dev/api/new` returned `{"code":"3NEJW"}` with HTTP 200.

Shipped.

---

## 2026-05-01 — Beacon: asymmetric grid views (Pilot vs Lighthouse)

**Commit:** 5b2cfb8
**Deployed URL:** https://game-rivals-beta-product.kevin-wilson.workers.dev

**Claim:** When two devices join the same session, the existing `SessionRoom` Durable Object generates a fresh 6×10 Beacon grid with one ship, one port, and 6–10 rocks, then sends a *role-tailored* `game-state` message to each socket. Player A renders as the **Pilot** and sees only the cells inside a Chebyshev-radius-1 fog porthole around the ship; the rest of the grid is rendered as fog (`data-fog="true"`) with no `data-cell-type` metadata at all. Player B renders as the **Lighthouse** and sees every cell typed (ship + port + 6–10 rocks + empties). The asymmetry is enforced at the wire boundary — the Pilot's socket never receives the full state, so a curious browser inspector cannot reveal it. Phone-portrait friendly, no horizontal scroll on a 390-wide viewport, role labels visible (`#game-role-name[data-game-role="pilot"|"lighthouse"]`).

**Implementation notes:**

- New module: `apps/product/src/game.ts` exports `GameState`, `PilotView`, `LighthouseView`, plus `generateGameState`, `buildPilotView`, `buildLighthouseView`. No new Durable Object class — game state lives in `SessionRoom` per the task constraint.
- Grid generation is deterministic per session code (FNV-1a → mulberry32 PRNG). A given code always rolls the same grid, which makes manual reproduction during review trivial. Recorded the seed approach in commit `3683aab`.
- The ship's 3×3 ring is kept rock-free at generation time so the Pilot's first porthole is not boxed in (movement is the next slice; this avoids degenerate first-frame states).
- Role mapping: A → Pilot, B → Lighthouse. Reuses the existing A/B spine assignment.
- Wire envelope: `{ type: "game-state", view: "pilot", state: PilotView }` or `{ type: "game-state", view: "lighthouse", state: LighthouseView }`. The `PilotView.visible` is a *sparse* list — only the cells inside the porthole appear. There is no full grid in the Pilot's payload.
- Index forwards the session code to the DO via `?s=<code>` so the DO can deterministically seed without needing to know its own `idFromName` source.
- Client is still inline in `client-html.ts`. Added a `<section id="game">` with two render paths (`renderPilotGrid`, `renderLighthouseGrid`). Stable selectors: `[data-view="pilot"|"lighthouse"]`, `.cell[data-cell="x,y"]`, `.cell[data-cell-type="empty|rock|port|ship"]`, `.cell[data-fog="true"]`, `#game-role-name[data-game-role]`.
- Hard rules respected: curly braces on every conditional, no `any`, `type` over `interface`, named exports, British English in user-facing copy.
- Out of scope (deferred): movement, beam, win/loss, restart, persisting the grid across DO hibernation. The DO regenerates the grid on the next join into the same code (deterministic, so the same code yields the same grid).

**Verification script for the Reviewer:**

1. From the repo root: `PRODUCT_URL=https://game-rivals-beta-product.kevin-wilson.workers.dev pnpm --filter product test:e2e` — three specs should all pass. The new spec is `Beacon: Pilot sees fog porthole; Lighthouse sees full chart` in `apps/product/tests/smoke.spec.ts`. It opens two phone-viewport contexts, the first starts a session and the second joins it, then asserts:
   - `[data-view="pilot"]` appears on page A; `[data-view="lighthouse"]` appears on page B.
   - Pilot grid: 60 `.cell` elements total, ≥1 `.cell[data-fog="true"]`, exactly one `.cell[data-cell-type="ship"]`, ≤8 rocks visible, ≤1 port visible, and *strictly fewer than 60* `.cell[data-cell-type]` cells (proving the Pilot did not receive the full grid).
   - Lighthouse grid: 60 `.cell` elements, all 60 carry `data-cell-type`, exactly one ship, exactly one port, 6–10 rocks, zero fog cells.
   - Visible role labels: `#game-role-name[data-game-role="pilot"]` reads "Pilot", `#game-role-name[data-game-role="lighthouse"]` reads "Lighthouse".
   - No horizontal scroll on either page at 390px viewport.
2. Manual sanity (optional): open the deployed URL on a phone, tap "Start session", copy the link, open it on a second device. Within ~2s the first device should switch from the lobby card to a yellow porthole grid (Pilot) showing the ship in a 3×3 lit area surrounded by dark fog cells; the second device should show a blue/teal full chart (Lighthouse) with the ship, the port, and several rock cells.
3. WebSocket message asymmetry — open DevTools on the Pilot's tab and inspect the `game-state` frame on the WebSocket. The `state.visible` array should contain at most 9 entries; there should be no full `cells` array on the Pilot's payload. The Lighthouse tab's `game-state` frame should contain exactly 60 `cells`.

**Reviewer verdict:** _pending_
