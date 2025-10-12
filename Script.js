/* ==========================
   Turma 1°A — script.js (com suas fotos na galeria)
   Cole este arquivo inteiro no seu repositório (substitua o antigo).
   Coloque as imagens em /img/gal1.jpg ... /img/gal7.jpg (veja instruções acima).
   ========================== */

document.addEventListener("DOMContentLoaded", () => {
  initApp();
});

/* CONFIG */
const CONFIG = {
  musicSrc: 'https://cdn.pixabay.com/download/audio/2023/01/23/audio_c0b8a7b0a7.mp3?filename=lofi-study-112191.mp3',
  galleryInterval: 6000,
  matrixFPS: 33,
  matrixFontSize: 16,
  toastDuration: 3500,
};

const state = {
  musicPlaying: false,
  currentTheme: localStorage.getItem('ifro_theme') || 'dark',
  galleryIndex: 0,
  commands: {},
};

function initApp() {
  initDOMRefs();
  initMusic();
  initThemes();
  initGallery();
  initTerminal();
  initMatrix();
  initToasts();
  initShortcuts();
  initCustomCommands();

  applySavedTheme();
  showWelcomeMessage();
}

/* DOM Refs */
const $ = {};
function initDOMRefs() {
  $.playMusic = document.getElementById('playMusic');
  $.modoHacker = document.getElementById('modoHacker');
  $.toggleTheme = document.getElementById('toggleTheme');
  $.slide = document.getElementById('slide');
  $.caption = document.getElementById('caption');
  $.terminal = document.getElementById('terminal');
  $.canvas = document.getElementById('matrix');
  $.toastContainer = document.getElementById('toast-container');
  $.title = document.getElementById('titulo');

  if (!$.toastContainer) {
    const tc = document.createElement('div');
    tc.id = 'toast-container';
    document.body.appendChild(tc);
    $.toastContainer = tc;
  }
}

/* MUSIC */
let sound;
function initMusic() {
  sound = new Howl({
    src: [CONFIG.musicSrc],
    loop: true,
    volume: 0.3
  });

  if ($.playMusic) {
    $.playMusic.addEventListener('click', () => {
      toggleMusic();
    });
  }
}

function toggleMusic() {
  if (!sound) return;
  if (state.musicPlaying) {
    sound.pause();
    state.musicPlaying = false;
    showToast('🔈 Música pausada');
  } else {
    sound.play();
    state.musicPlaying = true;
    showToast('🎶 Música Lofi tocando');
  }
}

/* THEMES + HACKER BUTTON */
function initThemes() {
  if ($.toggleTheme) {
    $.toggleTheme.addEventListener('click', () => {
      if (state.currentTheme === 'matrix') setTheme('dark');
      else setTheme('matrix');
    });
  }

  if ($.modoHacker) {
    $.modoHacker.addEventListener('click', () => {
      // abre hacker.html em nova aba — ajuste se o arquivo estiver em outra pasta
      try { window.open('hacker.html', '_blank'); } catch (e) { /* ignore */ }
      setTheme('matrix');
      showToast('💻 Modo Hacker: nova aba aberta');
    });
  }
}

function setTheme(themeName) {
  document.body.classList.remove('matrix', 'dark');
  document.body.classList.add(themeName);
  state.currentTheme = themeName;
  localStorage.setItem('ifro_theme', themeName);
  showToast(themeName === 'matrix' ? '💚 Tema Matrix ativado' : '🌙 Tema Escuro ativado');
}

function applySavedTheme() {
  setTheme(state.currentTheme);
}

/* -----------------------------
   GALLERY — AQUI COLOQUEI SUAS FOTOS
   As imagens devem existir em /img/gal1.jpg ... /img/gal7.jpg
   ----------------------------- */
