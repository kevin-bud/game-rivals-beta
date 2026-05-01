# Current task

Set by the Orchestrator. Read by the Engineer. The Engineer updates the
`Status` field as work progresses.

**Task:** Stand up the real-time session spine. Two devices can land on the
deployed product URL, create/join a single shared session via a short code
(or shareable link with the code in the URL), and both see each other
connected in a phone-friendly lobby with distinct roles (A and B) assigned.
No game mechanic yet — just the connection and role assignment.

**Assigned:** 2026-05-01 12:00 — Engineer

**Status:** in-progress

**Definition of done:**

- Visiting the deployed product URL on device 1 starts a new session and
  shows a short join code (4–6 chars) plus a shareable link of the form
  `<base>/?s=<code>` (or equivalent). Device 1 is held in the lobby
  awaiting a partner.
- Visiting `<base>/?s=<code>` on device 2 (different browser, different
  network ideally) joins that same session.
- Both devices reflect the second player connecting within ~2 seconds,
  without a manual refresh.
- Each device is told its role: one is "A", the other is "B". Roles are
  stable for the lifetime of the session and visible on screen.
- If a third device hits the same code, it is rejected with a clear
  "session is full" message rather than silently joining.
- The lobby renders correctly on a phone in portrait (iPhone-class
  viewport, ~390px wide). No horizontal scroll.
- Backed by a Cloudflare Durable Object holding the session, with
  WebSocket connections from both clients (hibernation API is fine).
  Persistence beyond DO memory is not required at this stage.
- README at `apps/product/README.md` (or repo root if more appropriate)
  is updated with a one-paragraph description of what is now playable
  (currently: "two devices can connect to a shared session") and how to
  open it.
- `pnpm --filter product deploy` succeeds and the deployed URL behaves
  as above. Local-only success is not "done".

**Out of scope for this task:**

- The game itself — no rounds, scores, inputs, or win conditions.
- Reconnection on dropped sockets, refresh resilience, or session
  resumption. A blunt "you have been disconnected, start a new session"
  is acceptable for now.
- Matchmaking with strangers. The MVP path is "share the link".
- Visual polish beyond "this looks intentional on a phone".

**Notes:**

- Stack note from Orchestrator: Cloudflare Durable Object + WebSockets is
  the expected approach. If after a serious look you believe a different
  primitive is materially better (e.g., a single Worker + KV polling),
  flag it back before implementing — do not silently switch. Otherwise
  proceed and record the DO commitment in the decision log when you
  start.
- Keep the client tiny. Plain TypeScript + a single HTML page served
  from the Worker is the default; no framework unless you have a reason
  you can write down.
- Hard rules apply: curly braces on every conditional, no `any`, prefer
  `type` over `interface`, named exports, British English in any
  human-facing copy. Commit small and often (≤15 min of work between
  commits).
- When done, append a claim to `coordination/review-queue.md` with the
  deployed URL and a short script the Reviewer can follow to verify
  end-to-end. Do not mark this task "shipped" yourself — that requires
  a Reviewer PASS.
