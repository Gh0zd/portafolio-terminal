"use strict";

/**
 * Catálogo de comandos (formato en terminal.js, clase Shell):
 *   createTerminalCommands → terminal principal, muestra contenido
 *   createCvCommands       → consola del CV, navega entre secciones
 * Las respuestas usan output.type(): se escriben letra por letra, igual que `help`.
 */

const goTo = (view) => { location.hash = view; };
const projectNames = () => PORTFOLIO.projects.map(({ name }) => name.toLowerCase());
const findProject = (name) => PORTFOLIO.projects.find((p) => p.name.toLowerCase() === name.replace(/\/$/, "").toLowerCase());

async function typeLines(output, lines) {
  for (const line of lines) await output.type(line);
}

async function printHelp({ output, commands, hint }) {
  for (const [name, { desc, hidden }] of Object.entries(commands)) {
    if (hidden) continue;
    await output.type(`  ${commandLink(name)}${" ".repeat(Math.max(1, 11 - name.length))}<span class="dim">${escapeHtml(desc)}</span>`);
  }
  if (hint) await output.type(hint);
}

/* ------------------------ Comandos comunes a ambas consolas ---------------- */

const helpCommand = () => ({ desc: "mostrar esta ayuda", hidden: true, run: (_, shell) => printHelp(shell) });
const clearCommand = () => ({ desc: "limpiar pantalla", run: (_, { output }) => output.clear() });
const contactCommand = () => ({
  desc: "cómo escribirme",
  run: (_, { output }) => typeLines(output, PORTFOLIO.contact.map(contactLineHtml)),
});

const themeCommand = () => ({
  desc: THEMES.join(" | "),
  complete: () => THEMES,
  run: async ([name = ""], { output }) => {
    const theme = name.toLowerCase();
    if (!THEMES.includes(theme)) return output.type(`uso: theme ${THEMES.join(" | ")}`);
    applyTheme(theme);
    await output.type(`tema cambiado a <b>${theme}</b>`);
  },
});

const historyCommand = (history) => ({
  desc: "historial de comandos",
  run: (_, { output }) =>
    history.length
      ? typeLines(output, history.map((entry, i) => `${String(i + 1).padStart(4)}  ${escapeHtml(entry)}`))
      : output.type("(historial vacío)", { className: "dim" }),
});

/** Comandos de adorno: no aparecen en `help`, pero responden. */
const easterEggCommands = () => {
  const say = (text) => ({ hidden: true, run: (_, { output }) => output.type(text()) });
  return {
    echo: { hidden: true, run: (args, { output }) => output.type(escapeHtml(args.join(" "))) },
    date: say(() => new Date().toString()),
    pwd: say(() => "/home/guest/portafolio"),
    hostname: say(() => PORTFOLIO.host),
    uname: {
      hidden: true,
      complete: () => ["-a"],
      run: ([flag], { output }) =>
        output.type(`Linux ${PORTFOLIO.host} 6.8.0${flag === "-a" ? "-48-generic #48-Ubuntu SMP PREEMPT_DYNAMIC" : ""} x86_64 GNU/Linux`),
    },
    sudo: say(() => "guest no está en el archivo sudoers. Este incidente será reportado. 😉"),
  };
};

/* ------------------------------ Terminal principal ------------------------ */

const LONG_LISTING = [
  "total 42",
  "drwxr-xr-x  5 guest guest  4096 Nov 15 16:02 .",
  "drwxr-xr-x  3 guest guest  4096 Nov 10 09:14 ..",
  "-rw-r--r--  1 guest guest   128 Nov 15 15:40 about.txt",
  "-rw-r--r--  1 guest guest   256 Nov 15 15:41 experience.log",
  "drwxr-xr-x  2 guest guest  4096 Nov 15 15:42 proyectos/",
  "-rw-r--r--  1 guest guest    89 Nov 15 15:43 skills.txt",
];

/** El arte ASCII tiene cientos de caracteres: se escribe más rápido para no eternizarse. */
const ART_SPEED = 1;

function terminalHint() {
  return (
    `<span class="dim">(pssst — hay más comandos ocultos: probá </span>${commandLink("ls")}<span class="dim">, </span>` +
    `${commandLink("ls -la")}<span class="dim"> y </span><span class="hi">cat ${escapeHtml(projectNames()[0])}</span><span class="dim">)</span>`
  );
}

