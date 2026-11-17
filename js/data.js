"use strict";

/**
 * Datos del portafolio.
 * Es el ÚNICO archivo que necesitás editar para cambiar nombre, proyectos,
 * habilidades o contacto: la terminal y el CV se generan a partir de acá.
 */
const PORTFOLIO = Object.freeze({
  host: "ghozd.sh",
  name: "Ghozd",
  role: "Desarrollador de bots de Discord",
  tagline: "JavaScript | C++ | Python",
  since: 2020,
  location: "Yemen · UTC+7",
  status: "open to work (pasantía / junior)",

  about: {
    greeting: "¡Hola 👋! Soy Ghozd.",
    text: "Desarrollador enfocado principalmente en bots de Discord. Desde 2020 me dedico a crear bots.",
  },

  badges: [
    ["OPEN TO WORK", "INTERNSHIP / JUNIOR"],
    ["YEMEN", "UTC+7"],
    ["GITHUB", "GH0ZD"],
  ],

  githubUser: "Gh0zd",

  /** Fotos a probar, en orden. Si ninguna existe se muestran las iniciales. */
  avatar: ["img/avatar.png", "img/avatar.jpg", "img/avatar.jpeg", "img/avatar.webp"],

  contact: [
    { label: "github", text: "github.com/Gh0zd", url: "https://github.com/Gh0zd" },
    { label: "instagram", text: "instagram.com/gh0zd", url: "https://www.instagram.com/gh0zd" },
  ],

  experience: [
    {
      from: 2020,
      to: "hoy",
      company: "Independiente",
      title: "Desarrollador de bots de Discord",
      points: [
        "Creación de bots de Discord con JavaScript y discord.js",
        "Bases de datos con MongoDB y entornos Linux",
      ],
    },
  ],

  projects: [
    {
      name: "Akame-Bot-DiscordBot",
      url: "https://github.com/Gh0zd/Akame-Bot-DiscordBot",
      description:
        "Bot de Discord con comandos de utilidad, diversión, información y configuración, y un sistema de bienvenidas personalizable. Interfaz y comandos en español, inglés y portugués.",
      stack: "discord.js v14 · Node.js · SQLite",
    },
    {
      name: "Bot-de-Memes-Discord",
      url: "https://github.com/Gh0zd/Bot-de-Memes-Discord",
      description:
        "Bot para administrar un canal de memes, reenviar contenido de redes sociales y publicar mensajes destacados en un servidor.",
      stack: "discord.js v14",
    },
  ],

  /** Porcentajes de ejemplo: cambialos por los tuyos (la suma debería dar 100). */
  languages: [
    { name: "JavaScript", percent: 70 },
    { name: "Python", percent: 20 },
    { name: "C++", percent: 10 },
  ],

  tools: [
    "Node.js", "discord.js", "MongoDB", "npm", "Linux",
    "Photoshop", "Replit", "VS Code", "Sublime Text", "Netlify",
  ],
});
