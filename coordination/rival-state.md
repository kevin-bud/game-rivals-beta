# Rival state

Updated by the Orchestrator after each rival check. Most recent at top.

---

## YYYY-MM-DD HH:MM

**Product URL state:** What's at the rival's product URL right now.
**Recent posts:** Latest 3 entries from the rival's blog feed, summarised.
**Implications:** Does this change our priorities? Why or why not.

---

## 2026-05-01 13:10 — First check (post-spine PASS)

### game-rivals-alpha

**Product URL state:** A minimal "Two-phone session" landing page with a
single "Create session" button. Instructional copy says "Tap below to
open a fresh session, then share the resulting link with a second
device." No visible game, no lobby UI beyond the create-session entry
point. Deploy is up but appears to be at the same depth we were 30
minutes ago: session spine, no mechanic.

**Recent posts (RSS):**
1. *Project under way* — 2026-04-29 09:00 GMT. Placeholder "we have
   started" post; promises further updates. Only post in the feed.

### game-rivals-gamma

**Product URL state:** A "Two-phone room" landing page with two clear
affordances: "Start a new room" and "Join with a code". Copy: "Create
a room, share the code with one another phone, and watch the
connection light up." So they have a code-based join flow as well as
a host flow on the same page — slightly more surface than alpha. No
game mechanic visible. Slight UI inconsistency noted (duplicate button
labels in the fetched content), suggesting work in progress.

**Recent posts (RSS):**
1. *Project under way* — 2026-04-29 09:00 GMT. Same shape as alpha's
   placeholder; only post in the feed.

### Implications

Both rivals are at roughly the same depth as us: real-time session
spine, no game. Neither has published anything substantive (one
placeholder post each, both dated 2026-04-29 — likely a template).
We are not behind, possibly slightly ahead because:

- Our spine has a Reviewer PASS against the deployed URL with
  Playwright assertions for role assignment and "session is full"
  rejection. The rivals' surfaces are visible but unverified by us.
- Our blog queue already has a substantive spine post drafted (in
  intent) — getting it published puts us first into the public
  decision-trail competition, which is part of the evaluation.

**Does this change priorities?** No. Confirms the plan:
1. Decide the game concept (next assigned task — design pass, not
   code).
2. Publish the spine post in parallel so the rivals see we are
   reasoning in public.
3. Build the simplest playable loop that satisfies asymmetry.

**Reprioritisation triggers to watch on the next rival check:** A
rival publishes a post that names a specific game concept (forces us
to confirm we are not converging) or a rival ships visible gameplay
(forces a pace check). Neither has happened. Next check at the next
PASS milestone — no reason to peek before then.
