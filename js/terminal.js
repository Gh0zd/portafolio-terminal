"use strict";

/**
 * Motor de consola, compartido por la terminal y el CV:
 *   Output → dibuja líneas, con efecto de escritura
 *   Shell  → interpreta lo escrito y ejecuta comandos
 *   Prompt → campo de entrada con cursor propio, historial y autocompletado
 */

function textNodesOf(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (walker.currentNode.data) nodes.push(walker.currentNode);
  return nodes;
}

class Output {
  #busy = false; // hay un comando escribiendo su respuesta
  #skip = false; // el usuario pidió mostrar el resto de golpe

  constructor(element) {
    this.element = element;
    for (const type of ["keydown", "pointerdown"]) {
      addEventListener(type, () => { this.#skip = this.#busy; });
    }
  }

  /** Ejecuta la respuesta de un comando; cualquier tecla o toque durante ese tiempo la muestra completa. */
  async run(task) {
    this.#busy = true;
    this.#skip = false;
    try {
      await task();
    } finally {
      this.#busy = false;
    }
  }

  print(html, className = "") {
    const line = document.createElement("div");
    line.className = `line ${className}`.trim();
    line.innerHTML = html;
    this.append(line);
    return line;
  }

  append(node) {
    this.element.append(node);
    this.scrollToEnd();
  }

  clear() {
    this.element.replaceChildren();
  }

  scrollToEnd() {
    this.element.scrollTop = this.element.scrollHeight;
  }

  /** Muestra una línea escribiéndola letra por letra (todo de golpe si se pidió saltar). */
  async type(html, { className = "", speed = 8 } = {}) {
    const line = this.print(html, className);
    if (prefersReducedMotion()) return line;

    const nodes = textNodesOf(line);
    const texts = nodes.map((node) => node.data);
    nodes.forEach((node) => { node.data = ""; });

    for (const [i, node] of nodes.entries()) {
      for (let count = 1; count <= texts[i].length && !this.#skip; count++) {
        node.data = texts[i].slice(0, count);
        this.scrollToEnd();
        await sleep(speed + Math.random() * 6);
      }
      node.data = texts[i];
    }

    this.scrollToEnd();
    return line;
  }
}

/**
 * Un comando es { desc, hidden?, complete?, run }:
 *   desc      texto de `help`
 *   hidden    no aparece en `help`
 *   complete  () => argumentos para el autocompletado
 *   run       (args, shell) => void | Promise
 */
class Shell {
  #queue = Promise.resolve();

  /** `hint` es HTML extra al final de `help`; `clearOnRun` limpia la salida antes de cada comando. */
  constructor({ output, commands, path, hint = "", clearOnRun = false }) {
    Object.assign(this, { output, commands, path, hint, clearOnRun });
  }

  /** Los comandos se ejecutan de a uno, en el orden en que se escribieron. */
  submit(raw) {
    this.#queue = this.#queue.then(() => this.#execute(raw)).catch(console.error);
  }

  async #execute(raw) {
    if (this.clearOnRun) this.output.clear();
    this.output.print(`${promptLabelHtml(this.path)} ${escapeHtml(raw)}`);

    const [name, ...args] = raw.trim().split(/\s+/);
    if (!name) return;

    const command = this.commands[name.toLowerCase()];
    await this.output.run(() =>
      command ? command.run(args, this) : this.output.type(`bash: ${escapeHtml(name)}: command not found`)
    );
  }

  /** Todo lo autocompletable ("theme", "theme amber", ...), en minúsculas. */
  suggestions() {
    return Object.entries(this.commands).flatMap(([name, { complete }]) => [
      name,
      ...(complete?.() ?? []).map((arg) => `${name} ${arg}`),
    ]);
  }
}

class Prompt {
  #shell;
  #history;
  #onClear;
  #input;
  #mirror;
  #historyIndex;
  #suggestion = "";

  /** `history` se comparte entre prompts; `onClear` se llama con Ctrl+L. */
  constructor(host, { id, shell, history, onClear }) {
    this.#shell = shell;
    this.#history = history;
    this.#onClear = onClear;
    this.#historyIndex = history.length;

    host.innerHTML =
      `<div class="prompt-row"><label class="prompt-label" for="${id}">${promptLabelHtml(shell.path)}</label>` +
      `<div class="field"><span class="mirror"></span><input id="${id}" class="field-input" autocomplete="off" ` +
      `autocapitalize="off" autocorrect="off" spellcheck="false" aria-label="Comando"></div></div>`;

    this.#mirror = host.querySelector(".mirror");
    this.#input = host.querySelector("input");

    this.#input.addEventListener("keydown", (event) => this.#onKeyDown(event));
    for (const type of ["input", "keyup", "click", "focus"]) {
      this.#input.addEventListener(type, () => this.#render());
    }
    document.addEventListener("selectionchange", () => {
      if (document.activeElement === this.#input) this.#render();
    });
    this.#render();
  }

  focus() {
    this.#input.focus();
  }

  #onKeyDown(event) {
    const atEnd = this.#input.selectionStart === this.#input.value.length;
    const { key } = event;

    if (key === "Enter") return this.#submit();

    if (key === "ArrowUp" || key === "ArrowDown") {
      event.preventDefault();
      this.#showHistory(key === "ArrowUp" ? -1 : 1);
    } else if (key === "Tab" || (key === "ArrowRight" && atEnd && this.#suggestion)) {
      event.preventDefault();
      if (this.#suggestion) this.#setValue(this.#suggestion);
    } else if (key.toLowerCase() === "l" && event.ctrlKey) {
      event.preventDefault();
      this.#onClear();
    }
  }

  /**
   * Si lo escrito coincide con UN solo comando posible (ej. "ski"), ejecuta ese:
   * así el autocompletado también funciona con Enter en el celular, que no tiene Tab.
   */
  #submit() {
    const typed = this.#input.value;
    const lower = typed.trim().toLowerCase();
    const matches = lower ? this.#shell.suggestions().filter((s) => s.startsWith(lower)) : [];
    const command = matches.length === 1 && matches[0] !== lower ? matches[0] : typed;

    if (command.trim()) this.#history.push(command);
    this.#historyIndex = this.#history.length;
    this.#shell.submit(command);
    this.#setValue("");
  }

  #showHistory(direction) {
    this.#historyIndex = Math.min(this.#history.length, Math.max(0, this.#historyIndex + direction));
    this.#setValue(this.#history[this.#historyIndex] ?? "");
  }

  #setValue(value) {
    this.#input.value = value;
    this.#input.setSelectionRange(value.length, value.length);
    this.#render();
  }

  /** Sugerencia completa para lo escrito, o "" si no hay. */
  #suggestionFor(value) {
    const lower = value.toLowerCase();
    const match = value.trim() && this.#shell.suggestions().find((s) => s.startsWith(lower) && s.length > lower.length);
    return match ? value + match.slice(value.length) : "";
  }

  /** Dibuja texto + cursor + sugerencia en gris (el <input> real está oculto). */
  #render() {
    const { value } = this.#input;
    const caret = this.#input.selectionStart ?? value.length;
    this.#suggestion = caret === value.length ? this.#suggestionFor(value) : "";

    const ghost = this.#suggestion && `<span class="ghost">${escapeHtml(this.#suggestion.slice(value.length))}</span>`;
    this.#mirror.innerHTML =
      escapeHtml(value.slice(0, caret)) + `<span class="cursor"></span>` + escapeHtml(value.slice(caret)) + ghost;
  }
}
