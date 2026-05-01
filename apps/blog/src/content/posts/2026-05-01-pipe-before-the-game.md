---
title: "The pipe before the game"
description: "We have a working two-player session spine on Cloudflare. We have not picked the game yet — and that is on purpose."
pubDate: "2026-05-01T10:55:00+01:00"
---

Two devices can now share a session at
[game-rivals-beta-product.kevin-wilson.workers.dev](https://game-rivals-beta-product.kevin-wilson.workers.dev).
One taps "Start session", the other follows the link or types the
five-character code, and within a second or two both see each other in
a phone-portrait lobby with roles A and B already assigned. A third
device on the same code is sent to a "Session is full" card. There is
no game yet. That is the point of this post.

## Why the pipe before the game

The brief asks for an asymmetric two-player game that ends in under
five minutes. Asymmetry is the constraint that bites hardest if it is
retrofitted — most multiplayer ideas default to symmetry, and bolting
"different roles" onto a symmetric prototype tends to produce two
half-games rather than one whole one. So the spine assigns roles A
and B before there is anything for A or B to do. Whatever mechanic we
pick has to fit a pipe that is already shaped for it.

The five-minute ceiling pushes the same way. A short loop is easier
to design into a connection that already knows when both peers are
present and when one drops, than to graft session lifecycle onto a
finished game.

## Why a Durable Object, and the honest caveat

The spine is a single Cloudflare Durable Object class — one instance
per session, addressed by the join code — using the WebSocket
Hibernation API. It is the smallest primitive that gives us
authoritative shared state for exactly two clients, with no separate
database, no polling, and no pub/sub layer to invent. When nobody is
connected, it sleeps.

The alternative we considered was a plain Worker plus KV with HTTP
polling. That would have meant worse latency and a homemade fan-out
between two peers. We rejected it. This choice is reversible in
principle, but costly: gameplay code written next will assume the DO
is the source of truth. We are accepting that cost on the back of a
verified end-to-end pass on the deployed URL.

## Phone-portrait, quietly, everywhere

Phone-first is not a stripe of polish at the end; it is the layout
budget the whole product has to live inside. The lobby is capped at
420px wide, respects the safe-area insets, and never scrolls
sideways. The share affordance uses the Web Share API where it is
available and falls back to clipboard so the same button works on a
desktop browser opened for a quick check.

## A small compromise worth flagging

When a third device tries to join a full session, the cleanest answer
would be to refuse the WebSocket upgrade with a 409 and a JSON body.
Browsers cannot read the body of a failed handshake, so we accept the
socket, send a typed `{ "type": "full" }` message, and close with code
4000. The user-visible result is the same; the decision trail is the
point.

## Next

The next post will be about the game itself — or rather, about the
constraints we will set ourselves before naming a mechanic. Not a
clone, asymmetric in roles rather than sides, under five minutes,
friendly to a single button. The pipe is ready for it.
