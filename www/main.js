"use strict";
/* ============================================================
   ساکر استارز — حلقه‌ی اصلی، ورودی، رابط‌کاربری، موسیقی، تایمر
   ============================================================ */

let running = false;
let selLevel = 1;

/* ---------- اعداد فارسی ---------- */
function fa(n){ return String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]); }

/* ---------- تبدیل مختصاتِ صفحه به مختصاتِ زمین ---------- */
function toField(px, py){
  const rect = cv.getBoundingClientRect();
  return {
    x: (px - rect.left - view.ox) / view.scale,
    y: (py - rect.top  - view.oy) / view.scale
  };
}

/* ---------- ورودیِ بازیکن (کشیدن و رها کردن) ---------- */
function onDown(px, py){
  if(phase !== 'aim' || turn !== 'red') return;
  const p = toField(px, py);
  let best = null, bestD = 1e9;
  for(const mp of pieces){
    if(mp.team !== 'red') continue;
    const d = Math.hypot(mp.x - p.x, mp.y - p.y);
    if(d < mp.r + 12 && d < bestD){ bestD = d; best = mp; }
  }
  if(best){ sel = best; drag = {x:p.x, y:p.y}; }
}
function onMove(px, py){
  if(!sel) return;
  drag = toField(px, py);
}
function onUp(){
  if(sel && drag){
    const dx = sel.x - drag.x, dy = sel.y - drag.y;
    const pull = Math.min(Math.hypot(dx, dy), MAX_PULL);
    if(pull >= MIN_PULL){
      const dir = norm(dx, dy);
      const power = (pull / MAX_PULL) * MAX_SPEED;
      sel.vx = dir.x * power;
      sel.vy = dir.y * power;
      shooter = 'red'; shotFirst = firstKick; firstKick = false;   // ثبتِ شوت برای منطقِ خطای ضربه‌ی اول
      kickSound();
      phase = 'sim';
    }
  }
  sel = null; drag = null;
}

/* ---------- تایمرِ ۲۰ ثانیه‌ایِ نوبت ---------- */
let turnRemaining = TURN_TIME, turnLastTick = 0;
function startTurnTimer(){
  turnRemaining = TURN_TIME;
  turnLastTick = performance.now();
  updateTurnTimerUI();
}
function turnTimeout(){
  if(phase !== 'aim' || turn !== 'red') return;
  sel = null; drag = null;
  showBanner('زمان تمام شد! ⏱️');
  timeoutBeep();
  setTimeout(hideBanner, 1100);
  endTurn();                 // نوبت به حریف می‌رسد
  updateTurnTimerUI();
}
function updateTurnTimerUI(){
  const el = document.getElementById('turnTimer');
  if(!el) return;
  if(running && phase === 'aim' && turn === 'red'){
    const s = Math.max(0, Math.ceil(turnRemaining / 1000));
    el.hidden = false;
    el.textContent = (s <= 5 ? '⌛ ' : '⏳ ') + fa(s);   // ساعت شنی که به مرور تخلیه می‌شود
    el.classList.toggle('low', s <= 5);
  } else {
    el.hidden = true;
  }
}

/* ---------- حلقه‌ی اصلی ---------- */
function loop(now){
  if(!running) return;
  now = now || performance.now();

  if(phase === 'aim' && turn === 'red'){
    if(!sel){ turnRemaining -= (now - turnLastTick); }   // هنگام نشانه‌گیری با انگشت، مکث
    turnLastTick = now;
    if(turnRemaining <= 0){ turnTimeout(); }
    updateTurnTimerUI();
  } else {
    turnLastTick = now;
    updateTurnTimerUI();
  }

  if(phase === 'sim'){
    physicsStep();
    if(!moving()){
      if(goalLock){ settleGoal(); }
      else { endTurn(); }
    }
  } else if(phase === 'aiwait'){
    if(now >= aiTimer){ aiMove(); }
  }

  draw();
  requestAnimationFrame(loop);
}

