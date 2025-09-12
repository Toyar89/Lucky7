/* ======================= Config ======================= */
const RESTART_DELAY = 3000;  // ms (auto-restart after win/bust)
const FADE_MS = 350;         // ms before restart to start fading

/* ======================= Confetti ======================= */
(function () {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let W, H, particles = [], running = false, endTime = 0;

  function resize(){
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  function spawn(n=5){
    for (let i=0;i<n;i++){
      particles.push({
        x: Math.random()*W,
        y: -10,
        vx: (Math.random()-0.5)*2,
        vy: 2+Math.random()*3,
        size: 4+Math.random()*6,
        rot: Math.random()*Math.PI,
        vr: (Math.random()-0.5)*0.2,
        shape: Math.random()<0.5 ? 'rect' : 'circle'
      });
    }
  }

  function step(){
    ctx.clearRect(0,0,W,H);
    particles.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
      if (p.y>H+20){ p.y=-10; p.x=Math.random()*W; }
      ctx.save();
      ctx.translate(p.x,p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = ['#FFD700','#FF3B3B','#4CAF50','#42A5F5','#FF9800'][Math.floor((p.rot*10)%5+5)%5];
      if (p.shape==='rect') ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.6);
      else { ctx.beginPath(); ctx.arc(0,0,p.size/2,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
    });
  }

  function loop(){
    if(!running) return;
    step();
    if(Date.now()<endTime){
      spawn(3);
      requestAnimationFrame(loop);
    } else {
      running=false;
      particles=[];
      ctx.clearRect(0,0,W,H);
    }
  }

  window.launchConfetti = function(d=RESTART_DELAY){
    endTime=Date.now()+d;
    if(!running){ running=true; loop(); }
  };
})();

/* ======================= Game State ======================= */
let cards = [];
let revealed = [];
let gameOver = false;
let requiredPosition = null;
let winCount = 0, loseCount = 0;
let mustFlipFirstClick = true;

/* ======================= Build / Start ======================= */
function startGame() {
  cards = shuffle([1,2,3,4,5,6,7]);
  revealed = Array(7).fill(false);
  gameOver = false;
  requiredPosition = null;
  mustFlipFirstClick = true;

  // hide win overlay if showing
  const winOverlay = document.getElementById('winOverlay');
  if (winOverlay) winOverlay.classList.remove('show');

  const container = document.getElementById('cardContainer');
  container.innerHTML = '';

  for (let i = 0; i < 7; i++) {
    const wrapper = document.createElement('div');
    wrapper.className = 'card-container';

    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.index = i;

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    const front = document.createElement('div');
    front.className = 'card-face card-front';

    const back = document.createElement('div');
    back.className = 'card-face card-back';
    back.textContent = '';

    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);
    wrapper.appendChild(card);

    const label = document.createElement('div');
    label.className = 'position-label';
    label.textContent = i + 1;
    wrapper.appendChild(label);

    container.appendChild(wrapper);

    card.addEventListener("click", () => handleTurn(i, card, back));
  }
}

/* ======================= Turn Logic ======================= */
function handleTurn(index, cardElement, backElement) {
  if (gameOver) return;

  if (mustFlipFirstClick) {
    mustFlipFirstClick = false;
    if (revealed[index]) return;

    revealed[index] = true;
    cardElement.classList.add('flipped');
    backElement.textContent = cards[index];

    if (revealed.every(Boolean)) { handleWin(); return; }

    requiredPosition = cards[index];
    if (revealed[requiredPosition - 1]) { bust(index); return; }
    return;
  }

  if (requiredPosition !== null && index !== requiredPosition - 1) return;
  if (revealed[index]) return;

  revealed[index] = true;
  cardElement.classList.add('flipped');
  backElement.textContent = cards[index];

  if (revealed.every(Boolean)) { handleWin(); return; }

  const nextPos = cards[index];
  requiredPosition = nextPos;
  if (revealed[nextPos - 1]) { bust(index); return; }
}

/* ======================= Win / Bust ======================= */
function handleWin() {
  winCount++;
  const winEl = document.getElementById('winCount');
  if (winEl) winEl.textContent = String(winCount);

  const allCards = document.querySelectorAll('.card');
  allCards.forEach(c => {
    c.classList.remove('bustFlash');
    c.classList.add('flipped', 'winFlash');
    const idx = c.dataset.index;
    c.querySelector('.card-back').textContent = cards[idx];
  });

  // Show YOU WIN overlay
  const winOverlay = document.getElementById('winOverlay');
  if (winOverlay) winOverlay.classList.add('show');

  launchConfetti(RESTART_DELAY);
  gameOver = true;

  const container = document.getElementById('cardContainer');
  setTimeout(() => container.classList.add('fade-out'), RESTART_DELAY - FADE_MS);

  setTimeout(() => {
    allCards.forEach(c => c.classList.remove('winFlash'));
    if (winOverlay) winOverlay.classList.remove('show');
    container.classList.remove('fade-out');
    startGame();
  }, RESTART_DELAY);
}

function bust(clickedIndex) {
  loseCount++;
  const loseEl = document.getElementById('loseCount');
  if (loseEl) loseEl.textContent = String(loseCount);

  const card = document.querySelectorAll('.card')[clickedIndex];
  card.classList.add('flipped', 'bustFlash');

  const back = card.querySelector('.card-back');
  if (back && back.textContent.trim() === '') back.textContent = cards[clickedIndex];

  // Add BUST labels at top and bottom if not already present
  if (back) {
    if (!back.querySelector('.bust-label.top')) {
      const topTag = document.createElement('div');
      topTag.className = 'bust-label top';
      topTag.textContent = 'BUST';
      back.appendChild(topTag);
    }
    if (!back.querySelector('.bust-label.bottom')) {
      const bottomTag = document.createElement('div');
      bottomTag.className = 'bust-label bottom';
      bottomTag.textContent = 'BUST';
      back.appendChild(bottomTag);
    }
  }

  gameOver = true;

  const container = document.getElementById('cardContainer');
  setTimeout(() => container.classList.add('fade-out'), RESTART_DELAY - FADE_MS);
  setTimeout(() => {
    container.classList.remove('fade-out');
    startGame();
  }, RESTART_DELAY);
}

/* ======================= Helpers ======================= */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random()*(i+1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function showHowToPlay(){
  const m = document.getElementById("howToPlayModal");
  if (m) m.classList.add('show');
  document.body.classList.add('modal-open');
}

function closeHowToPlay(){
  const m = document.getElementById("howToPlayModal");
  if (m) m.classList.remove('show');
  document.body.classList.remove('modal-open');
}

/* ======================= PWA install flow (desktop only) ======================= */
let deferredPrompt = null;
const installBtn = document.getElementById('installPromptBtn'); // optional element

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  if (!isMobile && installBtn) {
    installBtn.style.display = 'block';
  }
});

if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      installBtn.style.display = 'none';
    }
    deferredPrompt = null;
  });
}

window.addEventListener('appinstalled', () => {
  if (installBtn) installBtn.style.display = 'none';
  deferredPrompt = null;
});

/* ======================= Service worker ======================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* ======================= Init ======================= */
startGame();
window.startGame = startGame;
window.showHowToPlay = showHowToPlay;
window.closeHowToPlay = closeHowToPlay;