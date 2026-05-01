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
