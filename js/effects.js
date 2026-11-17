"use strict";

/** Efectos visuales: secuencia de arranque y lluvia de código. */

const BOOT_STEPS = [
  "Inicializando entorno de terminal...",
  "Cargando módulos del sistema...",
  "Montando sistemas de archivos...",
  "Iniciando servicios de red...",
  "Cargando datos del portafolio...",
];
const BOOT_DURATION_MS = 2800;

/** Muestra el arranque y resuelve al terminar, o apenas el usuario toca o aprieta una tecla. */
function runBootSequence(windowEl, bootEl) {
  return new Promise((resolve) => {
    if (prefersReducedMotion()) return resolve();

    bootEl.innerHTML =
      `<div class="boot-box"><b>guest@${PORTFOLIO.host}:~$ boot --verbose</b>` +
      BOOT_STEPS.map((step) => `<div class="boot-step">${step}</div>`).join("") + `</div>` +
      `<div><div class="boot-progress-head"><span>Progreso de carga</span><b class="boot-percent">0%</b></div>` +
      `<div class="boot-bar"><i></i></div>` +
      `<div class="boot-ticks">${[0, 25, 50, 75, 100].map((n) => `<span>${n}%</span>`).join("")}</div></div>` +
      `<div class="boot-footer"><div class="boot-dots">• • •</div>Portafolio terminal v1.0.0<br>Hecho con HTML + CSS + JS<br>` +
      `Iniciando shell interactiva... <span class="dim">(tocá para saltar)</span></div>`;

    const steps = bootEl.querySelectorAll(".boot-step");
    const bar = bootEl.querySelector(".boot-bar i");
    const percent = bootEl.querySelector(".boot-percent");
    const startedAt = Date.now();
    const listeners = new AbortController();

    const finish = () => {
      clearInterval(timer);
      listeners.abort();
      windowEl.classList.remove("is-booting");
      resolve();
    };

    const timer = setInterval(() => {
      const progress = Math.min(1, (Date.now() - startedAt) / BOOT_DURATION_MS);
      bar.style.width = `${progress * 100}%`;
      percent.textContent = `${Math.round(progress * 100)}%`;
      steps.forEach((step, i) => step.classList.toggle("is-on", progress >= (i + 1) / (steps.length + 1)));
      if (progress === 1) {
        clearInterval(timer);
        setTimeout(finish, 400);
      }
    }, 50);

    windowEl.classList.add("is-booting");
    addEventListener("keydown", finish, { signal: listeners.signal });
    bootEl.addEventListener("click", finish, { signal: listeners.signal });
  });
}

const RAIN_GLYPHS = "アイウエオカキクケコサシスセソ0123456789<>{}/=+$#";
const RAIN_FONT_SIZE = 14;
const RAIN_FRAME_MS = 70;

function startMatrixRain(canvas) {
  const ctx = canvas.getContext("2d");
  let drops = []; // fila actual de cada columna

  const resize = () => {
    canvas.width = innerWidth;
    canvas.height = innerHeight;
    drops = Array.from({ length: Math.ceil(canvas.width / RAIN_FONT_SIZE) }, () => (Math.random() * canvas.height) / RAIN_FONT_SIZE);
  };

  const drawFrame = () => {
    ctx.globalAlpha = 0.12; // velo semitransparente: deja la estela de las letras anteriores
    ctx.fillStyle = readCssVar("--bg");
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = 1;
    ctx.fillStyle = readCssVar("--fg");
    ctx.font = `${RAIN_FONT_SIZE}px monospace`;

    drops.forEach((row, column) => {
      ctx.fillText(RAIN_GLYPHS[Math.floor(Math.random() * RAIN_GLYPHS.length)], column * RAIN_FONT_SIZE, row * RAIN_FONT_SIZE);
      drops[column] = row * RAIN_FONT_SIZE > canvas.height && Math.random() > 0.975 ? 0 : row + 1;
    });
  };

  resize();
  addEventListener("resize", resize);

  if (prefersReducedMotion()) {
    for (let i = 0; i < 40; i++) drawFrame(); // imagen fija
  } else {
    setInterval(() => { if (!document.hidden) drawFrame(); }, RAIN_FRAME_MS);
  }
}
