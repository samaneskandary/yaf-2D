"use strict";
/* ---------- فیزیک ---------- */
function bodies(){ return ball ? pieces.concat([ball]) : pieces.slice(); }

function physicsStep(){
  const all = bodies();
  let maxV=0;
  for(const b of all){ const v=Math.hypot(b.vx,b.vy); if(v>maxV)maxV=v; }
  const sub = Math.min(8, Math.max(1, Math.ceil(maxV / (R_BALL))));
  for(let s=0;s<sub;s++){
    for(const b of all){                       // سقفِ سرعت: از پرتاب‌های افراطی و تونل‌زدن جلوگیری می‌کند
      const sp = Math.hypot(b.vx, b.vy);
      if(sp > SPEED_CAP){ const k = SPEED_CAP/sp; b.vx*=k; b.vy*=k; }
    }
    for(const b of all){ b.x += b.vx/sub; b.y += b.vy/sub; walls(b); }
    for(const b of all) for(const p of posts) staticHit(b,p);
    for(let i=0;i<all.length;i++)
      for(let j=i+1;j<all.length;j++) collide(all[i], all[j]);
    checkGoal();
  }
  const fr = fieldFriction();
  for(const b of all){
    b.vx*=fr; b.vy*=fr;
    if(Math.hypot(b.vx,b.vy) < STOP_V){ b.vx=0; b.vy=0; }
  }
  checkGoal();
}
function walls(b){
  const inMouth = b.x>GX1 && b.x<GX2;
  // دیوارهای چپ/راست
  if(b.x-b.r < WALL.l){ b.x=WALL.l+b.r; b.vx=Math.abs(b.vx)*REST_WALL; thud(b.vx); }
  if(b.x+b.r > WALL.r){ b.x=WALL.r-b.r; b.vx=-Math.abs(b.vx)*REST_WALL; thud(b.vx); }
  // مرز بالا — داخل دهانه، فرورفتگیِ دروازه برای همه‌ی اجسام (توپ و بازیکن‌ها)
  if(b.y-b.r < WALL.t){
    if(inMouth){
      if(b.x-b.r < GX1){ b.x=GX1+b.r; b.vx=Math.abs(b.vx)*REST_WALL; thud(b.vx); }
      if(b.x+b.r > GX2){ b.x=GX2-b.r; b.vx=-Math.abs(b.vx)*REST_WALL; thud(b.vx); }
      if(b.y-b.r < WALL.t-GOAL_DEPTH){ b.y=WALL.t-GOAL_DEPTH+b.r; b.vy=Math.abs(b.vy)*REST_WALL; thud(b.vy); }
    } else {
      b.y=WALL.t+b.r; b.vy=Math.abs(b.vy)*REST_WALL; thud(b.vy);
    }
  }
  // مرز پایین
  if(b.y+b.r > WALL.b){
    if(inMouth){
      if(b.x-b.r < GX1){ b.x=GX1+b.r; b.vx=Math.abs(b.vx)*REST_WALL; thud(b.vx); }
      if(b.x+b.r > GX2){ b.x=GX2-b.r; b.vx=-Math.abs(b.vx)*REST_WALL; thud(b.vx); }
      if(b.y+b.r > WALL.b+GOAL_DEPTH){ b.y=WALL.b+GOAL_DEPTH-b.r; b.vy=-Math.abs(b.vy)*REST_WALL; thud(b.vy); }
    } else {
      b.y=WALL.b-b.r; b.vy=-Math.abs(b.vy)*REST_WALL; thud(b.vy);
    }
  }
}
function staticHit(b,p){
  let dx=b.x-p.x, dy=b.y-p.y, d=Math.hypot(dx,dy)||0.001, min=b.r+p.r;
  if(d<min){
    const nx=dx/d, ny=dy/d, ov=min-d;
    b.x+=nx*ov; b.y+=ny*ov;
    const vn=b.vx*nx+b.vy*ny;
    if(vn<0){ b.vx-=(1+REST_WALL)*vn*nx; b.vy-=(1+REST_WALL)*vn*ny; thud(vn); }
  }
}
function collide(a,b){
  let dx=b.x-a.x, dy=b.y-a.y, d=Math.hypot(dx,dy)||0.001, min=a.r+b.r;
  if(d>=min) return;
  const nx=dx/d, ny=dy/d, ov=min-d, tot=a.m+b.m;
  a.x-=nx*ov*(b.m/tot); a.y-=ny*ov*(b.m/tot);
  b.x+=nx*ov*(a.m/tot); b.y+=ny*ov*(a.m/tot);
  const dvx=b.vx-a.vx, dvy=b.vy-a.vy, vn=dvx*nx+dvy*ny;
  if(vn>0) return;
  const j = -(1+REST)*vn/(1/a.m + 1/b.m);
  const ix=j*nx, iy=j*ny;
  a.vx-=ix/a.m; a.vy-=iy/a.m;
  b.vx+=ix/b.m; b.vy+=iy/b.m;
  hit(Math.abs(vn));
}
function moving(){
  for(const b of bodies()) if(b.vx||b.vy) return true;
  return false;
}

