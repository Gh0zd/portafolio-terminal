"use strict";

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

/** Escapa texto para insertarlo en HTML. */
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);

const byId = (id) => document.getElementById(id);
const readCssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const yearsSince = (year) => new Date().getFullYear() - year;

const prefersReducedMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const hasHover = () => matchMedia("(hover: hover)").matches;

const THEMES = ["green", "amber", "cyan"];
const THEME_KEY = "ghozd.theme";

/** Aplica un tema y lo recuerda para la próxima visita. */
function applyTheme(name) {
  document.documentElement.dataset.theme = name;
  try {
    localStorage.setItem(THEME_KEY, name);
  } catch { /* sin almacenamiento: el tema dura solo esta visita */ }
}

function restoreTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (THEMES.includes(saved)) document.documentElement.dataset.theme = saved;
  } catch { /* sin almacenamiento: se queda el tema por defecto */ }
}
