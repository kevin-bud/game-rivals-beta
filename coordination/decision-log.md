# Decision log

Append-only record of decisions made by the Orchestrator. Each entry follows
the format below. Never edit past entries. If a decision is reversed, write a
new entry that references the previous one.

---

## YYYY-MM-DD HH:MM — [Decision title]

**Context:** What situation prompted this decision.
**Options considered:** What alternatives were on the table.
**Choice:** What was decided.
**Rationale:** Why this over the alternatives.
**Reversible?** Yes / No / Costly to reverse.

---

## 2026-05-01 13:25 — Game concept: "Beacon" (cooperative pilot + lighthouse)

**Context:** Spine is shipped (PASS, blog post live). Rivals are at
roughly the same depth (lobby pages, no game). Time to commit to a
game concept so the Engineer has a target. The brief asks "what kind
of fun did you aim for, and why?" — that question is answered by this
entry, not by the code.

**What kind of fun:** Cooperative tension between two strangers. Both
players are necessary; neither can succeed alone. The mood is "we
nearly didn't make it" — a shared near-miss that makes "want another
go?" the natural reaction. Choosing co-op over PvP because losing
*together* between strangers is sticky; being beaten by a stranger is
a bounce.

**The game — "Beacon" (working title):**

- Two roles, set from the existing A/B spine assignment.
- **Pilot** (A): controls a tiny craft on a small grid. Sees only a
  fog-of-war radius around the craft. Taps a directional control to
  move one cell at a time.
- **Lighthouse** (B): sees the whole grid from above — the craft, the
  rocks, and the destination port. Cannot move the craft. Can rotate
  a directional **beam**. The beam appears in the Pilot's view as an
  arrow showing direction (and only direction — the Pilot still has
  to decide when to move and how far).
- **Goal:** Pilot reaches the port within ~3 minutes without crashing
  into rocks or running out the clock. One round per session; "play
  again" reshuffles the grid.

**Why this satisfies every hard constraint:**

- *Real-time:* both players act simultaneously, sub-second feedback.
- *Asymmetric:* different views (FOV vs god-view), different inputs
  (move vs rotate beam), different roles within a shared objective.
  The asymmetry is the *gameplay*, not a cosmetic skin.
- *Phone portrait:* the natural shape — vertical grid, one-handed
  controls. 6×10-ish cells fits on a phone with comfortable taps.
- *Under 5 minutes:* hard 3-minute clock per round, with a clear
  win/loss ending.
- *Not a clone:* nearest comparators (Lovers in a Dangerous
  Spacetime; Captain Sonar) are 4-player or turn-based. The specific
  pairing — *one phone with FOV, one phone with overview, beam-as-
  language* — is not a recognised existing game.

**Options considered:**

- **Beacon (chosen).** Co-op, info-asymmetric, low input complexity.
- **A maze-runner vs maze-builder competitive game.** Rejected for now
  — competitive between strangers loses worse than it wins, and
  designing the builder's fairness is harder than designing co-op
  tension.
- **A "spy + handler" deduction game.** Rejected — every variant we
  sketched drifted toward Codenames-adjacent territory; "not a clone"
  is the hard rule we couldn't comfortably clear.
- **A music/rhythm conductor vs performer.** Rejected — rhythm needs
  audio that survives Bluetooth latency on phones; out of scope for a
  hackathon.
- **Defer the choice and build "infrastructure for any game" first.**
  Rejected — the spine is already general enough; pretending we don't
  need to commit just delays the design pressure.

**Choice:** Build "Beacon" as defined above. Commit the working title
in code as `beacon`. Visual style: dark, minimal, navigational —
think nautical chart for Lighthouse, foggy porthole for Pilot.

**Rationale:** Best fit to "two strangers, phone, five minutes, must
feel asymmetric, must not be a clone." The mechanic is small enough
to ship in a few engineering slices on top of the existing
DO+WebSocket spine: grid state lives in `SessionRoom`, two views are
rendered from the same authoritative state, inputs are tiny.

**Reversible?** Yes — we have shipped no game code yet. If the first
playable slice reveals "beam as language" is too thin, we can
introduce a second beam mode (e.g. ping vs sweep) without rewriting
infrastructure. If it reveals the whole concept is dead, we still
have the spine and can pivot to a different asymmetric two-player
game on the same DO + WebSocket plumbing.

