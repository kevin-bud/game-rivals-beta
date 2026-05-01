import { DurableObject } from "cloudflare:workers";

import {
  buildLighthouseView,
  buildPilotView,
  generateGameState,
  type GameState,
  type LighthouseView,
  type PilotView,
} from "./game.js";

// A SessionRoom holds the live state for a single two-player session.
// Each room is addressed by its short code via `env.SESSION.idFromName(code)`.
// Connections use the WebSocket Hibernation API so the DO can sleep between
// messages and still wake on socket events.

export type Role = "A" | "B";

// Role-to-game-role mapping is fixed for Beacon: A is the Pilot (fog-of-war
// porthole), B is the Lighthouse (god view). This intentionally piggy-backs
// on the existing A/B assignment from the spine — no separate role pick.
export type GameRole = "pilot" | "lighthouse";

const gameRoleFor = (role: Role): GameRole => {
  if (role === "A") {
    return "pilot";
  }
  return "lighthouse";
};

type ServerMessage =
  | { type: "welcome"; you: Role; peers: Role[] }
  | { type: "peer-joined"; role: Role; peers: Role[] }
  | { type: "peer-left"; role: Role; peers: Role[] }
  | { type: "full" }
  | { type: "game-state"; view: "pilot"; state: PilotView }
  | { type: "game-state"; view: "lighthouse"; state: LighthouseView };

type AttachmentState = {
  role: Role;
  // Session code is captured at connect time so we can deterministically
  // seed the grid when the second player arrives. The DO does not otherwise
  // know its own name.
  code: string;
};

const isAttachment = (value: unknown): value is AttachmentState => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { role?: unknown; code?: unknown };
  if (candidate.role !== "A" && candidate.role !== "B") {
    return false;
  }
  if (typeof candidate.code !== "string") {
    return false;
  }
  return true;
};

export class SessionRoom extends DurableObject {
  // In-memory only. The DO can hibernate; on wake we regenerate the state
  // from the session code, which is captured per-socket attachment. A fresh
  // grid on hibernate-and-resume is fine for this slice — both players are
  // expected to play through without idle gaps long enough to evict.
  private gameState: GameState | null = null;

  private ensureGameState(code: string): GameState {
    if (this.gameState === null) {
      this.gameState = generateGameState(code);
    }
    return this.gameState;
  }

  private sendGameStateTo(socket: WebSocket, role: Role, code: string): void {
    const state = this.ensureGameState(code);
    const gameRole = gameRoleFor(role);
    const message: ServerMessage =
      gameRole === "pilot"
        ? {
            type: "game-state",
            view: "pilot",
            state: buildPilotView(state),
          }
        : {
            type: "game-state",
            view: "lighthouse",
            state: buildLighthouseView(state),
          };
    try {
      socket.send(JSON.stringify(message));
    } catch {
      // Best effort — if the socket is gone, webSocketClose will tidy up.
    }
  }

  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/ws") {
      return new Response("not found", { status: 404 });
    }
    if (request.headers.get("upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
    }

    const code = url.searchParams.get("s");
    if (code === null || code.length === 0) {
      return new Response("missing session code", { status: 400 });
    }

    const sockets = this.ctx.getWebSockets();
    const takenRoles = new Set<Role>();
    for (const socket of sockets) {
      const attachment = socket.deserializeAttachment() as unknown;
      if (isAttachment(attachment)) {
        takenRoles.add(attachment.role);
      }
    }

    if (takenRoles.size >= 2) {
      // Room is full. Briefly accept the socket so we can deliver a clear
      // close reason, then shut it down. A simple HTTP 409 would be cleaner
      // but the browser cannot read the body of a failed WS handshake, so
      // we accept-then-close instead.
      const pair = new WebSocketPair();
      const [clientSide, serverSide] = Object.values(pair);
      serverSide.accept();
      const message: ServerMessage = { type: "full" };
      serverSide.send(JSON.stringify(message));
      serverSide.close(4000, "session is full");
      return new Response(null, { status: 101, webSocket: clientSide });
    }

    const role: Role = takenRoles.has("A") ? "B" : "A";
    const pair = new WebSocketPair();
    const [clientSide, serverSide] = Object.values(pair);

    this.ctx.acceptWebSocket(serverSide);
    const attachment: AttachmentState = { role, code };
    serverSide.serializeAttachment(attachment);

    // Tell the new peer who they are.
    const peersAfter: Role[] = [...takenRoles, role].sort();
    const welcome: ServerMessage = {
      type: "welcome",
      you: role,
      peers: peersAfter,
    };
    serverSide.send(JSON.stringify(welcome));

    // Tell the other peer (if any) about the new arrival.
    const joined: ServerMessage = {
      type: "peer-joined",
      role,
      peers: peersAfter,
    };
    for (const other of sockets) {
      if (other === serverSide) {
        continue;
      }
      try {
        other.send(JSON.stringify(joined));
      } catch {
        // Ignore send failures; webSocketClose will tidy up.
      }
    }

    // When the second player joins, generate the grid (if not already) and
    // broadcast a role-tailored game-state to each connected socket. The
    // Pilot only ever sees their fog porthole; the Lighthouse only ever
    // sees the full board. The asymmetry is enforced at the wire boundary.
    if (peersAfter.length === 2) {
      this.gameState = generateGameState(code);
      // Send to the new socket first, then any pre-existing sockets.
      this.sendGameStateTo(serverSide, role, code);
      for (const other of sockets) {
        const otherAttachment = other.deserializeAttachment() as unknown;
        if (!isAttachment(otherAttachment)) {
          continue;
        }
        this.sendGameStateTo(other, otherAttachment.role, otherAttachment.code);
      }
    }

    return new Response(null, { status: 101, webSocket: clientSide });
  }

  override async webSocketMessage(
    _ws: WebSocket,
    _message: ArrayBuffer | string,
  ): Promise<void> {
    // No client-originated game messages yet. The Pilot's movement and
    // the Lighthouse's beam will arrive on this channel in later slices.
  }

  override async webSocketClose(
    ws: WebSocket,
    _code: number,
    _reason: string,
    _wasClean: boolean,
  ): Promise<void> {
    const attachment = ws.deserializeAttachment() as unknown;
    if (!isAttachment(attachment)) {
      return;
    }
    const remaining: Role[] = [];
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === ws) {
        continue;
      }
      const other = socket.deserializeAttachment() as unknown;
      if (isAttachment(other)) {
        remaining.push(other.role);
      }
    }
    remaining.sort();
    const message: ServerMessage = {
      type: "peer-left",
      role: attachment.role,
      peers: remaining,
    };
    for (const socket of this.ctx.getWebSockets()) {
      if (socket === ws) {
        continue;
      }
      try {
        socket.send(JSON.stringify(message));
      } catch {
        // Best effort — peer may already be gone.
      }
    }
    // Drop the cached grid so the next pairing in the same DO instance
    // gets a fresh roll. The seed is deterministic per code, so the same
    // pair re-joining the same code still gets the same grid.
    if (remaining.length === 0) {
      this.gameState = null;
    }
  }

  override async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    try {
      ws.close(1011, "socket error");
    } catch {
      // Ignore.
    }
  }
}
