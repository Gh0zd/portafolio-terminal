"use strict";

/* Constructores de HTML compartidos por la terminal y el CV. El texto de PORTFOLIO se escapa acá. */

/** Etiqueta del prompt: guest@host:ruta$ */
const promptLabelHtml = (path = "~") =>
  `<span class="hi">guest</span><span class="dim">@</span><span class="hi">${PORTFOLIO.host}</span>` +
  `:<span class="key">${escapeHtml(path)}</span>$`;

/** Comando clickeable dentro de la salida de la terminal. */
const commandLink = (command, label = command) =>
  `<span class="cmd" data-cmd="${escapeHtml(command)}">${escapeHtml(label)}</span>`;

const externalLinkHtml = (url, text) =>
  `<a href="${escapeHtml(url)}" target="_blank" rel="noopener">${escapeHtml(text)}</a>`;

const contactLineHtml = ({ label, text, url }) =>
  `<span class="key">${escapeHtml(label.padEnd(10))}</span>${externalLinkHtml(url, text)}`;

/** Ficha de proyecto para la terminal. */
const projectCardHtml = ({ name, description, stack, url }) =>
  `<span class="key">${escapeHtml(name)}</span>\n${escapeHtml(description)}\n` +
  `<span class="dim">stack: ${escapeHtml(stack)}</span>\n${externalLinkHtml(url, url.replace("https://", ""))}`;

/** Bloque neofetch: retrato Braille + datos del perfil. */
function neofetchHtml() {
  const rows = [
    ["Nombre", escapeHtml(PORTFOLIO.name)],
    ["Rol", escapeHtml(PORTFOLIO.role)],
    ["Uptime", `${yearsSince(PORTFOLIO.since)}+ años creando bots (desde ${PORTFOLIO.since})`],
    ["Shell", "/bin/bash"],
    ["Stack", escapeHtml(PORTFOLIO.languages.map(({ name }) => name).join(" · "))],
    ["Estado", `<span class="warn">${escapeHtml(PORTFOLIO.status)}</span>`],
    ["Ubicación", escapeHtml(PORTFOLIO.location)],
  ]
    .map(([label, value]) => `<span class="info-key">${label}</span><span>${value}</span>`)
    .join("");

  return (
    `<div class="fetch"><pre class="portrait" aria-hidden="true">${PORTRAIT}</pre><div>` +
    `<div><span class="fetch-user">guest</span><span class="hi">@${PORTFOLIO.host}</span></div>` +
    `<div class="dim">${"-".repeat(20)}</div><div class="info">${rows}</div></div></div>`
  );
}

/** Barras de porcentaje por lenguaje; se llenan al llamar a animateLanguageBars(). */
const languageBarsHtml = () =>
  `<div class="langs">${PORTFOLIO.languages
    .map(
      ({ name, percent }) =>
        `<div class="lang-row"><span class="lang-name">${escapeHtml(name)}</span>` +
        `<span class="lang-bracket">[</span><span class="lang-track"><i style="--w:${Number(percent)}%"></i></span>` +
        `<span class="lang-bracket">]</span><span class="lang-percent">${Number(percent)}%</span></div>`
    )
    .join("")}</div>`;

/** Llena las barras una por una (reinicia la animación si ya estaban llenas). */
function animateLanguageBars(container) {
  const rows = container.querySelectorAll(".lang-row");
  rows.forEach((row) => row.classList.remove("is-filled"));
  void container.offsetWidth; // fuerza reflow para reiniciar la transición CSS
  rows.forEach((row, i) => setTimeout(() => row.classList.add("is-filled"), 120 + i * 140));
}