**Next task:** Smallest meaningful slice — generate a grid in the DO
and serve the two distinct views to A and B. No movement, no beam,
no win condition yet. Definition in `current-task.md`.

---

## 2026-05-01 13:00 — Session spine shipped; commit to DO + WebSockets

**Context:** Engineer's first task — the real-time session spine — landed
with a Reviewer PASS at commit `8f49a19`. Deployed at
`https://game-rivals-beta-product.kevin-wilson.workers.dev`. Two devices
can join via a 5-char code or `?s=<code>` link, both see distinct A/B
roles in a phone-portrait lobby, and a third device is rejected with
"Session is full". Implementation chose a Cloudflare Durable Object
(`SessionRoom`) addressed by `idFromName(code)` with the WebSocket
Hibernation API.

**Options considered:**

- DO + WebSockets (chosen).
- Single Worker + KV with HTTP polling for state (rejected — worse
  latency, more code, no natural authoritative state for two peers).
- DO + server-sent events (rejected — uplink from each client still
  needs a separate channel; WebSockets are the single primitive).

**Choice:** Lock in Durable Object + WebSockets as the real-time spine
for the rest of the build. New game state lives inside `SessionRoom`.
Persistence: DO memory + (later, if needed) DO storage. No D1 or KV
unless a future requirement forces it.

**Rationale:** Smallest primitive that satisfies the brief's real-time
constraint, gives us authoritative shared state for exactly two peers,
and hibernates when idle. Now that the spine is verified end-to-end on
the deployed URL, building the game on top is a constrained problem
rather than an open one.

**Reversible?** Costly to reverse — the gameplay code we write next
will assume `SessionRoom` is the source of truth. Switching to a
different persistence model later would mean rewriting the server
side. Acceptable cost given the verified PASS.

**Follow-ups queued:** Blog post about the spine (in `blog-queue.md`).
Rival check (next, before assigning the game-design task).

---

## 2026-05-01 12:00 — Initial reading of the brief

**Context:** T+0 of the hackathon. Brief is fixed. No prior decisions. Product
is a placeholder Worker serving "coming soon"; blog scaffold exists. Two
rivals listed: alpha and gamma.

**Brief in my own words:** Build a real-time, two-player web game that two
strangers can play on their phones, in portrait, to a clear ending in under
five minutes. The two players must have asymmetric roles — different views,
inputs, or objectives. It must be a public web URL, not a clone of any
recognisable existing game. Ship MVP with a working end-to-end session +
README, then iterate. Maintain a public blog as we go.

**First concrete goal toward shipping:** A real-time session spine.
Specifically: one device opens the URL and creates a session, gets a short
join code (or shareable link), the second device joins from a different
browser, and both immediately see each other connected in a shared lobby
with distinct roles assigned (A and B). No game mechanic yet. This is the
load-bearing piece every other decision rests on; the game we choose later
must fit on top of it. We do not yet need to commit to the game itself.

**Constraints that jumped out:**

- Phone portrait is the primary target. Larger screens are a bonus, not a
  reason to design wider.
- Asymmetric is the hardest constraint to satisfy authentically — symmetry
  is the default for most multiplayer ideas. We must design *roles*, not
  *sides*.
- "Two strangers, one sent the other a link" rules out account/login flows
  and matchmaking lobbies for MVP. A shareable session URL is the path of
  least resistance.
- Under five minutes per session means short loops; favours one-button
  mechanics over deep simulation.
- "Not a clone" is a hard filter. Any obvious idea (a chase, a puzzle, a
  guessing game) needs to be checked against the named exclusions and the
  spirit of the rule before we commit.
- Decision trail and blog posts are the evaluation evidence. The decision
  log matters as much as the code.

**Stack-shaping read (not a commitment yet):** The natural Cloudflare
primitive for two-player real-time state is a Durable Object holding the
session, with WebSockets for both clients. That keeps state authoritative,
makes "second player joins" trivial, and removes the need for separate
infra. We will commit to this in the task that uses it.

**Choice:** Direction recorded above. Decisions about the game itself are
deferred — the next task is infrastructure, not gameplay.

**Reversible?** Yes. Nothing is locked in beyond direction.
