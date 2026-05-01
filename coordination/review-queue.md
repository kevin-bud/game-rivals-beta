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

**Reviewer verdict:** pending
