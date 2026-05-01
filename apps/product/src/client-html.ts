// The client is a single HTML page with a tiny inline script. No framework,
// no build step. Everything fits in one Worker response.

export const clientHtml = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0d1117" />
    <title>Beacon</title>
    <style>
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }
      html,
      body {
        margin: 0;
        padding: 0;
        background: #0d1117;
        color: #e6edf3;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
        min-height: 100vh;
        overflow-x: hidden;
      }
      body {
        display: flex;
        justify-content: center;
        padding: env(safe-area-inset-top) env(safe-area-inset-right)
          env(safe-area-inset-bottom) env(safe-area-inset-left);
      }
      main {
        width: 100%;
        max-width: 420px;
        padding: 1.25rem 1rem 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1rem;
        min-height: 100vh;
      }
      header h1 {
        font-size: 1.4rem;
        margin: 0 0 0.2rem;
        letter-spacing: 0.02em;
      }
      header p {
        margin: 0;
        color: #9da7b3;
        font-size: 0.9rem;
      }
      .card {
        background: #161b22;
        border: 1px solid #30363d;
        border-radius: 14px;
        padding: 1rem;
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }
      .card h2 {
        margin: 0;
        font-size: 1rem;
        font-weight: 600;
        color: #c9d1d9;
      }
      .code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 1.8rem;
        letter-spacing: 0.35em;
        text-align: center;
        background: #0d1117;
        border: 1px dashed #30363d;
        border-radius: 10px;
        padding: 0.7rem 0.5rem;
        word-break: break-all;
      }
      .share {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }
      .share input {
        width: 100%;
        font-size: 0.85rem;
        padding: 0.7rem 0.8rem;
        background: #0d1117;
        color: #e6edf3;
        border: 1px solid #30363d;
        border-radius: 8px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      button {
        appearance: none;
        font: inherit;
        background: #2f81f7;
        color: white;
        border: none;
        border-radius: 10px;
        padding: 0.85rem 1rem;
        font-weight: 600;
        cursor: pointer;
        min-height: 48px;
      }
      button:active {
        transform: translateY(1px);
      }
      button[disabled] {
        opacity: 0.6;
        cursor: progress;
      }
      button.secondary {
        background: #21262d;
        color: #c9d1d9;
        border: 1px solid #30363d;
      }
      .roles {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
      }
      .role {
        background: #0d1117;
        border: 1px solid #30363d;
        border-radius: 10px;
        padding: 0.85rem 0.6rem;
        text-align: center;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .role .label {
        font-size: 0.75rem;
        color: #8b949e;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .role .badge {
        font-size: 1.6rem;
        font-weight: 700;
        letter-spacing: 0.05em;
      }
      .role[data-self="true"] {
        border-color: #2f81f7;
        box-shadow: 0 0 0 1px #2f81f7 inset;
      }
      .role[data-state="connected"] .badge {
        color: #3fb950;
      }
      .role[data-state="waiting"] .badge {
        color: #6e7681;
      }
      .status {
        font-size: 0.9rem;
        color: #9da7b3;
        text-align: center;
      }
      .status[data-tone="error"] {
        color: #ff7b72;
      }
      .status[data-tone="ok"] {
        color: #3fb950;
      }
      footer {
        margin-top: auto;
        font-size: 0.75rem;
        color: #6e7681;
        text-align: center;
      }
      .hidden {
        display: none !important;
      }

      /* Game view shared chrome. */
      .role-banner {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.75rem;
      }
      .role-banner .role-label {
        font-size: 0.7rem;
        color: #8b949e;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
      .role-banner .role-name {
        font-size: 1.2rem;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .role-banner .role-name[data-game-role="pilot"] {
        color: #f0b72f;
      }
      .role-banner .role-name[data-game-role="lighthouse"] {
        color: #58a6ff;
      }
      .role-blurb {
        margin: 0;
        font-size: 0.85rem;
        color: #9da7b3;
      }

      /* Grid layout. Cells stay square via aspect-ratio. The grid scales
         to the card width so a 6-wide grid fits comfortably on a 390px
         portrait phone with no horizontal scroll. */
      .grid {
        display: grid;
        grid-template-columns: repeat(var(--grid-cols, 6), 1fr);
        gap: 4px;
        background: #0d1117;
        padding: 6px;
        border: 1px solid #30363d;
        border-radius: 10px;
      }
      .cell {
        aspect-ratio: 1 / 1;
        border-radius: 6px;
        background: #161b22;
        border: 1px solid #21262d;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: clamp(0.9rem, 4.5vw, 1.4rem);
        line-height: 1;
        position: relative;
      }
      .cell[data-cell-type="empty"] {
        background: #0f3a5a;
        border-color: #1c4e72;
      }
      .cell[data-cell-type="rock"] {
        background: #3a2a1a;
        border-color: #5a3f24;
        color: #f0c694;
      }
      .cell[data-cell-type="port"] {
        background: #1f4d2b;
        border-color: #2ea043;
        color: #f6f8fa;
      }
      .cell[data-cell-type="ship"] {
        background: #f0b72f;
        border-color: #ffd060;
        color: #1a1300;
      }
      .cell[data-fog="true"] {
        background: #04070b;
        border-color: #0d1117;
        color: transparent;
      }

      /* Pilot's view leans into the porthole metaphor. */
      .pilot-grid {
        max-width: 320px;
        margin: 0 auto;
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <h1>Beacon</h1>
        <p id="subtitle">A cooperative two-player session.</p>
      </header>

      <section id="start" class="card hidden">
        <h2>Start a session</h2>
        <p class="status">Tap below to create a new room. You will get a short code to share with the other player.</p>
        <button id="start-button" type="button">Start session</button>
      </section>

      <section id="lobby" class="card hidden">
        <h2>Session code</h2>
        <div id="code" class="code" aria-live="polite">-----</div>
        <div class="share">
          <input id="share-link" type="text" readonly aria-label="Shareable link" />
          <button id="share-button" class="secondary" type="button">Copy link</button>
        </div>
        <div class="roles" aria-label="Players">
          <div id="role-a" class="role" data-state="waiting">
            <span class="label">Player A</span>
            <span class="badge">A</span>
            <span class="status" id="role-a-status">waiting</span>
          </div>
          <div id="role-b" class="role" data-state="waiting">
            <span class="label">Player B</span>
            <span class="badge">B</span>
            <span class="status" id="role-b-status">waiting</span>
          </div>
        </div>
        <p id="status" class="status" data-tone="">Connecting...</p>
      </section>

      <section id="game" class="card hidden" aria-live="polite">
        <div class="role-banner">
          <div>
            <div class="role-label">You are</div>
            <div id="game-role-name" class="role-name" data-game-role="">--</div>
          </div>
          <div style="text-align: right">
            <div class="role-label">Session</div>
            <div id="game-code" style="font-family: ui-monospace, monospace; letter-spacing: 0.2em">-----</div>
          </div>
        </div>
        <p id="game-blurb" class="role-blurb">Waiting for the grid...</p>
        <div id="game-grid-host"></div>
      </section>

      <section id="full" class="card hidden">
        <h2>Session is full</h2>
        <p class="status" data-tone="error">Two players are already connected to this code. Ask one of them to share a fresh session.</p>
        <button id="new-button" type="button">Start a new session</button>
      </section>

      <footer>Built for the rivals hackathon.</footer>
    </main>

    <script type="module">
      const subtitle = document.getElementById("subtitle");
      const startSection = document.getElementById("start");
      const lobbySection = document.getElementById("lobby");
      const gameSection = document.getElementById("game");
      const fullSection = document.getElementById("full");
      const startButton = document.getElementById("start-button");
      const newButton = document.getElementById("new-button");
      const shareButton = document.getElementById("share-button");
      const shareLink = document.getElementById("share-link");
      const codeEl = document.getElementById("code");
      const statusEl = document.getElementById("status");
      const roleA = document.getElementById("role-a");
      const roleB = document.getElementById("role-b");
      const roleAStatus = document.getElementById("role-a-status");
      const roleBStatus = document.getElementById("role-b-status");
      const gameRoleName = document.getElementById("game-role-name");
      const gameCode = document.getElementById("game-code");
      const gameBlurb = document.getElementById("game-blurb");
      const gameGridHost = document.getElementById("game-grid-host");

      const ALL_SECTIONS = [startSection, lobbySection, gameSection, fullSection];

      const showOnly = (section) => {
        for (const candidate of ALL_SECTIONS) {
          if (candidate === section) {
            candidate.classList.remove("hidden");
          } else {
            candidate.classList.add("hidden");
          }
        }
      };

      const setStatus = (text, tone) => {
        statusEl.textContent = text;
        statusEl.dataset.tone = tone ?? "";
      };

      const updateRoles = (peers, you) => {
        const set = new Set(peers);
        for (const [el, statusElForRole, role] of [
          [roleA, roleAStatus, "A"],
          [roleB, roleBStatus, "B"],
        ]) {
          const present = set.has(role);
          el.dataset.state = present ? "connected" : "waiting";
          el.dataset.self = role === you ? "true" : "false";
          let label = present ? "connected" : "waiting";
          if (role === you) {
            label = "you";
          }
          statusElForRole.textContent = label;
        }
      };

      const glyphFor = (type) => {
        if (type === "ship") {
          return "⛵"; // sailboat
        }
        if (type === "port") {
          return "⚓"; // anchor
        }
        if (type === "rock") {
          return "⛰"; // mountain
        }
        return "";
      };

      const renderPilotGrid = (state, sessionCode) => {
        gameRoleName.textContent = "Pilot";
        gameRoleName.dataset.gameRole = "pilot";
        gameCode.textContent = sessionCode;
        gameBlurb.textContent =
          "You can only see the waters around your craft. Fog hides the rest.";

        // Build only the visible cells plus fog for everything else. We keep
        // the fog cells in the markup (so the grid still has a shape) but
        // mark them data-fog="true" and do not place any cell-type metadata
        // on them. Only the cells inside the porthole carry data-cell-type.
        const visibleByKey = new Map();
        for (const cell of state.visible) {
          visibleByKey.set(cell.x + "," + cell.y, cell);
        }

        const container = document.createElement("div");
        container.className = "grid pilot-grid";
        container.dataset.view = "pilot";
        container.style.setProperty("--grid-cols", String(state.width));

        for (let y = 0; y < state.height; y += 1) {
          for (let x = 0; x < state.width; x += 1) {
            const cellEl = document.createElement("div");
            cellEl.className = "cell";
            cellEl.dataset.cell = x + "," + y;
            const visible = visibleByKey.get(x + "," + y);
            if (visible) {
              cellEl.dataset.cellType = visible.type;
              cellEl.textContent = glyphFor(visible.type);
              cellEl.setAttribute(
                "aria-label",
                visible.type + " at column " + (x + 1) + " row " + (y + 1),
              );
            } else {
              cellEl.dataset.fog = "true";
              cellEl.setAttribute("aria-label", "fog");
            }
            container.appendChild(cellEl);
          }
        }

        gameGridHost.replaceChildren(container);
      };

      const renderLighthouseGrid = (state, sessionCode) => {
        gameRoleName.textContent = "Lighthouse";
        gameRoleName.dataset.gameRole = "lighthouse";
        gameCode.textContent = sessionCode;
        gameBlurb.textContent =
          "You see the whole chart. The Pilot is in the fog and needs your guidance.";

        const container = document.createElement("div");
        container.className = "grid lighthouse-grid";
        container.dataset.view = "lighthouse";
        container.style.setProperty("--grid-cols", String(state.width));

        for (const cell of state.cells) {
          const cellEl = document.createElement("div");
          cellEl.className = "cell";
          cellEl.dataset.cell = cell.x + "," + cell.y;
          cellEl.dataset.cellType = cell.type;
          cellEl.textContent = glyphFor(cell.type);
          cellEl.setAttribute(
            "aria-label",
            cell.type + " at column " + (cell.x + 1) + " row " + (cell.y + 1),
          );
          container.appendChild(cellEl);
        }

        gameGridHost.replaceChildren(container);
      };

      const connect = (code) => {
        showOnly(lobbySection);
        codeEl.textContent = code;
        const url = new URL(window.location.href);
        url.search = "?s=" + code;
        url.hash = "";
        shareLink.value = url.toString();

        const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = wsProtocol + "//" + window.location.host + "/api/ws?s=" + code;
        const socket = new WebSocket(wsUrl);
        let gotWelcome = false;
        let myRole = null;

        setStatus("Connecting...", "");

        socket.addEventListener("open", () => {
          setStatus("Connected. Waiting for partner...", "");
        });

        socket.addEventListener("message", (event) => {
          let payload;
          try {
            payload = JSON.parse(event.data);
          } catch {
            return;
          }
          if (!payload || typeof payload.type !== "string") {
            return;
          }
          if (payload.type === "full") {
            showOnly(fullSection);
            return;
          }
          if (payload.type === "welcome") {
            gotWelcome = true;
            myRole = payload.you;
            updateRoles(payload.peers, myRole);
            if (payload.peers.length === 2) {
              setStatus("Both players connected.", "ok");
            } else {
              setStatus("You are player " + myRole + ". Waiting for the other player...", "");
            }
            return;
          }
          if (payload.type === "peer-joined") {
            updateRoles(payload.peers, myRole);
            setStatus("Both players connected.", "ok");
            return;
          }
          if (payload.type === "peer-left") {
            updateRoles(payload.peers, myRole);
            setStatus("The other player disconnected. Start a new session to play again.", "error");
            // Drop back to the lobby — the grid is no longer authoritative.
            showOnly(lobbySection);
            return;
          }
          if (payload.type === "game-state") {
            if (payload.view === "pilot") {
              renderPilotGrid(payload.state, code);
              showOnly(gameSection);
              return;
            }
            if (payload.view === "lighthouse") {
              renderLighthouseGrid(payload.state, code);
              showOnly(gameSection);
              return;
            }
            return;
          }
        });

        socket.addEventListener("close", (event) => {
          if (event.code === 4000) {
            showOnly(fullSection);
            return;
          }
          if (!gotWelcome) {
            setStatus("Could not connect. Check your link and try again.", "error");
            return;
          }
          setStatus("Disconnected. Start a new session to play again.", "error");
        });

        socket.addEventListener("error", () => {
          if (!gotWelcome) {
            setStatus("Could not connect. Check your link and try again.", "error");
          }
        });
      };

      const startNew = async () => {
        startButton.disabled = true;
        try {
          const response = await fetch("/api/new", { method: "POST" });
          if (!response.ok) {
            throw new Error("server " + response.status);
          }
          const data = await response.json();
          const target = new URL(window.location.href);
          target.search = "?s=" + data.code;
          target.hash = "";
          window.history.replaceState({}, "", target.toString());
          connect(data.code);
        } catch (err) {
          startButton.disabled = false;
          setStatus("Could not start a session. Try again.", "error");
        }
      };

      startButton.addEventListener("click", startNew);
      newButton.addEventListener("click", () => {
        const target = new URL(window.location.href);
        target.search = "";
        target.hash = "";
        window.location.href = target.toString();
      });

      shareButton.addEventListener("click", async () => {
        const value = shareLink.value;
        try {
          if (navigator.share) {
            await navigator.share({ title: "Beacon", url: value });
            return;
          }
        } catch {
          // fall through to clipboard
        }
        try {
          await navigator.clipboard.writeText(value);
          shareButton.textContent = "Copied";
          setTimeout(() => {
            shareButton.textContent = "Copy link";
          }, 1500);
        } catch {
          shareLink.select();
        }
      });

      const params = new URLSearchParams(window.location.search);
      const code = params.get("s");
      if (code && /^[A-Z2-9]{5}$/.test(code)) {
        subtitle.textContent = "Joining session " + code + ".";
        connect(code);
      } else {
        showOnly(startSection);
      }
    </script>
  </body>
</html>
`;
