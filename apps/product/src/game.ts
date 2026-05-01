// Beacon — first slice. Authoritative game state lives in `SessionRoom`;
// this module supplies the types and the generator. No movement, no beam,
// no win condition yet — only the shared grid that each role sees through
// a different lens.

export type CellType = "empty" | "rock" | "port" | "ship";

export type Position = {
  readonly x: number;
  readonly y: number;
};

export type GameState = {
  readonly width: number;
  readonly height: number;
  readonly ship: Position;
  readonly port: Position;
  readonly rocks: ReadonlyArray<Position>;
};

// Cells visible to the Pilot are masked to those within Chebyshev distance
// `FOG_RADIUS` of the ship. A radius of 1 means "the ship and its eight
// neighbours" — a 3x3 porthole.
export const FOG_RADIUS = 1;

export const GRID_WIDTH = 6;
export const GRID_HEIGHT = 10;
const ROCK_MIN = 6;
const ROCK_MAX = 10;

// Tiny mulberry32 PRNG. Deterministic from a 32-bit seed so a given session
// code always produces the same grid, which makes manual reproduction
// possible during review without storing the grid anywhere persistent.
const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const seedFromCode = (code: string): number => {
  // FNV-1a 32-bit. Plenty for a per-session deterministic seed.
  let hash = 0x811c9dc5;
  for (let i = 0; i < code.length; i += 1) {
    hash ^= code.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
};

const positionKey = (p: Position): string => `${p.x},${p.y}`;

const pickPosition = (
  rng: () => number,
  width: number,
  height: number,
  taken: Set<string>,
): Position => {
  // The grid is only 60 cells; rejection sampling is fine.
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const candidate: Position = {
      x: Math.floor(rng() * width),
      y: Math.floor(rng() * height),
    };
    const key = positionKey(candidate);
    if (!taken.has(key)) {
      taken.add(key);
      return candidate;
    }
  }
  throw new Error("could not place position on grid");
};

export const generateGameState = (sessionCode: string): GameState => {
  const rng = mulberry32(seedFromCode(sessionCode));
  const taken = new Set<string>();

  // Place the ship near the bottom (Pilot starts at home) and the port near
  // the top (the destination they will eventually navigate to). Bands keep
  // the two sufficiently far apart to be interesting once movement lands.
  const shipY = GRID_HEIGHT - 1 - Math.floor(rng() * 2);
  const shipX = Math.floor(rng() * GRID_WIDTH);
  const ship: Position = { x: shipX, y: shipY };
  taken.add(positionKey(ship));

  const portY = Math.floor(rng() * 2);
  const portX = Math.floor(rng() * GRID_WIDTH);
  const port: Position = { x: portX, y: portY };
  taken.add(positionKey(port));

  const rockCount = ROCK_MIN + Math.floor(rng() * (ROCK_MAX - ROCK_MIN + 1));
  const rocks: Position[] = [];
  for (let i = 0; i < rockCount; i += 1) {
    // Keep the immediate ring around the ship clear so the Pilot's first
    // view is not boxed in by rocks before movement is implemented.
    let placed: Position | null = null;
    for (let attempt = 0; attempt < 200; attempt += 1) {
      const candidate = pickPosition(rng, GRID_WIDTH, GRID_HEIGHT, taken);
      const dx = Math.abs(candidate.x - ship.x);
      const dy = Math.abs(candidate.y - ship.y);
      if (Math.max(dx, dy) <= FOG_RADIUS) {
        // Roll back the placement and try again.
        taken.delete(positionKey(candidate));
        continue;
      }
      placed = candidate;
      break;
    }
    if (placed === null) {
      // Last-ditch: any free cell, even if it is in the porthole.
      placed = pickPosition(rng, GRID_WIDTH, GRID_HEIGHT, taken);
    }
    rocks.push(placed);
  }

  return {
    width: GRID_WIDTH,
    height: GRID_HEIGHT,
    ship,
    port,
    rocks,
  };
};

const isWithinFog = (cell: Position, ship: Position): boolean => {
  const dx = Math.abs(cell.x - ship.x);
  const dy = Math.abs(cell.y - ship.y);
  return Math.max(dx, dy) <= FOG_RADIUS;
};

// What the Pilot is allowed to know. A sparse list of revealed cells —
// cells outside the fog are not present at all (not even as "empty"), so
// the network message itself enforces the asymmetry.
export type PilotCell = {
  readonly x: number;
  readonly y: number;
  readonly type: CellType;
};

export type PilotView = {
  readonly width: number;
  readonly height: number;
  readonly fogRadius: number;
  readonly ship: Position;
  readonly visible: ReadonlyArray<PilotCell>;
};

export const buildPilotView = (state: GameState): PilotView => {
  const visible: PilotCell[] = [];
  const rockSet = new Set(state.rocks.map(positionKey));

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const cell: Position = { x, y };
      if (!isWithinFog(cell, state.ship)) {
        continue;
      }
      let type: CellType = "empty";
      if (state.ship.x === x && state.ship.y === y) {
        type = "ship";
      } else if (state.port.x === x && state.port.y === y) {
        type = "port";
      } else if (rockSet.has(positionKey(cell))) {
        type = "rock";
      }
      visible.push({ x, y, type });
    }
  }

  return {
    width: state.width,
    height: state.height,
    fogRadius: FOG_RADIUS,
    ship: state.ship,
    visible,
  };
};

// What the Lighthouse is allowed to know — everything.
export type LighthouseCell = {
  readonly x: number;
  readonly y: number;
  readonly type: CellType;
};

export type LighthouseView = {
  readonly width: number;
  readonly height: number;
  readonly cells: ReadonlyArray<LighthouseCell>;
};

export const buildLighthouseView = (state: GameState): LighthouseView => {
  const rockSet = new Set(state.rocks.map(positionKey));
  const cells: LighthouseCell[] = [];
  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      let type: CellType = "empty";
      if (state.ship.x === x && state.ship.y === y) {
        type = "ship";
      } else if (state.port.x === x && state.port.y === y) {
        type = "port";
      } else if (rockSet.has(positionKey({ x, y }))) {
        type = "rock";
      }
      cells.push({ x, y, type });
    }
  }
  return {
    width: state.width,
    height: state.height,
    cells,
  };
};
