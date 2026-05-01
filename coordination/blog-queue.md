# Blog queue

The Orchestrator adds entries here at milestones. The Writer drafts a post,
commits it to `apps/blog/src/content/posts/`, then marks the entry done.

---

## Template

**Milestone:** What just happened.
**Angle:** What the post should focus on.
**Status:** queued / drafting / published
**Post path:** (filled in when published)

---

## 2026-05-01 — Session spine is live

**Milestone:** First shipped piece. Two devices can connect to a shared
session at `https://game-rivals-beta-product.kevin-wilson.workers.dev`,
join via a 5-character code or `?s=<code>` link, and see each other in a
phone-portrait lobby with distinct A/B roles. Third device on the same
code is rejected with "Session is full". Backed by a Cloudflare Durable
Object using the WebSocket Hibernation API. Commit `8f49a19`. Reviewer
PASS via Playwright against the deployed URL.

**Angle:** A short "we are alive" post — but make it about the *shape* of
the bet rather than a tour of files. Worth saying:

- We have not picked the game yet. We chose to build the connection
  spine first because the asymmetry constraint and the five-minute
  session length are easier to design *into* a working pipe than to
  retrofit. Roles are assigned (A and B) before there is anything for
  A or B to do.
- Why a Durable Object: it is the smallest primitive that gives us
  authoritative shared state for exactly two clients, with no separate
  database, no polling, and hibernation when nobody is talking. The
  alternative — a single Worker with KV — would have been worse on
  latency and required us to invent our own pub/sub. Mention this is
  reversible if it bites us.
- Phone-first is the constraint that quietly shapes everything: 420px
  max width, safe-area insets, no horizontal scroll, share-link
  affordance via the Web Share API with a clipboard fallback so it
  also works on desktop.
- The "Session is full" path is small but worth flagging — browsers
  cannot read the body of a failed WebSocket handshake, so we accept
  the socket, send a typed JSON reject, then close with code 4000.
  This is the kind of compromise we want the decision trail to show.
- What is *not* yet decided: the game itself. Tease that the next post
  will be about that choice and the constraints we will set ourselves
  before naming a mechanic. (Not a clone, asymmetric in roles not
  sides, under five minutes, one-button-friendly.)

This is a launch-adjacent post, not the launch post — the MVP is not
shipped yet (no game). British English. Title and length are the
Writer's call but ~300–500 words feels right. Link to the deployed URL
prominently.

**Status:** published
**Post path:** apps/blog/src/content/posts/2026-05-01-pipe-before-the-game.md
**Published URL:** https://game-rivals-beta-blog.kevin-wilson.workers.dev/posts/2026-05-01-pipe-before-the-game/

---

## 2026-05-01 — Beacon, and asymmetry-at-the-wire

**Milestone:** Reviewer PASS on the first gameplay slice. The game is
named (Beacon — co-op pilot + lighthouse) and the asymmetric views are
live: when two devices connect, the Durable Object generates a 6×10
grid and sends *different* `game-state` payloads to each role. Pilot
receives a sparse fog-of-war porthole (≤9 visible cells); Lighthouse
receives the whole board. Commit `5b2cfb8`. Three Playwright specs
pass against the deployed URL, including a wire-asymmetry proof
(`.cell[data-cell-type]` count is strictly less than 60 on the Pilot's
page).

**Angle:** Two threads to weave together — *what* the game is, and
*why the asymmetry is real, not cosmetic*.

- Name and pitch the game in plain language. Cooperative, two
  strangers, three minutes, phone-only. Pilot navigates a fogged
  porthole; Lighthouse sees the whole chart and (later) shines a
  beam to direct. Fun-target: shared near-miss, "we nearly didn't
  make it", the kind of moment that makes you say "go on, again".
- Make the case for cooperative over competitive between strangers.
  Briefly. (One paragraph, not an essay.)
- The interesting technical claim: the Pilot's WebSocket frame does
  *not* contain the full grid. We could have rendered the same fog
  client-side by hiding cells with CSS — that would have been faster
  to build. We chose to enforce the asymmetry at the wire because
  that is the only way "different views" actually means "different
  views". Mention the test that proves it: `data-cell-type` count is
  strictly less than 60 on the Pilot's page. This is the kind of
  decision the brief asks us to defend in writing.
- Tease the next slice: movement. The Pilot will be able to tap to
  move the ship; the Lighthouse will keep watching. After that, the
  beam — the "language" between the two players. Then a clock, a win
  condition, and we're at MVP.
- British English. ~350–500 words. Title is the Writer's call —
  something that frames the asymmetry-at-the-wire idea, not "Beacon
  is here".
- Link the deployed product URL prominently and link back to the
  prior post ("The pipe before the game") so the trail reads as a
  trail.

**Status:** published
**Post path:** apps/blog/src/content/posts/2026-05-01-asymmetry-at-the-wire.md
**Published URL:** https://game-rivals-beta-blog.kevin-wilson.workers.dev/posts/2026-05-01-asymmetry-at-the-wire/
