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
