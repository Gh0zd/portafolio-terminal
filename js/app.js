"use strict";

/** Punto de entrada: crea la terminal y la consola del CV y muestra una vista u otra según el hash (#home / #cv). */

const commandHistory = []; // compartido entre ambas consolas
const isCvRoute = () => location.hash === "#cv";
const focusPrompt = (prompt) => hasHover() && prompt.focus(); // en celulares el teclado no se abre solo

function createConsole({ out, prompt: promptId, win, path, commands, shell: shellOptions }) {
  const output = new Output(byId(out));
  const shell = new Shell({ output, commands, path, ...shellOptions });
  const prompt = new Prompt(byId(promptId), { id: `${promptId}-input`, shell, history: commandHistory, onClear: () => output.clear() });

  // Click en un comando de la salida lo ejecuta
  output.element.addEventListener("click", ({ target }) => {
    const link = target.closest("[data-cmd]");
    if (link) shell.submit(link.dataset.cmd);
  });

  // Click en cualquier parte de la ventana enfoca el prompt (salvo links, botones o texto seleccionado)
  byId(win).addEventListener("click", ({ target }) => {
    if (!target.closest("a, button, .cmd") && !String(getSelection())) prompt.focus();
  });

  return { output, prompt };
}

function printWelcome(output) {
  output.clear();
  output.print(BANNER, "banner");
  output.print(neofetchHtml());
  output.print(
    `Escribí ${commandLink("help")} para ver qué hay. Probá escribir <span class="hi">ski</span> y apretá <span class="hi">Tab</span> (o <span class="hi">Enter</span>).`,
    "dim"
  );
}

/** En celulares, ajusta el alto de la página cuando aparece el teclado. */
function keepLayoutAboveKeyboard(output) {
  const viewport = visualViewport;
  if (!viewport) return;
  const fit = () => {
    document.documentElement.style.setProperty("--vh", `${viewport.height}px`);
    output.scrollToEnd();
    scrollTo(0, 0);
  };
  viewport.addEventListener("resize", fit);
  fit();
}

function main() {
  restoreTheme();
  startMatrixRain(byId("rain"));

  const terminal = createConsole({
    out: "out", prompt: "term-prompt", win: "term", path: "~",
    commands: createTerminalCommands({ history: commandHistory }),
    shell: { hint: terminalHint() },
  });
  const cv = createConsole({
    out: "cv-out", prompt: "cv-prompt", win: "cvwin", path: "~/cv",
    commands: createCvCommands({ history: commandHistory }),
    shell: { clearOnRun: true, hint: `<span class="dim">tip: escribí </span>${commandLink("home")}<span class="dim"> para volver a la consola</span>` },
  });

  const languages = renderCv(byId("cv-body"));
  byId("footer-text").innerHTML = `© ${new Date().getFullYear()} ${escapeHtml(PORTFOLIO.name)} · escribí <span class="hi">help</span> para explorar`;

  let booting = !isCvRoute(); // el arranque solo se ve si se entra por la terminal

  const showView = () => {
    const isCv = isCvRoute();
    byId("term").hidden = isCv;
    byId("cvwin").hidden = !isCv;
    byId("foot").hidden = isCv;
    byId("top-left").textContent = isCv ? `← ${PORTFOLIO.host}` : PORTFOLIO.host;
    byId("top-right").innerHTML = isCv ? `<span class="hi">cv.html</span>` : `<a href="#cv">cv.html →</a>`;

    if (isCv) {
      byId("cv-body").scrollTop = 0;
      revealLanguagesWhenVisible(languages, byId("cv-body"));
      focusPrompt(cv.prompt);
    } else if (!booting) {
      focusPrompt(terminal.prompt);
    }
  };

  addEventListener("hashchange", showView);
  showView();

  (booting ? runBootSequence(byId("term"), byId("boot")) : Promise.resolve()).then(() => {
    booting = false;
    printWelcome(terminal.output);
    showView();
  });

  keepLayoutAboveKeyboard(terminal.output);
}

main();
