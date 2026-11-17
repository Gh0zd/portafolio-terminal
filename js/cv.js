"use strict";

/** Vista CV: se genera por completo desde PORTFOLIO, sin texto repetido en el HTML. */

/** Línea con forma de comando: "guest@host:~$ cat about.txt" */
const cvCommandLine = (command, argument) =>
  `<p class="cv-command"><span class="dim">guest@${PORTFOLIO.host}:~$</span> <span class="warn">${command}</span> <span class="hl">${argument}</span></p>`;

function experienceHtml({ from, to, company, title, points }) {
  const years = to === "hoy" ? yearsSince(from) : to - from;
  return (
    `<div class="job"><div class="job-when">${from} – ${to} <span class="dim">(${years} ${years === 1 ? "año" : "años"})</span> › ${escapeHtml(company)}</div>` +
    `<h3>${escapeHtml(title)}</h3><ul>${points.map((point) => `<li>${escapeHtml(point)}</li>`).join("")}</ul></div>`
  );
}

const cvProjectHtml = ({ name, url, description, stack }) =>
  `<div class="job"><h3>${externalLinkHtml(url, name)}</h3><p>${escapeHtml(description)}</p><div class="job-when">${escapeHtml(stack)}</div></div>`;

/** HTML del CV; cada sección tiene un id (cv-*) al que saltan los comandos. */
function cvHtml() {
  const badges = PORTFOLIO.badges
    .map(([label, value]) => `<span class="badge"><span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b></span>`)
    .join("");
  const links = PORTFOLIO.contact.map(({ url, label }) => externalLinkHtml(url, label)).join(` <span class="dim">·</span> `);

  return `
    <header class="cv-head">
      <div>
        <h1>${escapeHtml(PORTFOLIO.name)}</h1>
        <p class="key">${escapeHtml(PORTFOLIO.tagline)}</p>
        <p>${badges}</p>
        <p>${links}</p>
      </div>
      <div class="avatar"><span>${escapeHtml(PORTFOLIO.name.slice(0, 2).toUpperCase())}</span><img alt="Foto de ${escapeHtml(PORTFOLIO.name)}"></div>
    </header>
    <hr>
    <section class="cv-section" id="cv-about">
      ${cvCommandLine("cat", "about.txt")}
      <p><b>${escapeHtml(PORTFOLIO.about.greeting)}</b><br>${escapeHtml(PORTFOLIO.about.text)}</p>
    </section>
    <section class="cv-section" id="cv-experience">
      ${cvCommandLine("tail -n 200", "experience.log")}
      ${PORTFOLIO.experience.map(experienceHtml).join("")}
    </section>
    <section class="cv-section" id="cv-projects">
      ${cvCommandLine("ls", "proyectos/")}
      ${PORTFOLIO.projects.map(cvProjectHtml).join("")}
    </section>
    <section class="cv-section" id="cv-activity"><div id="cv-activity-widget"></div></section>
    <section class="cv-section" id="cv-skills">
      ${cvCommandLine("cat", "skills.txt")}
      <p><span class="key">Lenguajes</span></p>
      <div id="cv-languages">${languageBarsHtml()}</div>
      <p><span class="key">Herramientas</span> ${escapeHtml(PORTFOLIO.tools.join(", "))}</p>
    </section>`;
}

/** Prueba cada foto de PORTFOLIO.avatar; si ninguna carga, quedan las iniciales. */
function loadAvatar(image, sources) {
  let attempt = 0;
  image.addEventListener("load", () => image.parentElement.classList.add("has-photo"), { once: true });
  image.addEventListener("error", () => (++attempt < sources.length ? (image.src = sources[attempt]) : image.remove()));
  image.src = sources[0];
}

/** Dibuja el CV y activa sus partes dinámicas. Devuelve el contenedor de las barras de lenguajes. */
function renderCv(container) {
  container.innerHTML = cvHtml();
  loadAvatar(container.querySelector(".avatar img"), PORTFOLIO.avatar);
  mountActivityWidget(byId("cv-activity-widget"));
  return byId("cv-languages");
}

/** Llena las barras cuando entran en pantalla, así la animación se ve aunque estén abajo del todo. */
let languagesObserver;
function revealLanguagesWhenVisible(languages, scrollRoot) {
  languagesObserver?.disconnect();
  languages.querySelectorAll(".lang-row").forEach((row) => row.classList.remove("is-filled"));

  languagesObserver = new IntersectionObserver(
    ([entry], observer) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      animateLanguageBars(languages);
    },
    { root: scrollRoot, threshold: 0.2 }
  );
  languagesObserver.observe(languages);
}