/* ---------- رابط‌کاربریِ بازی ---------- */
function updateHUD(){
  const sr = document.getElementById('scoreRed'), sb = document.getElementById('scoreBlue');
  if(sr) sr.textContent = fa(score.red);
  if(sb) sb.textContent = fa(score.blue);
  const pill = document.getElementById('turnPill');
  if(pill){
    pill.innerHTML = (turn === 'red')
      ? '<span>نوبت تو</span><span>🔴</span>'
      : '<span>نوبت حریف</span><span>🔵</span>';
  }
  updateTurnTimerUI();
}
/* تزریقِ یک‌باره‌ی کی‌فریم‌های افکتِ گل تا به فایلِ styles.css وابسته نباشیم */
function ensureBannerFX(){
  if(document.getElementById('bannerFXStyle')) return;
  const st = document.createElement('style');
  st.id = 'bannerFXStyle';
  st.textContent =
    '#banner .bnr-in{display:inline-block;transform-origin:center center;will-change:transform;}' +
    '#banner .bnr-goal{animation:goalPopShake .8s cubic-bezier(.2,.9,.25,1) both;font-size:1.7em;font-weight:900;}' +
    '@keyframes goalPopShake{' +
      '0%{transform:scale(.4);opacity:.2}' +
      '16%{transform:scale(1.45) rotate(-3deg);opacity:1}' +
      '30%{transform:scale(1.32) translateX(-7px) rotate(3deg)}' +
      '42%{transform:scale(1.32) translateX(7px) rotate(-3deg)}' +
      '54%{transform:scale(1.26) translate(-5px,4px) rotate(2deg)}' +
      '66%{transform:scale(1.26) translate(5px,-4px) rotate(-2deg)}' +
      '78%{transform:scale(1.2) translateX(-3px)}' +
      '100%{transform:scale(1.18);opacity:1}}';
  document.head.appendChild(st);
}
function showBanner(txt, big){
  const b = document.getElementById('banner');
  if(!b) return;
  ensureBannerFX();
  // متن داخلِ یک span گذاشته می‌شود تا بزرگ‌نمایی/لرزش، مرکزچینیِ خودِ بنر را به‌هم نزند
  b.innerHTML = '<span class="bnr-in' + (big ? ' bnr-goal' : '') + '"></span>';
  b.firstChild.textContent = txt;
  b.classList.remove('hidden', 'pop');
  void b.offsetWidth;          // ری‌استارتِ انیمیشن
  b.classList.add('pop');
}
function hideBanner(){
  const b = document.getElementById('banner');
  if(b) b.classList.add('hidden');
}
function winScreen(scorer){
  const ov = document.getElementById('overlay');
  if(!ov) return;
  const won = scorer === 'red';
  document.getElementById('ovTitle').textContent = won ? 'بردی! 🏆' : 'باختی 😔';
  document.getElementById('ovSub').textContent   = fa(score.red) + ' — ' + fa(score.blue);
  ov.classList.remove('hidden');
  running = false;          // حلقه را متوقف کن تا با «بازی دوباره» دو حلقه هم‌زمان اجرا نشود
  updateTurnTimerUI();
}

/* ---------- پرچم‌های HUD و انتخابِ پرچم ---------- */
function paintSwatchCanvas(c, flag, size){
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  c.width = size * dpr; c.height = size * dpr;
  c.style.width = size + 'px'; c.style.height = size + 'px';
  drawFlagSwatch(c, flag);
}
function drawHudFlags(){
  const fr = document.getElementById('hudFlagRed');
  const fb = document.getElementById('hudFlagBlue');
  if(fr) paintSwatchCanvas(fr, playerFlag, 30);
  if(fb) paintSwatchCanvas(fb, opponentFlag, 30);
}
function buildFlagPicker(){
  const wrap = document.getElementById('flags');
  if(!wrap) return;
  wrap.innerHTML = '';
  FLAG_LIST.forEach(flag => {
    const d = document.createElement('div');
    d.className = 'flag-sw' + (flag === playerFlag ? ' sel' : '');
    d.dataset.flag = flag;
    const c = document.createElement('canvas');
    c.className = 'flag-cv';
    d.appendChild(c);            // فقط خودِ پرچم، بدونِ نوشتنِ نامِ کشور
    d.addEventListener('click', () => {
      playerFlag = flag;
      opponentFlag = OPP[flag] || opponentFlag;
      wrap.querySelectorAll('.flag-sw').forEach(e => e.classList.remove('sel'));
      d.classList.add('sel');
    });
    wrap.appendChild(d);
    paintSwatchCanvas(c, flag, 54);
  });
}
function buildLevelPicker(){
  document.querySelectorAll('.lvl-btn').forEach(b => {
    b.addEventListener('click', () => {
      selLevel = parseInt(b.dataset.lvl, 10);
      document.querySelectorAll('.lvl-btn').forEach(e => e.classList.remove('sel'));
      b.classList.add('sel');
      show('flagScreen');        // انتخابِ زمین → رفتن به صفحهٔ انتخابِ پرچم
    });
  });
}

