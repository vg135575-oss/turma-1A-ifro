// ==========================
// 💻 MODO HACKER
// ==========================
document.getElementById("modoHacker").addEventListener("click", () => {
  alert("💻 Modo Hacker Ativado!");
  window.open("hacker.html", "_blank"); // abre outra aba
});

// ==========================
// 🌗 TEMA CLARO/ESCURO
// ==========================
const body = document.body;
const themeButton = document.getElementById("toggleTheme");

if (localStorage.getItem("theme")) {
  body.className = localStorage.getItem("theme");
}

themeButton.addEventListener("click", () => {
  body.classList.toggle("light");
  body.classList.toggle("dark");
  const currentTheme = body.classList.contains("light") ? "light" : "dark";
  localStorage.setItem("theme", currentTheme);
});

// ==========================
// 📅 CALENDÁRIO
// ==========================
const calendar = document.getElementById("calendar");
const events = [
  { date: "2025-10-15", title: "Prova de Matemática 📘" },
  { date: "2025-10-20", title: "Entrega de Projeto 💻" },
  { date: "2025-11-01", title: "Feriado - Todos os Santos 🕊️" },
  { date: "2025-11-10", title: "Reunião de Grupo 👥" }
];

function renderCalendar() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();

  let html = `<h3>${now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h3><ul>`;
  events.forEach(e => {
    const eventDate = new Date(e.date);
    if (eventDate.getMonth() === month && eventDate.getFullYear() === year) {
      html += `<li><strong>${eventDate.getDate()}/${eventDate.getMonth()+1}</strong> – ${e.title}</li>`;
    }
  });
  html += "</ul>";
  calendar.innerHTML = html;
}
renderCalendar();

// ==========================
// 👀 CONTADOR DE VISITAS
// ==========================
let visitCount = localStorage.getItem("visitCount");
if (!visitCount) {
  visitCount = 1;
  localStorage.setItem("visitCount", visitCount);
} else {
  visitCount = parseInt(visitCount);
}
document.getElementById("visitCount").textContent = visitCount;

// ==========================
// 📸 LINK PARA GALERIA
// ==========================
document.getElementById("abrirGaleria").addEventListener("click", () => {
  window.open("galeria.html", "_blank");
});

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