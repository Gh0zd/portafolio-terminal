"use strict";

/**
 * Gráfico de actividad de GitHub con una serpiente que se come las contribuciones
 * y reinicia en bucle. Usa datos reales si la API responde; si no, unos de ejemplo.
 */

const ACTIVITY_API = "https://github-contributions-api.jogruber.de/v4";
const ROWS = 7; // días por semana
const WEEKS_DESKTOP = 52;
const WEEKS_MOBILE = 26;
const MOBILE_MAX_WIDTH = 460;
const CELL = { min: 3, max: 14, gap: 2 };
const SNAKE_LENGTH = 6;
const STEP_MS = { min: 120, range: 80 };
const FADE_MS = 450;
const RESTART_PAUSE_MS = 3500;
const LEVEL_OPACITY = [0, 0.3, 0.5, 0.75, 1];
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

const cellIndex = (column, row) => column * ROWS + row;

/* ================================ Datos ==================================== */

/** Generador con semilla: el gráfico de ejemplo es siempre el mismo. */
function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 2 ** 32;
  };
}

/** Semanas de ejemplo: columnas de 7 niveles de actividad (0–4). */
function sampleWeeks() {
  const random = seededRandom(2020);
  return Array.from({ length: WEEKS_DESKTOP }, (_, week) => {
    const busyness = Math.min(0.8, Math.max(0.05, 0.3 + 0.3 * Math.sin(week / 5) + (week > 35 ? 0.15 : 0)));
    return Array.from({ length: ROWS }, () => (random() > busyness ? 0 : 1 + Math.floor(random() * random() * 4)));
  });
}

/** Agrupa la lista diaria de la API en semanas de domingo a sábado. */
function toWeeks(contributions) {
  const offset = new Date(`${contributions[0].date}T00:00:00Z`).getUTCDay();
  const levels = [...Array(offset).fill(0), ...contributions.map(({ level }) => level ?? 0)];
  return Array.from({ length: Math.ceil(levels.length / ROWS) }, (_, week) =>
    Array.from({ length: ROWS }, (_, row) => levels[week * ROWS + row] ?? 0)
  );
}

const activity = { weeks: sampleWeeks(), isReal: false };

(async () => {
  try {
    const response = await fetch(`${ACTIVITY_API}/${PORTFOLIO.githubUser}?y=last`);
    const { contributions } = await response.json();
    if (contributions?.length) Object.assign(activity, { weeks: toWeeks(contributions), isReal: true });
  } catch { /* sin red o API caída: quedan los datos de ejemplo */ }
})();

/* ============================== Componente ================================= */

/** Llena `box` con encabezado, canvas y estado, e inicia la serpiente. */
function mountActivityWidget(box) {
  box.classList.add("act");
  box.innerHTML =
    `<div class="act-head"><span>ACTIVITY</span>${externalLinkHtml(`https://github.com/${PORTFOLIO.githubUser}`, "github →")}<i></i></div>` +
    `<canvas aria-label="Gráfico de actividad de GitHub"></canvas><div class="act-status"></div>`;
  return new SnakeGame(box);
}

/* ================================ Juego ==================================== */

class SnakeGame {
  #box;
  #canvas;
  #ctx;
  #statusEl;
  #colors = {};
  #weeks = [];
  #columns = 0;
  #cell = 0;
  #width = 0;
  #usesRealData = false;
  #run = null;
  #stopped = false;
  #frames = 0;
  #statusText = "";

  constructor(box) {
    this.#box = box;
    this.#canvas = box.querySelector("canvas");
    this.#ctx = this.#canvas.getContext("2d");
    this.#statusEl = box.querySelector(".act-status");
    this.#readColors();
    requestAnimationFrame(this.#tick);
  }

  stop() {
    this.#stopped = true;
  }

  get #head() {
    return this.#run.path.at(-1);
  }

