/* ============================
   SCRIPT PRINCIPAL - IFRO 1°A
============================ */

/* ===== EFEITO MATRIX ===== */
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

canvas.height = window.innerHeight;
canvas.width = window.innerWidth;

const letters = "01";
const fontSize = 16;
const columns = canvas.width / fontSize;
const drops = Array(Math.floor(columns)).fill(1);

function drawMatrix() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#0f0";
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

setInterval(drawMatrix, 40);

window.addEventListener('resize', () => {
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
});

/* ===== CONTADOR DE VISITAS ===== */
const visitCountEl = document.getElementById('visitCount');
if (visitCountEl) {
  let visits = localStorage.getItem('visitas1A');
  if (!visits) visits = 0;
  visits++;
  localStorage.setItem('visitas1A', visits);
  visitCountEl.textContent = visits;
}

/* ===== BOTÃO: MODO HACKER ===== */
const hackerBtn = document.getElementById('modoHacker');
if (hackerBtn) {
  hackerBtn.addEventListener('click', () => {
    window.open('Hacker.html', '_blank');
  });
}

/* ===== BOTÃO: GALERIA ===== */
const galeriaBtn = document.getElementById('abrirGaleria');
if (galeriaBtn) {
  galeriaBtn.addEventListener('click', () => {
    window.open('galeria.html', '_blank');
  });
}

/* ===== MODO CLARO/ESCURO ===== */
const toggleThemeBtn = document.getElementById('toggleTheme');
if (toggleThemeBtn) {
  toggleThemeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light');
  });
}

/* ===== CALENDÁRIO SIMPLES ===== */
const calendarEl = document.getElementById('calendar');
if (calendarEl) {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const events = {
    "2025-10-15": "Trabalho de Redes",
    "2025-10-25": "Apresentação de Projeto",
    "2025-11-02": "Prova de Matemática",
    "2025-11-10": "Feira de Ciências"
  };

  function renderCalendar(year, month) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    let html = `<h3>${monthNames[month]} ${year}</h3>`;
    html += `<table><tr>
      <th>Dom</th><th>Seg</th><th>Ter</th><th>Qua</th><th>Qui</th><th>Sex</th><th>Sáb</th>
    </tr><tr>`;

    let dayOfWeek = firstDay.getDay();
    for (let i = 0; i < dayOfWeek; i++) html += "<td></td>";

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const event = events[dateStr];
      const isToday = (day === today.getDate() && month === today.getMonth());

      html += `<td class="${event ? 'event' : ''}" title="${event || ''}">
        ${isToday ? `<strong>${day}</strong>` : day}
        ${event ? `<br><small>${event}</small>` : ''}
      </td>`;

      if ((day + dayOfWeek) % 7 === 0) html += "</tr><tr>";
    }

    html += "</tr></table>";
    calendarEl.innerHTML = html;
  }

  renderCalendar(year, month);
}