/* ---------- موسیقیِ منو (پخشِ خودکارِ یک فایل) ---------- */
let musicOn = true;
let musicStarted = false;
function bgmEl(){ return document.getElementById('bgm'); }
function playMusic(){
  const b = bgmEl();
  if(!b || !musicOn) return;
  const p = b.play();
  if(p && p.then){ p.then(() => { musicStarted = true; }).catch(() => {}); }
  else { musicStarted = true; }
}
function pauseMusic(){
  const b = bgmEl();
  if(b){ try{ b.pause(); }catch(e){} }
}
function refreshMusicBtn(){
  const b = document.getElementById('musicBtn');
  if(b) b.textContent = musicOn ? '🎵 موسیقی: روشن' : '🎵 موسیقی: خاموش';
}
function toggleMusic(){
  musicOn = !musicOn;
  refreshMusicBtn();
  if(musicOn) playMusic(); else pauseMusic();
}
/* تا وقتی موسیقی واقعاً شروع نشده، با هر لمسِ کاربر دوباره تلاش کن
   (سیاستِ autoplay مرورگرها تا اولین تعاملِ موفق پخش را بلاک می‌کند) */
function unlockAudio(){
  audio();                              // فعال‌سازی AudioContext برای افکت‌ها
  if(!musicStarted) playMusic();
}

/* ---------- صدا (افکت‌ها) ---------- */
function refreshSoundBtn(){
  const b = document.getElementById('soundBtn');
  if(b) b.textContent = soundOn ? '🔊 صدا: روشن' : '🔈 صدا: خاموش';
}
function toggleSound(){
  soundOn = !soundOn;
  refreshSoundBtn();
}

/* ---------- ناوبریِ صفحه‌ها ---------- */
function show(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const el = document.getElementById(id);
  if(el) el.classList.add('active');
  if(id === 'gameScreen') pauseMusic();   // موسیقی فقط در منو/انتخاب
  else playMusic();
}
function startGame(){
  const ov = document.getElementById('overlay'); if(ov) ov.classList.add('hidden');
  opponentFlag = OPP[playerFlag] || opponentFlag;
  show('gameScreen');
  resize();
  drawHudFlags();
  setupLevel(selLevel);
  running = true;
  turnLastTick = performance.now();
  startTurnTimer();
  requestAnimationFrame(loop);
}
function stopGame(){
  running = false;
  const ov = document.getElementById('overlay'); if(ov) ov.classList.add('hidden');
  hideBanner();
  show('menuScreen');
}

/* ---------- راه‌اندازی ---------- */
function bindInput(){
  cv.addEventListener('pointerdown', e => { e.preventDefault(); onDown(e.clientX, e.clientY); }, {passive:false});
  window.addEventListener('pointermove', e => onMove(e.clientX, e.clientY));
  window.addEventListener('pointerup',   () => onUp());
  window.addEventListener('pointercancel', () => onUp());
}

function init(){
  buildFlagPicker();
  buildLevelPicker();
  refreshMusicBtn();
  refreshSoundBtn();
  bindInput();

  const byId = id => document.getElementById(id);
  byId('goPlay')     && (byId('goPlay').onclick     = () => { audio(); show('levelScreen'); });
  byId('backToMenu') && (byId('backToMenu').onclick = () => show('menuScreen'));
  byId('backToLevel')&& (byId('backToLevel').onclick= () => show('levelScreen'));
  byId('startBtn')   && (byId('startBtn').onclick   = () => { audio(); startGame(); });
  byId('backBtn')    && (byId('backBtn').onclick    = stopGame);
  byId('musicBtn')   && (byId('musicBtn').onclick   = toggleMusic);
  byId('soundBtn')   && (byId('soundBtn').onclick   = toggleSound);
  byId('ovReplay')   && (byId('ovReplay').onclick   = startGame);
  byId('ovMenu')     && (byId('ovMenu').onclick     = stopGame);

  // آزادسازیِ صدا/موسیقی با هر لمس تا اولین پخشِ موفق (نه فقط یک‌بار)
  ['pointerdown','touchstart','click','keydown'].forEach(ev =>
    window.addEventListener(ev, unlockAudio, true)
  );

  window.addEventListener('resize', () => { if(running) draw(); });

  resize();
  show('menuScreen');
}
window.addEventListener('load', init);

/* ---------- سرویس‌ورکر (PWA) ---------- */
if('serviceWorker' in navigator){
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  });
}
