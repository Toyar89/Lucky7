/* Service worker registration */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* Confetti animation */
(function() {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], running = false, endTime = 0;
  
  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();
  
  function spawn(n = 5) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * W,
        y: -10,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 3,
        size: 4 + Math.random() * 6,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.2,
        shape: Math.random() < 0.5 ? 'rect' : 'circle'
      });
    }
  }
  
  function step() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.rot += p.vr;
      if (p.y > H + 20) { p.y = -10; p.x = Math.random() * W; }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = ['#FFD700', '#FF3B3B', '#4CAF50', '#42A5F5', '#FF9800'][Math.floor((p.rot * 10) % 5 + 5) % 5];
      if (p.shape === 'rect') ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      else { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    });
  }
  
  function loop() {
    if (!running) return;
    step();
    if (Date.now() < endTime) {
      spawn(3);
      requestAnimationFrame(loop);
    } else {
      running = false;
      particles = [];
      ctx.clearRect(0, 0, W, H);
    }
  }
  
  window.launchConfetti = function(durationMs = 5000) {
    endTime = Date.now() + durationMs;
    if (!running) { running = true; loop(); }
  };
})();

/* Game state variables */
let cards = [], revealed = [], gameOver = false, requiredPosition = null, firstMoveMade = false;
let winCount = 0, loseCount = 0;
let timerInterval, timerStarted = false, timeLeft = 60, timerDone = false;

function startGame() {
  if (timerDone) {
    document.getElementById("status").innerHTML = "<span class='timeUp'>⏰ TIME UP</span>";
    return;
  }

  cards = shuffle([1, 2, 3, 4, 5, 6, 7]);
  revealed = Array(7).fill(false);
  gameOver = false;
  requiredPosition = null;
  firstMoveMade = false;

  const container = document.getElementById("cardContainer");
  container.innerHTML = "";

  for (let i = 0; i < 7; i++) {
    const wrapper = document.createElement("div");
    wrapper.className = "card-container";

    const card = document.createElement("div");
    card.className = "card";
    card.dataset.index = i;

    const cardInner = document.createElement("div");
    cardInner.className = "card-inner";

    const front = document.createElement("div");
    front.className = "card-face card-front";

    const back = document.createElement("div");
    back.className = "card-face card-back";
    back.textContent = "";

    cardInner.appendChild(front);
    cardInner.appendChild(back);
    card.appendChild(cardInner);
    wrapper.appendChild(card);

    const label = document.createElement("div");
    label.className = "position-label";
    label.textContent = i + 1;

    wrapper.appendChild(label);
    container.appendChild(wrapper);

    card.addEventListener("click", () => handleTurn(i, card, back));
  }

  document.getElementById("status").textContent = "Pick any card to start.";
  const btn = document.getElementById("gameButton");
  btn.textContent = "Restart";
  btn.onclick = startGame;
}

function handleTurn(index, cardElement, backElement) {
  if (gameOver || timerDone) return;

  if (!firstMoveMade) {
    document.getElementById("status").textContent = "";
    firstMoveMade = true;
    if (!timerStarted) { startTimer(); timerStarted = true; }
  }

  if (requiredPosition !== null && index !== requiredPosition - 1) return;
  if (revealed[index]) return;

  revealed[index] = true;
  cardElement.classList.add("flipped");
  backElement.textContent = cards[index];

  requiredPosition = cards[index];

  if (revealed[requiredPosition - 1] && !gameOver) {
    bust(requiredPosition - 1);
  }

  if (revealed.every(r => r)) handleWin();
}

function handleWin() {
  document.getElementById("winSound").play();
  winCount++;
  document.getElementById("winCount").textContent = winCount;
  document.getElementById("status").textContent = "🎉 You win! All cards revealed.";
  document.querySelectorAll(".card").forEach(c => {
    c.classList.add("flipped", "winFlash");
    const idx = c.dataset.index;
    c.querySelector(".card-back").textContent = cards[idx];
  });
  launchConfetti(5000);
  setTimeout(() => document.querySelectorAll(".card").forEach(c => c.classList.remove("winFlash")), 5000);
  gameOver = true;
}

function bust(index) {
  document.getElementById("bustSound").play();
  loseCount++;
  document.getElementById("loseCount").textContent = loseCount;
  const bustedCard = document.querySelectorAll(".card")[index];
  bustedCard.classList.add("flipped", "bustFlash");
  bustedCard.querySelector(".card-back").textContent = cards[index];
  document.getElementById("status").textContent = "❌ Try again";
  gameOver = true;
}

function shuffle(arr) {
  let a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function startTimer() {
  const display = document.getElementById("timer");
  display.textContent = formatTime(timeLeft);
  timerInterval = setInterval(() => {
    timeLeft--;
    display.textContent = formatTime(timeLeft);
    if (timeLeft <= 0) {
      document.getElementById("timeUpSound").play();
      clearInterval(timerInterval);
      timerDone = true;
      gameOver = true;
      document.getElementById("status").innerHTML = "<span class='timeUp'>⏰ TIME UP</span>";
      const btn = document.getElementById("gameButton");
      btn.textContent = "Play"; btn.onclick = () => location.reload();
    }
  }, 1000);
}

function formatTime(s) {
  const m = Math.floor(s / 60), sec = s % 60;
  return `${m.toString().padStart(2,'0')}:${sec.toString().padStart(2,'0')}`;
}
// --- Fit the whole game to the screen if it's too tall
function fitToViewport() {
  const page = document.getElementById('page');
  if (!page) return;

  // clear previous scale to measure natural height
  page.style.transform = '';

  // available height = viewport minus body padding (safe-area included)
  const styles = getComputedStyle(document.body);
  const padTop = parseFloat(styles.paddingTop) || 0;
  const padBottom = parseFloat(styles.paddingBottom) || 0;
  const availableH = window.innerHeight - padTop - padBottom;

  const neededH = page.getBoundingClientRect().height;

  if (neededH > availableH) {
    // don’t go below 0.82 so it stays readable
    const scale = Math.max(0.82, availableH / neededH);
    page.style.transform = `scale(${scale})`;
  }
}

// keep it fitting as the phone rotates / URL bar changes size
window.addEventListener('load', fitToViewport);
window.addEventListener('resize', fitToViewport);
window.addEventListener('orientationchange', fitToViewport);

/* Splash logic: after 4 seconds, show game instantly */
window.addEventListener('load', () => {
  const SPLASH_MS = 4000;
  setTimeout(() => {
    document.getElementById('page').style.display = 'inline-block';
    startGame();
    const splash = document.getElementById('splash-overlay');
    if (splash) splash.remove();
  }, SPLASH_MS);
});

