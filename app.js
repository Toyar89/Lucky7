/* ========== Audio warmup & helpers ========== */
let audioWarmed = false;

function warmUpAudioOnce() {
  if (audioWarmed) return;
  audioWarmed = true;
  ['flipSound','winSound','bustSound'].forEach(id=>{
    const a = document.getElementById(id);
    if (!a) return;
    try {
      a.muted = true;
      a.play().then(()=>{ a.pause(); a.currentTime=0; a.muted=false; })
               .catch(()=>{ /* ok */ });
    } catch(_) {}
  });
}

// run BEFORE any card handler, once
document.addEventListener('pointerdown', function onFirstPointer(){
  warmUpAudioOnce();
  document.removeEventListener('pointerdown', onFirstPointer, true);
}, { once:true, capture:true });

function playSound(id, { clone=false } = {}) {
  const el = document.getElementById(id);
  if (!el) return Promise.resolve(false);
  try{
    if (clone) {
      const node = el.cloneNode(true);
      node.volume = el.volume ?? 1;
      node.addEventListener('ended', ()=>node.remove());
      document.body.appendChild(node);
      node.currentTime = 0;
      return node.play().then(()=>true).catch(()=>{ node.remove(); return false; });
    } else {
      el.currentTime = 0;
      return el.play().then(()=>true).catch(()=>false);
    }
  }catch(_){ return Promise.resolve(false); }
}

function playFallbackTick(){
  try{
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = playFallbackTick._ctx || new AC();
    playFallbackTick._ctx = ctx;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'square'; o.frequency.value = 1200;
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    const t = ctx.currentTime;
    o.start(t);
    g.gain.exponentialRampToValueAtTime(0.08, t+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t+0.08);
    o.stop(t+0.09);
  }catch(_){}
}

/* ========== Confetti (light) ========== */
(function () {
  const canvas = document.createElement('canvas');
  canvas.className = 'confetti';
  document.body.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W,H,particles=[],running=false,endTime=0;

  function resize(){ W=canvas.width=window.innerWidth; H=canvas.height=window.innerHeight; }
  window.addEventListener('resize', resize); resize();

  function spawn(n=5){
    for(let i=0;i<n;i++){
      particles.push({x:Math.random()*W,y:-10,vx:(Math.random()-0.5)*2,vy:2+Math.random()*3,size:4+Math.random()*6,rot:Math.random()*Math.PI,vr:(Math.random()-0.5)*0.2,shape:Math.random()<.5?'rect':'circle'});
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
  function loop(){ if(!running) return; step(); if(Date.now()<endTime){ spawn(3); requestAnimationFrame(loop);} else { running=false; particles=[]; ctx.clearRect(0,0,W,H);} }
  window.launchConfetti = d => { endTime=Date.now()+(d||5000); if(!running){ running=true; loop(); } };
})();

/* ========== Game state ========== */
let cards=[], revealed=[], gameOver=false, requiredPosition=null, winCount=0, loseCount=0;
let mustFlipFirstClick = true;

/* ========== Build / Start ========== */
function startGame(){
  cards = shuffle([1,2,3,4,5,6,7]);
  revealed = Array(7).fill(false);
  gameOver = false;
  requiredPosition = null;
  mustFlipFirstClick = true;

  const container = document.getElementById('cardContainer');
  container.innerHTML = '';

  for(let i=0;i<7;i++){
    const wrap = document.createElement('div');
    wrap.className = 'card-container';

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
    card.appendChild(inner); wrap.appendChild(card);

    const label = document.createElement('div');
    label.className = 'position-label';
    label.textContent = i+1;
    wrap.appendChild(label);

    container.appendChild(wrap);

    card.addEventListener('pointerdown', ()=>handleTurn(i, card, back), { passive:true });
  }

  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'Pick any card to start.';
  const btn = document.getElementById('gameButton');
  if (btn){ btn.textContent='Restart'; btn.onclick = startGame; }
}

/* ========== Turn logic ========== */
function handleTurn(index, cardEl, backEl){
  if (gameOver) return;

  const statusEl = document.getElementById('status');
  if (statusEl && statusEl.textContent) statusEl.textContent = '';

  if (!audioWarmed) warmUpAudioOnce();

  // First click always flips
  if (mustFlipFirstClick){
    mustFlipFirstClick = false;
    if (revealed[index]) return;

    revealed[index] = true;
    cardEl.classList.add('flipped');
    backEl.textContent = cards[index];

    if (revealed.every(Boolean)){ handleWin(); return; }

    requiredPosition = cards[index];
    if (revealed[requiredPosition-1]){ bust(index); return; }

    playSound('flipSound', { clone:true }).then(ok=>{ if(!ok) playFallbackTick(); });
    return;
  }

  // Chain enforced after first
  if (requiredPosition !== null && index !== requiredPosition-1) return;
  if (revealed[index]) return;

  revealed[index] = true;
  cardEl.classList.add('flipped');
  backEl.textContent = cards[index];

  if (revealed.every(Boolean)){ handleWin(); return; }

  requiredPosition = cards[index];
  if (revealed[requiredPosition-1]){ bust(index); return; }

  playSound('flipSound', { clone:true });
}

/* ========== Win / Bust ========== */
function handleWin(){
  playSound('winSound', { clone:true });
  winCount++;
  const winEl = document.getElementById('winCount'); if (winEl) winEl.textContent = String(winCount);
  const statusEl = document.getElementById('status'); if (statusEl) statusEl.textContent = '🎉 You win! All cards revealed.';

  const all = document.querySelectorAll('.card');
  all.forEach(c=>{
    c.classList.remove('bustFlash');
    c.classList.add('flipped','winFlash');
    const idx = c.dataset.index;
    c.querySelector('.card-back').textContent = cards[idx];
  });

  launchConfetti(5000);
  setTimeout(()=> document.querySelectorAll('.card').forEach(c=>c.classList.remove('winFlash')), 5000);
  gameOver = true;
}

function bust(idx){
  playSound('bustSound', { clone:true });
  loseCount++;
  const loseEl = document.getElementById('loseCount'); if (loseEl) loseEl.textContent = String(loseCount);

  const card = document.querySelectorAll('.card')[idx];
  card.classList.add('flipped','bustFlash');

  const back = card.querySelector('.card-back');
  if (back && back.textContent.trim()==='') back.textContent = cards[idx];

  const statusEl = document.getElementById('status'); if (statusEl) statusEl.textContent = '❌ Try again';
  gameOver = true;
}

/* ========== Helpers ========== */
function shuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

function showHowToPlay(){ const m=document.getElementById('howToPlayModal'); if(m){ m.classList.add('show'); m.setAttribute('aria-hidden','false'); } }
function closeHowToPlay(){ const m=document.getElementById('howToPlayModal'); if(m){ m.classList.remove('show'); m.setAttribute('aria-hidden','true'); } }

/* ========== SW register (unchanged) ========== */
if ('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{ navigator.serviceWorker.register('./sw.js').catch(()=>{}); });
}

/* ========== Init ========== */
startGame();
window.startGame = startGame;
window.showHowToPlay = showHowToPlay;
window.closeHowToPlay = closeHowToPlay;
