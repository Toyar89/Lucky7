/* =======================
   Audio helpers + unlock
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

// Mobile audio unlock (doesn't block the click)
document.addEventListener('pointerdown', function unlockOnce() {
  ['flipSound','winSound','bustSound'].forEach(id => {
    const a = document.getElementById(id);
    if (!a) return;
    try {
      a.muted = true;
      a.play().then(() => { a.pause(); a.currentTime = 0; a.muted = false; });
    } catch (_) {}
  });
  document.removeEventListener('pointerdown', unlockOnce);
}, { once:true });

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

/* =======================
   Build / Start
   ======================= */
function startGame() {
  cards = shuffle([1,2,3,4,5,6,7]);
  revealed = Array(7).fill(false);
  gameOver = false;
  requiredPosition = null;

  const container = document.getElementById('cardContainer');
  container.innerHTML = '';

  for (let i=0;i<7;i++){
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
    label.textContent = i+1;
    wrapper.appendChild(label);

    container.appendChild(wrapper);

    card.addEventListener('click', () => handleTurn(i, card, back));
  }

  document.getElementById('status').textContent = 'Pick any card to start.';
  const btn = document.getElementById('gameButton');
  btn.textContent = 'Restart';
  btn.onclick = startGame;
}

/* =======================
   Turn Logic (first click flips)
   ======================= */
function handleTurn(index, cardElement, backElement) {
  if (gameOver) return;

  // Clear prompt on first click, but keep processing this same click.
  const statusEl = document.getElementById('status');
  if (statusEl && statusEl.textContent) statusEl.textContent = '';

  // If this is the *first flip* of the round, force chain to be free.
  // (prevents any stale requiredPosition from blocking the first flip)
  if (revealed.every(r => r === false)) {
    requiredPosition = null;
  }

  // Enforce chain only after the first flip
  if (requiredPosition !== null && index !== requiredPosition - 1) return;

  // Ignore already-revealed cards
  if (revealed[index]) return;

  // Reveal now
  revealed[index] = true;
  cardElement.classList.add('flipped');
  backElement.textContent = cards[index];

  // ✅ WIN check first
  if (revealed.every(Boolean)) { handleWin(); return; }

  // Set the next required position (1..7)
  const nextPos = cards[index];
  requiredPosition = nextPos;

  // ❌ Bust if the next required card is already face-up
  if (revealed[nextPos - 1]) { bust(index); return; }

  // Valid flip → play click sound
  playSound('flipSound');
}

/* =======================
   Win / Bust
   ======================= */
function handleWin() {
  playSound('winSound');
  winCount++;
  document.getElementById('winCount').textContent = winCount;
  document.getElementById('status').textContent = '🎉 You win! All cards revealed.';

  const allCards = document.querySelectorAll('.card');
  allCards.forEach(c => {
    c.classList.remove('bustFlash');
    c.classList.add('flipped','winFlash');
    const idx = c.dataset.index;
    c.querySelector('.card-back').textContent = cards[idx];
  });

  launchConfetti(5000);
  setTimeout(() => allCards.forEach(c => c.classList.remove('winFlash')), 5000);

  gameOver = true;
}

function bust(clickedIndex) {
  playSound('bustSound', { clone:true });
  loseCount++;
  document.getElementById('loseCount').textContent = loseCount;

  const card = document.querySelectorAll('.card')[clickedIndex];
  card.classList.add('flipped','bustFlash');

  const back = card.querySelector('.card-back');
  if (back && back.textContent.trim() === '') back.textContent = cards[clickedIndex];

  document.getElementById('status').textContent = '❌ Try again';
  gameOver = true;
}

/* =======================
   Helpers
   ======================= */
function shuffle(arr) {
  const a = [...arr];
  for (let i=a.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [a[i],a[j]] = [a[j],a[i]];
  }
  return a;
}

function showHowToPlay(){ document.getElementById('howToPlayModal').style.display = 'block'; }
function closeHowToPlay(){ document.getElementById('howToPlayModal').style.display = 'none'; }

/* =======================
   PWA install flow
   ======================= */
let deferredPrompt = null;
const installBtn = document.getElementById('installPromptBtn');

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (installBtn) installBtn.style.display = 'block';
});
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    installBtn.style.display = 'none';
    deferredPrompt = null;
  });
}
window.addEventListener('appinstalled', () => {
  if (installBtn) installBtn.style.display = 'none';
  deferredPrompt = null;
});

/* =======================
   Service worker
   ======================= */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}

/* =======================
   Init
   ======================= */
startGame();
window.startGame = startGame;
window.showHowToPlay = showHowToPlay;
window.closeHowToPlay = closeHowToPlay;