const GALLERY = [
  { src: "img/gal1.jpg", caption: "Turma no laboratório — aprendizado em ação 💻" },
  { src: "img/gal2.jpg", caption: "Comemorando momentos — bolo e amizade 🎂" },
  { src: "img/gal3.jpg", caption: "Aula prática no laboratório — foco e dedicação ⚙️" },
  { src: "img/gal4.jpg", caption: "Estudo noturno no lab — horas de código ✨" },
  { src: "img/gal5.jpg", caption: "Torcida e energia no ginásio — espírito escolar 💙" },
  { src: "img/gal6.jpg", caption: "Passeio e confraternização — memórias ao ar livre 🌤️" },
  { src: "img/gal7.jpg", caption: "Grande foto da turma — juntos conquistamos muito 🏆" }
];

let galleryTimer = null;
function initGallery() {
  if (!$.slide || !$.caption) return;

  $.slide.src = GALLERY[0].src;
  $.caption.textContent = GALLERY[0].caption;
  state.galleryIndex = 0;

  galleryTimer = setInterval(nextGallery, CONFIG.galleryInterval);

  $.slide.addEventListener('mouseenter', () => clearInterval(galleryTimer));
  $.slide.addEventListener('mouseleave', () => galleryTimer = setInterval(nextGallery, CONFIG.galleryInterval));
}

function nextGallery() {
  state.galleryIndex = (state.galleryIndex + 1) % GALLERY.length;
  const next = GALLERY[state.galleryIndex];
  $.slide.style.transition = 'opacity 600ms ease';
  $.slide.style.opacity = 0;
  setTimeout(() => {
    $.slide.src = next.src;
    $.caption.textContent = next.caption;
    $.slide.style.opacity = 1;
  }, 600);
}

/* TERMINAL */
function initTerminal() {
  if (!$.terminal) return;
  const intro = [
    "Inicializando Turma 1°A...",
    "Conectando ao IFRO...",
    "Compilando criatividade..."
  ];
  writeLines(intro, 700, startTerminalLoop);

  $.terminal.addEventListener('click', () => {
    const cmd = prompt('Digite um comando (ex: help, clear, nome):');
    if (!cmd) return;
    runCommand(cmd.trim().toLowerCase());
  });
}

function writeLines(lines = [], delay = 1000, cb) {
  let i = 0;
  function next() {
    if (i >= lines.length) {
      if (typeof cb === 'function') cb();
      return;
    }
    appendTerminal("> " + lines[i]);
    i++;
    setTimeout(next, delay);
  }
  next();
}

let terminalLoopTimer = null;
function startTerminalLoop() {
  const msgs = [
    "Compilando amizade.exe 💚",
    "Wi-Fi detectado: Operacional",
    "Carregando boas ideias...",
    "Depurando erros... aprendizado concluído ✅",
    "IFRO SYSTEM pronto"
  ];
  let i = 0;
  terminalLoopTimer = setInterval(() => {
    appendTerminal("> " + msgs[i % msgs.length]);
    i++;
  }, 4000);
}

function appendTerminal(text) {
  if (!$.terminal) return;
  const p = document.createElement('p');
  p.textContent = text;
  $.terminal.appendChild(p);
  $.terminal.scrollTop = $.terminal.scrollHeight;
}

/* Comandos customizáveis */
function initCustomCommands() {
  addCustomCommand('help', () => {
    appendTerminal("> Comandos: help, clear, nome, site");
    showToast('ℹ️ help exibido no terminal');
  });

  addCustomCommand('clear', () => {
    if ($.terminal) $.terminal.innerHTML = '';
    showToast('🧹 Terminal limpo');
  });

  addCustomCommand('nome', () => {
    appendTerminal("> Turma 1°A - Técnico em Informática (IFRO Ariquemes)");
  });

  addCustomCommand('site', () => {
    appendTerminal("> Abrindo página principal em nova aba...");
    window.open(window.location.href, '_blank');
  });
}

function addCustomCommand(cmd, handler) {
  if (typeof cmd !== 'string' || typeof handler !== 'function') return;
  state.commands[cmd.toLowerCase()] = handler;
}