  #readColors() {
    this.#colors = { fg: readCssVar("--fg"), line: readCssVar("--line"), hi: readCssVar("--hi") };
  }

  #inGrid(column, row) {
    return column >= 0 && column < this.#columns && row >= 0 && row < ROWS;
  }

  /** Ajusta el canvas al ancho disponible y empieza una partida nueva. */
  #layout() {
    const width = this.#box.clientWidth;
    if (!width) return;

    this.#width = width;
    this.#weeks = activity.weeks.slice(-(width < MOBILE_MAX_WIDTH ? WEEKS_MOBILE : WEEKS_DESKTOP));
    this.#columns = this.#weeks.length;
    this.#usesRealData = activity.isReal;

    const fitted = Math.floor((width - (this.#columns - 1) * CELL.gap) / this.#columns);
    this.#cell = Math.min(CELL.max, Math.max(CELL.min, fitted));

    const unit = this.#cell + CELL.gap;
    const [cssWidth, cssHeight] = [this.#columns * unit - CELL.gap, ROWS * unit - CELL.gap];
    const ratio = devicePixelRatio || 1;
    Object.assign(this.#canvas, { width: cssWidth * ratio, height: cssHeight * ratio });
    Object.assign(this.#canvas.style, { width: `${cssWidth}px`, height: `${cssHeight}px` });
    this.#ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    this.#startRun();
  }

  /**
   * Fases: "hunt" (busca cuadros) → "exit" (sale de la grilla) → "wait" (pausa) → reinicia.
   * `path` guarda las últimas celdas; la última es la cabeza y `next` la celda a la que va.
   */
  #startRun() {
    const row = 1 + Math.floor(Math.random() * (ROWS - 2));
    const total = this.#weeks.flat().filter(Boolean).length;

    this.#run = {
      path: Array.from({ length: SNAKE_LENGTH + 1 }, (_, i) => [i - SNAKE_LENGTH, row]), // entra por la izquierda
      heading: [1, 0],
      next: null,
      target: null,
      phase: "hunt",
      eaten: new Array(this.#columns * ROWS).fill(false),
      eatenAt: {},
      total,
      remaining: total,
      stepStart: performance.now(),
      stepMs: 150,
      resumeAt: 0,
    };
    this.#planNextStep();
  }

  /** Celdas del cuerpo (sin la cabeza): la serpiente no se cruza consigo misma. */
  #bodyCells() {
    return new Set(
      this.#run.path
        .slice(-SNAKE_LENGTH, -1)
        .filter(([column, row]) => this.#inGrid(column, row))
        .map(([column, row]) => cellIndex(column, row))
    );
  }

  /** Distancia en pasos desde una celda hasta cada una de las demás, esquivando `blocked`. */
  #distancesFrom(column, row, blocked) {
    const distance = new Array(this.#columns * ROWS).fill(-1);
    const queue = [[column, row]];
    distance[cellIndex(column, row)] = 0;

    for (const [c, r] of queue) {
      for (const [dc, dr] of DIRECTIONS) {
        const [nc, nr] = [c + dc, r + dr];
        if (!this.#inGrid(nc, nr) || distance[cellIndex(nc, nr)] >= 0 || blocked.has(cellIndex(nc, nr))) continue;
        distance[cellIndex(nc, nr)] = distance[cellIndex(c, r)] + 1;
        queue.push([nc, nr]);
      }
    }
    return distance;
  }

  /** Elige un cuadro con actividad cercano (a veces no el más cercano, para variar). */
  #chooseTarget(blocked) {
    const distance = this.#distancesFrom(...this.#head, blocked);
    const candidates = [];
    this.#weeks.forEach((week, column) =>
      week.forEach((level, row) => {
        const index = cellIndex(column, row);
        if (level && !this.#run.eaten[index] && distance[index] > 0) candidates.push({ cell: [column, row], distance: distance[index] });
      })
    );

    candidates.sort((a, b) => a.distance - b.distance);
    const roll = Math.random();
    const pick = roll < 0.55 ? 0 : roll < 0.85 ? 1 : 2;
    return candidates[Math.min(pick, candidates.length - 1)]?.cell ?? null;
  }

  /** Decide la próxima celda: camino más corto al objetivo, con algo de azar y preferencia por seguir recto. */
  #planNextStep() {
    const run = this.#run;
    const [headColumn, headRow] = this.#head;

    if (run.remaining === 0) {
      run.phase = "exit";
      run.next = [headColumn + 1, headRow];
      return;
    }

    const blocked = this.#bodyCells();
    if (!run.target || run.eaten[cellIndex(...run.target)]) run.target = this.#chooseTarget(blocked);

    const neighbors = DIRECTIONS.map(([dc, dr]) => [headColumn + dc, headRow + dr]).filter(([c, r]) => this.#inGrid(c, r));
    let options = [];
    if (run.target) {
      const distance = this.#distancesFrom(...run.target, blocked);
      const here = distance[cellIndex(headColumn, headRow)];
      if (here > 0) options = neighbors.filter(([c, r]) => distance[cellIndex(c, r)] === here - 1);
    }
    if (!options.length) { // sin camino al objetivo: cualquier celda libre
      run.target = null;
      options = neighbors.filter(([c, r]) => !blocked.has(cellIndex(c, r)));
      if (!options.length) options = neighbors;
    }

    const straight = options.find(([c, r]) => c - headColumn === run.heading[0] && r - headRow === run.heading[1]);
    run.next = straight && Math.random() < 0.65 ? straight : options[Math.floor(Math.random() * options.length)];
  }

  /** La cabeza llegó a `next`: se come el cuadro (si hay) y planea el siguiente paso. */
  #arrive(now) {
    const run = this.#run;
    const [fromColumn, fromRow] = this.#head;
    const [column, row] = run.next;

    run.path.push(run.next);
    run.path.shift();
    run.heading = [column - fromColumn, row - fromRow];

    if (run.phase === "hunt" && this.#inGrid(column, row) && this.#weeks[column][row] && !run.eaten[cellIndex(column, row)]) {
      run.eaten[cellIndex(column, row)] = true;
      run.eatenAt[cellIndex(column, row)] = now;
      run.remaining--;
    }

    if (run.phase === "exit" && column >= this.#columns + SNAKE_LENGTH) {
      Object.assign(run, { phase: "wait", resumeAt: now + RESTART_PAUSE_MS });
    } else {
      this.#planNextStep();
    }
  }

  /** Avanza la partida según el tiempo transcurrido y devuelve el progreso (0–1) del paso actual. */
  #advance(now) {
    const run = this.#run;
    if (run.phase === "wait") {
      if (now >= run.resumeAt) this.#startRun();
      return 0;
    }

    let progress = (now - run.stepStart) / run.stepMs;
    if (progress > 4) { // la pestaña estuvo en segundo plano: no "recuperar" cientos de pasos
      run.stepStart = now;
      progress = 0;
    }
    while (progress >= 1 && run.phase !== "wait") {
      run.stepStart += run.stepMs;
      this.#arrive(now);
      run.stepMs = STEP_MS.min + Math.random() * STEP_MS.range;
      progress = (now - run.stepStart) / run.stepMs;
    }
    return run.phase === "wait" ? 0 : Math.min(1, Math.max(0, progress));
  }

  /* --------------------------------- Dibujo -------------------------------- */

  #fillSquare(x, y, size, color, alpha = 1) {
    const ctx = this.#ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size, Math.max(1, size / 4));
    ctx.fill();
  }

  #draw(now, progress) {
    const { fg, line } = this.#colors;
    const run = this.#run;
    const size = this.#cell;
    const unit = size + CELL.gap;

    this.#ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    this.#ctx.shadowBlur = 0;

    for (let column = 0; column < this.#columns; column++) {
      for (let row = 0; row < ROWS; row++) {
        const index = cellIndex(column, row);
        let opacity = LEVEL_OPACITY[this.#weeks[column][row]];
        if (run.eaten[index]) opacity *= 1 - Math.min(1, (now - run.eatenAt[index]) / FADE_MS); // los comidos se desvanecen

        this.#fillSquare(column * unit, row * unit, size, line);
        if (opacity > 0.01) this.#fillSquare(column * unit, row * unit, size, fg, opacity);
      }
    }

    if (run.phase !== "wait") this.#drawSnake(now, progress, unit);
    this.#ctx.globalAlpha = 1;
    this.#ctx.shadowBlur = 0;
  }

  /** Cada segmento se interpola hacia la celda que tiene delante (movimiento fluido). */
  #drawSnake(now, progress, unit) {
    const { hi } = this.#colors;
    const { path, next } = this.#run;

    for (let segment = SNAKE_LENGTH - 1; segment >= 0; segment--) {
      const from = path.at(-1 - segment);
      const to = segment ? path.at(-segment) : next;
      let x = from[0] + (to[0] - from[0]) * progress;
      let y = from[1] + (to[1] - from[1]) * progress;

      if (segment) { // leve ondulación del cuerpo
        const wiggle = Math.sin(now / 230 + segment * 0.9) * 0.1;
        x -= (to[1] - from[1]) * wiggle;
        y += (to[0] - from[0]) * wiggle;
      }

      const size = segment ? Math.max(this.#cell * 0.4, this.#cell * (0.9 - 0.1 * segment)) : this.#cell + 2;
      const offset = (this.#cell - size) / 2;
      this.#ctx.shadowColor = hi;
      this.#ctx.shadowBlur = segment ? 0 : 8;
      this.#fillSquare(x * unit + offset, y * unit + offset, size, hi, 1 - segment * 0.1);
    }
  }

  #updateStatus() {
    const { remaining, total } = this.#run;
    const text = remaining === 0
      ? "🐍 <b>¡Se comió toda la actividad de GitHub!</b> Reiniciando…"
      : `Comiendo actividad… ${total ? Math.round(((total - remaining) / total) * 100) : 100} %${activity.isReal ? "" : " · datos de ejemplo"}`;

    if (text !== this.#statusText) {
      this.#statusText = text;
      this.#statusEl.innerHTML = text;
    }
  }

  #tick = (now) => {
    if (this.#stopped || !this.#box.isConnected) return;
    requestAnimationFrame(this.#tick);

    const width = this.#box.clientWidth;
    if (document.hidden || !width) return; // pestaña o vista oculta
    if (width !== this.#width || !this.#run || (activity.isReal && !this.#usesRealData)) this.#layout();
    if (!this.#run) return;

    if (this.#frames++ % 90 === 0) this.#readColors(); // por si cambió el tema
    this.#draw(now, this.#advance(now));
    this.#updateStatus();
  };
}
