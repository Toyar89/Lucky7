/* =======================
   Audio helpers + robust unlock
   ======================= */
function playSound(id, { clone = false } = {}) {
  const el = document.getElementById(id);
  if (!el) return;
  try {
    if (clone) {
      const node = el.cloneNode(true);
      node.volume = el.volume ?? 1;
      node.addEventListener('ended', () => node.remove());
      document.body.appendChild(node);
      node.currentTime = 0;
      node.play().catch(() => {});
    } else {
      el.currentTime = 0;
      el.play().catch(() => {});
    }
  } catch (_) {}
}

// Make sure Chrome/Android lets the *first* flip play audio immediately.
// We "warm up" every sound on the very first user gesture.
let audioUnlocked = false;
function unlockAllAudio() {
  if (audioUnlocked) return;
  ['flipSound', 'winSound', 'bustSound'].forEach((id) => {
    const a = document.getElementById(id);
    if (!a) return;
    try {
      a.muted = true;
      a.play().then(() => {
        a.pause();
        a.currentTime = 0;
        a.muted = false;
      }).catch(() => {});
    } catch (_) {}
  });
  audioUnlocked = true;
}

// Register multiple easy-to-fire gestures for maximum reliability on mobile
['pointerdown','touchend','mousedown','keydown'].forEach(evt =>
  document.addEventListener(evt, unlockAllAudio, { once: true, passive: true })
);

/* =======================
   Lightweight Confetti
   ======================= */
(function () {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W, H, particles = [], running = false, endTime = 0;

  function resize(){ W = canvas.width = window.innerWidth; H = canvas.height = window.innerHeight; }
  window.addEventListener('resize', resize); resize();

  function spawn(n=5){
    for (let i=0;i<n;i++){
      particles.push({
        x: Math.random()*W, y: -10,
        vx: (Math.random()-0.5)*2, vy: 2+Math.random()*3,
        size: 4+Math.random()*6, rot: Math.random()*Math.PI, vr: (Math.random()-0.5)*0.2,
        shape: Math.random()<0.5 ? 'rect' : 'circle'
      });
    }
  }
  function step(){
    ctx.clearRect(0,0,W,H);
    particles.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.rot+=p.vr;
      if (p.y>H+20){ p.y=-10; p.x=Math.random()*W; }
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
      ctx.fillStyle = ['#FFD700','#FF3B3B','#4CAF50','#42A5F5','#FF9800'][Math.floor((p.rot*10)%5+5)%5];
      if (p.shape==='rect') ctx.fillRect(-p.size/2,-p.size/2,p.size,p.size*0.6);
      else { ctx.beginPath(); ctx.arc(0,0,p.size/2,0,Math.PI*2); ctx.fill(); }
      ctx.restore();
    });
  }
  function loop(){ if(!running) return; step(); if(Date.now()<endTime){ spawn(3); requestAnimationFrame(loop); } else { running=false; particles=[]; ctx.clearRect(0,0,W,H); } }
  window.launchConfetti = function(d=5000){ endTime=Date.now()+d; if(!running){ running=true; loop(); } };
})();

/* =======================
   Game State
   ======================= */
let cards = [];
let revealed = [];
let gameOver = false;
let requiredPosition = null;
let winCount = 0, loseCount = 0;

// Guarantees the very first tap flips immediately
let mustFlipFirstClick = true;

/* =======================
   Build / Start
   ======================= */
function startGame() {
  cards = shuffle([1,2,3,4,5,6,7]);
  revealed = Array(7).fill(false);
  gameOver = false;
  requiredPosition = null;
  mustFlipFirstClick = true; // reset the first-click force

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

    inner.appendChild(front); inner.appendChild(back);
    card.appendChild(inner); wrapper.appendChild(card);

    const label = document.createElement('div');
    label.className = 'position-label';
    label.textContent = i + 1;
    wrapper.appendChild(label);

    container.appendChild(wrapper);

    // Use pointerdown so first tap isn't eaten by the browser
    card.addEventListener("pointerdown", () => handleTurn(i, card, back), { passive: true });
  }

  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'Pick any card to start.';
  const btn = document.getElementById('gameButton');
  if (btn) {
    btn.textContent = 'Restart';
    btn.onclick = startGame;
  }
}

/* =======================
   Turn Logic (first click always flips)
   ======================= */
function handleTurn(index, cardElement, backElement) {
  if (gameOver) return;

  // Clear the prompt on click, but keep processing the same click
  const statusEl = document.getElementById('status');
  if (statusEl && statusEl.textContent) statusEl.textContent = '';

  // Ensure audio is warmed up just in case the first gesture didn't fire
  unlockAllAudio();

  // FORCE the very first click to flip, then enable chain rules
  if (mustFlipFirstClick) {
    mustFlipFirstClick = false;              // consume the first-click privilege
    if (revealed[index]) return;             // safety

    revealed[index] = true;
    cardElement.classList.add('flipped');
    backElement.textContent = cards[index];

    // Win edge case
    if (revealed.every(Boolean)) { handleWin(); return; }

    // Start chain from the shown number
    requiredPosition = cards[index];

    // If next required card is already face-up → bust this clicked card
    if (revealed[requiredPosition - 1]) { bust(index); return; }

    playSound('flipSound');
    return; // stop here; from now on chain is enforced
  }

  // From second click onwards, enforce the chain
  if (requiredPosition !== null && index !== requiredPosition - 1) return;

  // Ignore already-revealed cards
  if (revealed[index]) return;

  // Reveal this card
  revealed[index] = true;
  cardElement.classList.add('flipped');
  backElement.textContent = cards[index];

  // Win if that was the last one
  if (revealed.every(Boolean)) { handleWin(); return; }

  // Set next required position and check bust
  const nextPos = cards[index];
  requiredPosition = nextPos;

  if (revealed[nextPos - 1]) { bust(index); return; }

  playSound('flipSound');
}

/* =======================
   Win / Bust
   ======================= */
function handleWin() {
  playSound('winSound');
  winCount++;
  const winEl = document.getElementById('winCount');
  if (winEl) winEl.textContent = String(winCount);
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = '🎉 You win! All cards revealed.';

  const allCards = document.querySelectorAll('.card');
  allCards.forEach(c => {
    c.classList.remove('bustFlash');
    c.classList.add('flipped', 'winFlash');
    const idx = c.dataset.index;
    c.querySelector('.card-back').textContent = cards[idx];
  });

  launchConfetti(5000);
  setTimeout(() => allCards.forEach(c => c.classList.remove('winFlash')), 5000);

  gameOver = true;
}

function bust(clickedIndex) {
  playSound('bustSound', { clone: true });
  loseCount++;
  const loseEl = document.getElementById('loseCount');
  if (loseEl) loseEl.textContent = String(loseCount);

  const card = document.querySelectorAll('.card')[clickedIndex];
  card.classList.add('flipped', 'bustFlash');

  const back = card.querySelector('.card-back');
  if (back && back.textContent.trim() === '') back.textContent = cards[clickedIndex];

  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = '❌ Try again';
  gameOver = true;
}

/* =======================
   Helpers
   ======================= */
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
  if (m) { m.classList.add("show"); m.setAttribute("aria-hidden","false"); }
}
function closeHowToPlay(){
  const m = document.getElementById("howToPlayModal");
  if (m) { m.classList.remove("show"); m.setAttribute("aria-hidden","true"); }
}

/* =======================
   Service worker (keep, no install button code)
   ======================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

/* =======================
   Init
   ======================= */
startGame();
window.startGame = startGame;
window.showHowToPlay = showHowToPlay;
window.closeHowToPlay = closeHowToPlay;