/* ---------- گل ---------- */
function checkGoal(){
  if(goalLock || !ball) return;
  const inMouth = ball.x>GX1 && ball.x<GX2;
  if(inMouth && ball.y < WALL.t){ scoreGoal('red'); }       // دروازه بالا → قرمز گل زد
  else if(inMouth && ball.y > WALL.b){ scoreGoal('blue'); }  // دروازه پایین → آبی گل زد
}
function scoreGoal(scorer){
  goalLock = true;                 // از ثبتِ دوباره جلوگیری می‌کند (ولی فیزیک ادامه دارد)
  if(shotFirst){
    // گل مستقیماً از نخستین ضربه‌ی راند → خطا و حساب نمی‌شود؛ نوبت به حریف می‌رسد
    foul = true;
    pendingScorer = null;
    showBanner('خطا! گل از ضربه‌ی اول حساب نیست ⚠️');
    if(typeof timeoutBeep === 'function') timeoutBeep();   // صدای خطا (نه سوتِ گل)
    clearTimeout(goalTimer);
    goalTimer = setTimeout(settleGoal, 5000);
    return;
  }
  foul = false;
  pendingScorer = scorer;
  score[scorer]++;
  updateHUD();
  celebrate(scorer);               // سوتِ گل + آهنگک
  showBanner(scorer==='red' ? 'گُل! 🔴' : 'گُل! 🔵', true);   // بنرِ بزرگ‌شونده و لرزان
  // کات نمی‌کنیم تا توپ (و همه‌ی مهره‌ها) کاملاً بایستند؛ این کار در حلقه‌ی اصلی دنبال می‌شود.
  // فقط یک ایمنی: اگر اجسام خیلی طول کشیدند، باز هم جمع‌بندی شود.
  clearTimeout(goalTimer);
  goalTimer = setTimeout(settleGoal, 5000);
}
/* وقتی توپ کاملاً ایستاد: سوتِ کات (متفاوت با سوتِ گل) سپس شروعِ راندِ بعد */
function settleGoal(){
  if(phase==='goal' || phase==='win') return;          // فقط یک‌بار
  if(!foul && !pendingScorer) return;                   // چیزی برای جمع‌بندی نیست
  phase='goal';                    // فریزِ کوتاه تا کات
  clearTimeout(goalTimer);
  hideBanner();                    // اعلامِ گل/خطا تا اینجا روی صفحه مانده بود
  if(!foul) cutWhistle();          // برای خطا سوتِ کات نمی‌زنیم
  goalTimer = setTimeout(finishGoal, 650);
}
function finishGoal(){
  if(foul){
    foul = false; goalLock = false;
    const opp = (shooter==='red') ? 'blue' : 'red';   // نوبت و توپ به حریفِ ضربه‌زننده
    kickoff(opp, false);
    return;
  }
  const scorer = pendingScorer; pendingScorer = null;
  if(score[scorer] >= WIN_GOALS){
    phase='win';
    winScreen(scorer);
  }else{
    const conceded = scorer==='red' ? 'blue' : 'red';
    kickoff(conceded, false);       // توپ به وسط زمین برای راندِ بعد
  }
}

/* ---------- هوش مصنوعی ---------- */
function aiMove(){
  const target = {x:FW/2, y:WALL.b};            // دروازه‌ی بازیکن
  let best=null, bestScore=-1e9;
  for(const p of pieces){
    if(p.team!=='blue') continue;
    const tb = norm(ball.x-p.x, ball.y-p.y);
    const tg = norm(target.x-ball.x, target.y-ball.y);
    const align = tb.x*tg.x + tb.y*tg.y;
    const dist = Math.hypot(ball.x-p.x, ball.y-p.y);
    const sc = align*1.6 - dist/FH;
    if(sc>bestScore){ bestScore=sc; best=p; }
  }
  if(!best){ endTurn(); return; }
  const cfg = AI[level];
  let dir = norm(ball.x-best.x, ball.y-best.y);
  const ang = Math.atan2(dir.y,dir.x) + (Math.random()-0.5)*cfg.spread;
  const power = MAX_SPEED*(cfg.power + Math.random()*0.1);
  best.vx = Math.cos(ang)*power;
  best.vy = Math.sin(ang)*power;
  shooter = 'blue'; shotFirst = firstKick; firstKick = false;   // ثبتِ شوت برای منطقِ خطای ضربه‌ی اول
  kickSound();
  phase='sim';
}
function endTurn(){
  if(phase==='win'||phase==='goal') return;
  turn = (turn==='red') ? 'blue' : 'red';
  if(turn==='blue'){ phase='aiwait'; aiTimer = performance.now()+650; }
  else { phase='aim'; if(typeof startTurnTimer==='function') startTurnTimer(); }
  updateHUD();
}
