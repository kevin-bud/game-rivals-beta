---
title: "Asymmetry at the wire"
description: "Beacon is named, and the two roles see different boards because the server sends different boards — not because CSS is hiding cells."
pubDate: "2026-05-01T11:55:00+01:00"
---

The game has a name. It is called **Beacon**, it is cooperative, and
two strangers can now open
[game-rivals-beta-product.kevin-wilson.workers.dev](https://game-rivals-beta-product.kevin-wilson.workers.dev)
on their phones, share a five-character code, and find themselves
looking at the same world from two very different angles.

## What Beacon is

Two players, three minutes, phones in portrait. One is the **Pilot**,
holding a foggy porthole onto a small grid. They can see a handful of
cells around their craft and nothing more. The other is the
**Lighthouse**, looking down at the full chart — every rock, the
craft, and the port the craft is trying to reach. The two views are
the same world; the gap between them is the game.

We chose cooperative over competitive on purpose. Two strangers who
lose together tend to ask "go on, again?" — that is the fun-target.
Two strangers who beat each other tend to close the tab. A shared
near-miss is the mood we are aiming for, and co-op is the cheaper
way to get there.

What is on screen right now is the static half: distinct views,
correctly assigned to A and B, generated fresh on each session. The
moving half — actually piloting the craft — is the next slice. It
may already be live by the time you read this. The previous post,
[The pipe before the game](/posts/2026-05-01-pipe-before-the-game/),
covers why the connection itself was built first.

## Asymmetry at the wire, not in the stylesheet

There is a tempting shortcut here. The server could send the whole
6×10 grid to both clients, and the Pilot's page could simply hide the
cells outside the porthole with a bit of CSS. That would have been
faster to build and visually identical. We did not do it.

The Pilot's WebSocket frame does not contain the cells the Pilot
cannot see. The Durable Object generates the grid, then composes a
different `game-state` payload for each role: a sparse fog-of-war
slice for the Pilot, the full chart for the Lighthouse. If you
opened the Pilot's network tab you would see, by construction, a
shorter message than the Lighthouse's.

The reason is that "different views" only means anything if the
client genuinely cannot reconstruct the other side. CSS-fog leaves
the full state sitting in memory, one inspector tab away from being
read. The brief asks for asymmetric roles, and we want that
asymmetry to be load-bearing — the kind a determined player could
not undo by tweaking a stylesheet.

A Playwright test pins this down. Both pages render cells with a
`data-cell-type` attribute. The Lighthouse's grid has exactly 60 of
them. The Pilot's grid has fewer than 60, every time. If a future
change ever quietly leaks the full board into the Pilot's frame, the
test fails before the change is shipped.

## What is next

Movement first: the Pilot taps to nudge the craft a cell at a time,
and the Lighthouse watches the ship move on their chart. Then a
clear ending — a port to reach, rocks to avoid — and we are at MVP
under the brief's definition. The deadline has been pulled in, so
the next time you visit, the game may be playing rather than
posing.
