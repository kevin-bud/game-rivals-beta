import { clientHtml } from "./client-html.js";
import { generateCode, isValidCode } from "./code.js";
import { SessionRoom } from "./session-room.js";

export { SessionRoom };

type Env = {
  SESSION: DurableObjectNamespace;
};

const jsonResponse = (body: unknown, init?: ResponseInit): Response => {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...init?.headers,
    },
  });
};

const htmlResponse = (body: string): Response => {
  return new Response(body, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};

const handleNewSession = (): Response => {
  const code = generateCode();
  return jsonResponse({ code });
};

const handleWebSocket = (request: Request, env: Env): Response => {
  const url = new URL(request.url);
  const code = url.searchParams.get("s");
  if (!isValidCode(code)) {
    return new Response("invalid session code", { status: 400 });
  }
  if (request.headers.get("upgrade") !== "websocket") {
    return new Response("expected websocket", { status: 426 });
  }
  const id = env.SESSION.idFromName(code);
  const stub = env.SESSION.get(id);
  // Forward the session code so the DO can deterministically seed its grid.
  const forwarded = new Request(
    `https://session/ws?s=${encodeURIComponent(code)}`,
    request,
  );
  return stub.fetch(forwarded);
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/api/new" && request.method === "POST") {
      return handleNewSession();
    }
    if (url.pathname === "/api/ws") {
      return handleWebSocket(request, env);
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      return htmlResponse(clientHtml);
    }
    if (url.pathname === "/healthz") {
      return new Response("ok", {
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return new Response("not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;
