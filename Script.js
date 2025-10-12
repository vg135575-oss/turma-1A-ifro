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
  alert("🎶 Música Lofi iniciada!");
});

// ==========================
// 💻 MODO HACKER
// ==========================
document.getElementById("modoHacker").addEventListener("click", () => {
  document.body.classList.add("matrix");
  document.body.classList.remove("dark");
  alert("💻 Modo Hacker Ativado!");
});

// ==========================
// 🌗 TROCA DE TEMA (CINZA ↔ MATRIX)
// ==========================
const themeButton = document.getElementById("toggleTheme");

themeButton.addEventListener("click", () => {
  if (document.body.classList.contains("matrix")) {
    document.body.classList.remove("matrix");
    document.body.classList.add("dark");
    alert("🌗 Tema Cinza Escuro Ativado!");
  } else {
    document.body.classList.remove("dark");
    document.body.classList.add("matrix");
    alert("💚 Tema Matrix Ativado!");
  }
});

// ==========================
// 🖼️ GALERIA AUTOMÁTICA
// ==========================
const fotos = [
  {src:"https://images.unsplash.com/photo-1556761175-5973dc0f32e7?auto=format&fit=crop&w=1200&q=80", caption:"Turma 1°A – Técnico em Informática 💻💚"},
  {src:"https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80", caption:"Aprendendo, rindo e programando ☕"},
  {src:"https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80", caption:"Laboratório de Informática — nossa segunda casa 😎"},
  {src:"https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80", caption:"Compilando amizade.exe com sucesso 🚀"},
  {src:"https://images.unsplash.com/photo-1537432376769-00a4c0f7e3b1?auto=format&fit=crop&w=1200&q=80", caption:"IFRO Ariquemes — futuro em desenvolvimento 🌐"}
];

let idx = 0;
setInterval(() => {
  idx = (idx + 1) % fotos.length;
  document.getElementById('slide').src = fotos[idx].src;
  document.getElementById('caption').textContent = fotos[idx].caption;
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
const fontSize = 14;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

function drawMatrix() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
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