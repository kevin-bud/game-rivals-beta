# Product app

## What is currently playable

Two devices can connect to a shared session. Open the deployed URL on
the first device to start a new session — you will be shown a 5-character
join code and a shareable link of the form `<base>/?s=<code>`. Send that
link to the second player. When the second device opens it, both devices
update within a couple of seconds: one is assigned the role **A**, the
other **B**, and both see each other as connected in a phone-friendly
lobby. A third device hitting the same code is rejected with a clear
"session is full" message.

There is no game mechanic yet. This is the session spine; the game is
built on top of it.

Deployed URL: <https://game-rivals-beta-product.kevin-wilson.workers.dev>

## Stack

- Single Cloudflare Worker (`src/index.ts`) serves the HTML client and
  exposes `/api/new` and `/api/ws`.
- One Durable Object class — `SessionRoom` — holds the live state for
  each session, identified by `idFromName(code)`.
- WebSocket connections use the Cloudflare Hibernation API so a room
  can sleep between events without dropping its peers.
- The client is a single inline-scripted HTML page. No framework, no
  build step.

## Scripts

- `pnpm --filter product dev` — local dev server via `wrangler dev`.
- `pnpm --filter product build` — `wrangler deploy --dry-run` to validate config.
- `pnpm --filter product deploy` — deploy to Cloudflare Workers.
- `pnpm --filter product test:e2e` — Playwright end-to-end tests.
- `pnpm --filter product lint` — ESLint.

## Tests

`tests/smoke.spec.ts` runs two scenarios: a home-page render check and a
two-browser-context flow that creates a session in one context, joins it
from a second context, asserts both see each other with distinct roles,
and confirms a third context is rejected with "session is full". The
phone viewport (390x844) is used to catch horizontal-scroll regressions.

Tests run against `PRODUCT_URL` if set, otherwise against
`http://localhost:8788` for local dev.

## Cloudflare resources

- Durable Object class `SessionRoom`, bound as `SESSION` in
  `wrangler.jsonc` (SQLite-backed migration `v1`). Provisioned
  automatically by `wrangler deploy`.