function createTerminalCommands({ history }) {
  let activityGame = null; // la serpiente activa en esta terminal

  const showProject = (project, output) => output.type(projectCardHtml(project), { className: "card" });

  const about = async (_, { output }) => {
    await output.type(`<span class="key">${escapeHtml(PORTFOLIO.name)}</span> — ${escapeHtml(PORTFOLIO.role)}`);
    await output.type(escapeHtml(`${PORTFOLIO.about.greeting}\n${PORTFOLIO.about.text}`), { className: "card" });
  };

  /** Muestra el proyecto de `arg` o, si no existe, el error de `command`. */
  const projectOrError = (command, arg, output) => {
    const project = findProject(arg);
    return project ? showProject(project, output) : output.type(`${command}: ${escapeHtml(arg)}: No such file or directory`);
  };

  return {
    help: helpCommand(),
    about: { desc: "quién soy", run: about },

    skills: {
      desc: "tecnologías que uso",
      run: async (_, { output }) => {
        await output.type(`<span class="key">Lenguajes</span>`);
        animateLanguageBars(await output.type(languageBarsHtml()));
        await output.type(`<span class="key">Herramientas</span>  ${escapeHtml(PORTFOLIO.tools.join(", "))}`);
      },
    },

    projects: {
      desc: "proyectos destacados",
      run: async (_, { output }) => {
        for (const project of PORTFOLIO.projects) await showProject(project, output);
        const box = document.createElement("div");
        output.append(box);
        activityGame?.stop();
        activityGame = mountActivityWidget(box);
        setTimeout(() => output.scrollToEnd(), 80);
      },
    },

    contact: contactCommand(),
    cv: { desc: "mi currículum", run: () => goTo("cv") },
    home: { desc: "volver a la consola", run: (_, { output }) => output.type("Ya estás en la consola.", { className: "dim" }) },
    theme: themeCommand(),
    clear: clearCommand(),
    history: historyCommand(history),

    exit: {
      desc: "cerrar sesión",
      run: async (_, { output }) => {
        await output.type("logout");
        await output.type(`Connection to ${PORTFOLIO.host} closed.`);
        await sleep(900);
        output.clear();
        await output.type(`<span class="dim">Sesión finalizada. Recargá la página para volver a entrar.</span>`);
      },
    },

    /* --- Ocultos --- */
    whoami: { hidden: true, run: about },
    neofetch: { hidden: true, run: (_, { output }) => output.type(neofetchHtml(), { speed: ART_SPEED }) },
    banner: { hidden: true, run: (_, { output }) => output.type(BANNER, { className: "banner", speed: ART_SPEED }) },

    ls: {
      hidden: true,
      complete: () => ["-la", ...projectNames()],
      run: ([arg = ""], { output }) => {
        if (["-la", "-l", "-a"].includes(arg.toLowerCase())) return typeLines(output, LONG_LISTING);
        if (!arg) return output.type(PORTFOLIO.projects.map(({ name }) => `${name}/`).join("  "));
        return projectOrError("ls", arg, output);
      },
    },

    cat: {
      hidden: true,
      complete: projectNames,
      run: ([arg], { output }) =>
        arg ? projectOrError("cat", arg, output) : output.type(`cat: falta un archivo (probá: cat ${projectNames()[0]})`),
    },

    ...easterEggCommands(),
  };
}

/* ------------------------------- Consola del CV ---------------------------- */

const CV_SECTIONS = [
  { name: "about", desc: "quién soy" },
  { name: "experience", desc: "experiencia" },
  { name: "projects", desc: "proyectos" },
  { name: "activity", desc: "actividad de GitHub" },
  { name: "skills", desc: "lenguajes y herramientas" },
];

/** Lleva el CV hasta una sección y la resalta un momento. */
async function showCvSection(name, { output }) {
  const section = byId(`cv-${name}`);
  section.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
  section.classList.remove("is-flashing");
  void section.offsetWidth; // reinicia la animación si ya estaba aplicada
  section.classList.add("is-flashing");
  await output.type(`<span class="dim">→ ${name}</span>`);
}

function createCvCommands({ history }) {
  const goHome = () => goTo("home");

  return {
    help: helpCommand(),
    home: { desc: "volver a la consola", run: goHome },
    ...Object.fromEntries(CV_SECTIONS.map(({ name, desc }) => [name, { desc, run: (_, shell) => showCvSection(name, shell) }])),
    contact: contactCommand(),
    top: { desc: "volver arriba", run: () => byId("cv-body").scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" }) },
    theme: themeCommand(),
    clear: clearCommand(),
    history: historyCommand(history),

    /* --- Ocultos --- */
    cv: { hidden: true, run: (_, { output }) => output.type("Ya estás en el CV.", { className: "dim" }) },
    back: { hidden: true, run: goHome },
    exit: { hidden: true, run: goHome },
    ls: { hidden: true, run: (_, { output }) => output.type(CV_SECTIONS.map(({ name }) => name).join("  ")) },
    ...easterEggCommands(),
  };
}