function runCommand(cmd) {
  if (!cmd) return;
  const parts = cmd.split(' ').filter(Boolean);
  const name = parts[0].toLowerCase();
  const args = parts.slice(1);
  if (state.commands[name]) {
    try {
      state.commands[name](...args);
    } catch (err) {
      appendTerminal("> Erro ao executar comando: " + err.message);
    }
  } else {
    appendTerminal("> Comando não encontrado. Digite 'help' para listar comandos.");
  }
}

/* MATRIX */
let matrixInterval = null;
function initMatrix() {
  if (!$.canvas) return;
  setupMatrixCanvas();
  matrixInterval = setInterval(drawMatrix, CONFIG.matrixFPS);
  window.addEventListener('resize', handleResize);
}

let matrixCtx, matrixCanvas, matrixDrops, matrixColumns, matrixLetters;
function setupMatrixCanvas() {
  matrixCanvas = $.canvas;
  matrixCtx = matrixCanvas.getContext('2d');
  handleResize();
  matrixLetters = "01";
  matrixDrops = Array(Math.floor(matrixColumns)).fill(1);
}

function handleResize() {
  if (!matrixCanvas) return;
  matrixCanvas.width = window.innerWidth;
  matrixCanvas.height = window.innerHeight;
  matrixColumns = Math.floor(matrixCanvas.width / CONFIG.matrixFontSize);
  matrixDrops = Array(matrixColumns).fill(1);
}

function drawMatrix() {
  if (!matrixCtx) return;
  matrixCtx.fillStyle = "rgba(0, 0, 0, 0.08)";
  matrixCtx.fillRect(0, 0, matrixCanvas.width, matrixCanvas.height);
  matrixCtx.fillStyle = "#00ff66";
  matrixCtx.font = CONFIG.matrixFontSize + "px monospace";
  for (let i = 0; i < matrixDrops.length; i++) {
    const text = matrixLetters.charAt(Math.floor(Math.random() * matrixLetters.length));
    matrixCtx.fillText(text, i * CONFIG.matrixFontSize, matrixDrops[i] * CONFIG.matrixFontSize);
    if (matrixDrops[i] * CONFIG.matrixFontSize > matrixCanvas.height && Math.random() > 0.975) {
      matrixDrops[i] = 0;
    }
    matrixDrops[i]++;
  }
}

/* TOASTS */
function initToasts() { /* container criado em initDOMRefs */ }

function showToast(message, duration = CONFIG.toastDuration) {
  if (!$.toastContainer) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  $.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 500);
  }, duration);
}

/* FULLSCREEN */
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(err => {
      showToast('Erro ao entrar em tela cheia: ' + err.message);
    });
  } else {
    document.exitFullscreen();
  }
}

/* SHORTCUTS */
function initShortcuts() {
  window.addEventListener('keydown', (e) => {
    if (['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) return;
    const key = e.key.toLowerCase();
    if (key === 'm') toggleMusic();
    if (key === 'f') toggleFullscreen();
    if (key === 't') {
      if (state.currentTheme === 'matrix') setTheme('dark');
      else setTheme('matrix');
    }
    if (key === '?') {
      showToast("Atalhos: M = Música | F = Fullscreen | T = Tema");
    }
  });
}

/* WELCOME */
function showWelcomeMessage() {
  const hour = new Date().getHours();
  let greet = 'Bem-vindo!';
  if (hour < 12) greet = 'Bom dia, Turma 1°A!';
  else if (hour < 18) greet = 'Boa tarde, Turma 1°A!';
  else greet = 'Boa noite, Turma 1°A!';
  showToast(`🚀 ${greet} — IFRO Ariquemes`);
}

/* UTIL */
function randomMessage() {
  const arr = [
    "Inovação ativa",
    "Aprendizado em execução",
    "Compartilhe conhecimento",
    "Código é colaboração"
  ];
  return arr[Math.floor(Math.random() * arr.length)];
}

/* EXPOSIÇÃO (debug) */
window.IFRO = {
  toggleMusic,
  toggleFullscreen,
  setTheme,
  showToast,
  addCustomCommand,
  runCommand
};
