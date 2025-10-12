// ==========================
// 🎵 MÚSICA LOFI
// ==========================
const sound = new Howl({
  src: ['https://cdn.pixabay.com/download/audio/2023/01/23/audio_c0b8a7b0a7.mp3?filename=lofi-study-112191.mp3'],
  loop: true,
  volume: 0.25
});

document.getElementById("playMusic").addEventListener("click", () => {
  sound.play();
  showToast("🎶 Música Lofi iniciada!");
});

// ==========================
// 💻 MODO HACKER
// ==========================
document.getElementById("modoHacker").addEventListener("click", () => {
  document.body.classList.add("matrix");
  document.body.classList.remove("dark");
  showToast("💻 Modo Hacker Ativado!");
});

// ==========================
// 🌗 TROCA DE TEMA (CINZA ↔ MATRIX)
// ==========================
const themeButton = document.getElementById("toggleTheme");

themeButton.addEventListener("click", () => {
  if (document.body.classList.contains("matrix")) {
    document.body.classList.remove("matrix");
    document.body.classList.add("dark");
    showToast("🌗 Tema Cinza Escuro Ativado!");
  } else {
    document.body.classList.remove("dark");
    document.body.classList.add("matrix");
    showToast("💚 Tema Matrix Ativado!");
  }
});

// ==========================
// 🖼️ GALERIA AUTOMÁTICA
// ==========================
const fotos = [
  {
    src: "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80",
    caption: "Turma 1°A – Técnico em Informática 💻💚"
  },
  {
    src: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80",
    caption: "Aprendendo, rindo e programando ☕"
  },
  {
    src: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80",
    caption: "Compilando amizade.exe com sucesso 🚀"
  },
  {
    src: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    caption: "Laboratório de Informática — nossa segunda casa 😎"
  },
  {
    src: "https://images.unsplash.com/photo-1537432376769-00a4c0f7e3b1?auto=format&fit=crop&w=1200&q=80",
    caption: "IFRO Ariquemes — futuro em desenvolvimento 🌐"
  }
];

let idx = 0;
setInterval(() => {
  idx = (idx + 1) % fotos.length;
  const slide = document.getElementById('slide');
  const caption = document.getElementById('caption');

  slide.style.opacity = 0;
  setTimeout(() => {
    slide.src = fotos[idx].src;
    caption.textContent = fotos[idx].caption;
    slide.style.opacity = 1;
  }, 600);
}, 6000);

// ==========================
// 💬 TERMINAL ANIMADO
// ==========================
const terminal = document.getElementById('terminal');
const msgs = [
  "Inicializando sistema do 1°A...",
  "Conectando ao servidor IFRO...",
  "Compilando amizade.exe 💚",
  "Wi-Fi detectado: fraco mas firme 😎",
  "Carregando boas ideias...",
  "Bug resolvido com sucesso ✅",
  "Gerando inovação...",
  "IFRO SYSTEM pronto para uso."
];

let line = 0;
function type() {
  if (line < msgs.length) {
    let p = document.createElement('p');
    p.textContent = "> " + msgs[line];
    terminal.appendChild(p);
    terminal.scrollTop = terminal.scrollHeight;
    line++;
    setTimeout(type, 1500);
  }
}
type();

// ==========================
// 🌧️ EFEITO MATRIX
// ==========================
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

const letters = "01";
const fontSize = 16;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

function drawMatrix() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#00ff66";
  ctx.font = fontSize + "px monospace";
  for (let i = 0; i < drops.length; i++) {
    const text = letters.charAt(Math.floor(Math.random() * letters.length));
    ctx.fillText(text, i * fontSize, drops[i] * fontSize);
    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i]++;
  }
}
setInterval(drawMatrix, 33);

window.addEventListener("resize", () => {
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
});

// ==========================
// 🔔 TOAST (MENSAGEM FLUTUANTE)
// ==========================
function showToast(message) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}    "Depurando erros... e aprendendo ✅",
    "Sistema pronto! Seja bem-vindo."
  ];
  let line = 0;
  function type() {
    if (line < msgs.length) {
      const p = document.createElement('p');
      p.textContent = "> " + msgs[line];
      terminal.appendChild(p);
      terminal.scrollTop = terminal.scrollHeight;
      line++;
      setTimeout(type, 1500);
    }
  }
  type();

  // 🌧️ Efeito Matrix
  const canvas = document.getElementById('matrix');
  const ctx = canvas.getContext('2d');
  function resizeCanvas() {
    canvas.height = window.innerHeight;
    canvas.width = window.innerWidth;
  }
  resizeCanvas();
  const letters = "01";
  const fontSize = 14;
  let columns = canvas.width / fontSize;
  let drops = Array(Math.floor(columns)).fill(1);

  function drawMatrix() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#00ff66";
    ctx.font = fontSize + "px monospace";
    for (let i = 0; i < drops.length; i++) {
      const text = letters.charAt(Math.floor(Math.random() * letters.length));
      ctx.fillText(text, i * fontSize, drops[i] * fontSize);
      if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }
  setInterval(drawMatrix, 33);
  window.addEventListener("resize", resizeCanvas);
});
