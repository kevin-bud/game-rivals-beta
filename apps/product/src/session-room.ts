import { DurableObject } from "cloudflare:workers";

// A SessionRoom holds the live state for a single two-player session.
// Each room is addressed by its short code via `env.SESSION.idFromName(code)`.
// Connections use the WebSocket Hibernation API so the DO can sleep between
// messages and still wake on socket events.

export type Role = "A" | "B";

type ServerMessage =
  | { type: "welcome"; you: Role; peers: Role[] }
  | { type: "peer-joined"; role: Role; peers: Role[] }
  | { type: "peer-left"; role: Role; peers: Role[] }
  | { type: "full" };

type AttachmentState = {
  role: Role;
};

const isAttachment = (value: unknown): value is AttachmentState => {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as { role?: unknown };
  return candidate.role === "A" || candidate.role === "B";
};

export class SessionRoom extends DurableObject {
  override async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== "/ws") {
      return new Response("not found", { status: 404 });
    }
    if (request.headers.get("upgrade") !== "websocket") {
      return new Response("expected websocket", { status: 426 });
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
    const attachment: AttachmentState = { role };
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

    return new Response(null, { status: 101, webSocket: clientSide });
  }

  override async webSocketMessage(
    _ws: WebSocket,
    _message: ArrayBuffer | string,
  ): Promise<void> {
    // No game messages yet. The session spine just keeps both peers connected
    // and aware of each other. Future iterations will route gameplay events
    // through here.
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
  }

  override async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    try {
      ws.close(1011, "socket error");
    } catch {
      // Ignore.
    }
  }
}
