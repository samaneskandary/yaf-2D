"use strict";
/* ============================================================
   ساکر استارز — پیکربندی، وضعیت و راه‌اندازیِ زمین
   مختصاتِ مجازیِ زمین: FW x FH (پرتره)
   فایل‌ها یک حوزه‌ی سراسریِ مشترک دارند (اسکریپتِ کلاسیک).
   ============================================================ */
const FW = 600;
let   FH = 1040;                       // ارتفاع زمین — بسته به صفحه تنظیم می‌شود
const WALL = {l:30, r:FW-30, t:84, b:FH-84};
const GOAL_W = 170;
const GX1 = (FW-GOAL_W)/2, GX2 = (FW+GOAL_W)/2;   // دهانه دروازه
const GOAL_DEPTH = 42;     // عمق کم‌تر تا تهِ دروازه از لبه‌ی صفحه بیرون نزند
const GOAL_H = 34;        // ارتفاعِ توهمِ سه‌بعدیِ دروازه (depth+H = 76 < 84)
const R_PIECE = 26.25, R_BALL = 15.5, R_POST = 6;   // ۵٪ بزرگ‌تر تا گل‌زدن خیلی راحت نباشد
const MAX_SPEED = 29;     // بیشینه سرعت شوت (واحد بر فریم) — کمی آرام‌تر
const MAX_PULL  = 260;    // بیشینه کشش انگشت
const MIN_PULL  = 14;
const FRICTION  = 0.985;  // اصطکاک هر فریم (پیش‌فرض)
// زمین ۱ خاکی (پُراصطکاک، توپ سخت‌تر حرکت می‌کند)، ۲ چمن، ۳ سالن (لیز)
// اصطکاک به‌مرور کم می‌شود: خاکی > چمن > سالن
const FRICTION_BY_LEVEL = {1:0.960, 2:0.974, 3:0.984};
function fieldFriction(){ return FRICTION_BY_LEVEL[level] || FRICTION; }
const STOP_V    = 0.18;   // آستانه توقف
const REST      = 0.92;   // ضریب جهندگی برخوردها
const REST_WALL = 0.86;   // جهندگی دیوار
const WIN_GOALS = 3;
const TURN_TIME = 20000;  // مهلتِ هر نوبتِ بازیکن (میلی‌ثانیه)

const cv = document.getElementById('cv');
const ctx = cv.getContext('2d');

let view = {scale:1, ox:0, oy:0};
function resize(){
  const dpr = Math.min(window.devicePixelRatio||1, 2);
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width  = Math.max(1, Math.round(w*dpr));
  cv.height = Math.max(1, Math.round(h*dpr));
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const pad = 4;
  // ارتفاع زمین را با نسبت صفحه هماهنگ کن تا تقریباً تمام فضا را بپوشاند
  const aspect = (h - pad*2) / Math.max(1, (w - pad*2));   // ارتفاع/عرض ناحیه بازی
  FH = Math.round(Math.max(760, Math.min(1400, FW * aspect)));
  WALL.b = FH - 84;
  const s = Math.min((w-pad*2)/FW, (h-pad*2)/FH);
  view.scale = s;
  view.ox = (w - FW*s)/2;
  view.oy = (h - FH*s)/2;
}
window.addEventListener('resize', resize);

/* ---------- پرچم‌ها (۱۰ کشور؛ بدون کشورهای دارایِ محدودیتِ انتشار) ----------
   نوع‌ها در render.js (تابع paintFlag) رسم می‌شوند. */
const FLAGS = {
  turkey:      {type:'crescent', field:'#e30a17', mark:'#ffffff'},                                  // ترکیه
  germany:     {type:'hstripe',  cols:['#141414','#dd0000','#ffce00']},                              // آلمان
  italy:       {type:'vstripe',  cols:['#009246','#f1f2f1','#ce2b37']},                              // ایتالیا
  iran:        {type:'hstripe',  cols:['#239f40','#ffffff','#da0000']},                              // ایران
  morocco:     {type:'starfield',field:'#c1272d', star:'#006233', starR:0.46},                       // مراکش
  pakistan:    {type:'crescent', field:'#01411c', mark:'#ffffff', hoist:'#ffffff', hoistW:0.28},     // پاکستان
  senegal:     {type:'vstripe',  cols:['#00853f','#fdef42','#e31b23'], star:'#00853f'},              // سنگال
  jamaica:     {type:'saltire',  cross:'#fed100', a:'#009b3a', b:'#101820'},                         // جامائیکا
  southafrica: {type:'southafrica'},                                                                  // آفریقای جنوبی
  brazil:      {type:'brazil'}                                                                        // برزیل
};
// نامِ فارسیِ کشورها (برای نمایش در صورت نیاز)
const FLAG_NAMES = {
  turkey:'ترکیه', germany:'آلمان', italy:'ایتالیا', iran:'ایران', morocco:'مراکش',
  pakistan:'پاکستان', senegal:'سنگال', jamaica:'جامائیکا', southafrica:'آفریقای جنوبی', brazil:'برزیل'
};
// فهرستِ ترتیبِ انتخاب
const FLAG_LIST = ['turkey','germany','italy','iran','morocco','pakistan','senegal','jamaica','southafrica','brazil'];
// حریف طوری انتخاب می‌شود که رنگش با تیمِ تو تضاد داشته باشد
const OPP = {
  turkey:'brazil',      brazil:'turkey',
  germany:'italy',      italy:'germany',
  iran:'jamaica',       jamaica:'iran',
  morocco:'pakistan',   pakistan:'morocco',
  senegal:'southafrica',southafrica:'senegal'
};

/* ---------- وضعیت بازی ---------- */
let level = 1;
let playerFlag = 'turkey';    // پرچمِ تیمِ تو (قابل انتخاب پیش از بازی)
let opponentFlag = 'brazil';  // پرچمِ حریف
let soundOn = true;
let pieces = [];      // مهره‌ها
let ball = null;
let posts = [];       // تیرک‌ها (ثابت)
let turn = 'red';     // 'red' = بازیکن، 'blue' = هوش مصنوعی
let phase = 'aim';    // 'aim' | 'sim' | 'aiwait' | 'goal' | 'win'
let score = {red:0, blue:0};
let sel = null;       // مهره‌ی انتخاب‌شده
let drag = null;      // {x,y} موقعیت فعلی انگشت
let goalLock = false; // جلوگیری از ثبت چند گله
let pendingScorer = null, goalTimer = 0; // گلِ معوق تا توپ وارد تور شود
let aiTimer = 0;

const AI = { 1:{spread:0.55, power:0.70}, 2:{spread:0.34, power:0.80}, 3:{spread:0.18, power:0.88} };
const FORM = {
  1:[[0.5,0.90],[0.27,0.74],[0.73,0.74],[0.5,0.66]],
  2:[[0.5,0.91],[0.24,0.77],[0.44,0.67],[0.56,0.67],[0.76,0.77]],
  3:[[0.5,0.92],[0.22,0.80],[0.78,0.80],[0.36,0.68],[0.64,0.68],[0.5,0.74]]
};
function fx(f){ return WALL.l + f*(WALL.r-WALL.l); }
function fy(f){ return WALL.t + f*(WALL.b-WALL.t); }

function setupLevel(lv){
  level = lv;
  score = {red:0, blue:0};
  posts = [
    {x:GX1,y:WALL.t,r:R_POST},{x:GX2,y:WALL.t,r:R_POST},
    {x:GX1,y:WALL.b,r:R_POST},{x:GX2,y:WALL.b,r:R_POST}
  ];
  kickoff('red', true);
}
function kickoff(who, full){
  const form = FORM[level];
  pieces = [];
  for(const [a,b] of form){
    pieces.push(mk(fx(a), fy(b), 'red'));         // قرمز پایین
    pieces.push(mk(fx(a), fy(1-b), 'blue'));       // آبی بالا (آینه)
  }
  // توپ دقیقاً روی نقطه‌ی مرکزِ زمین قرار می‌گیرد
  ball = {x:FW/2, y:FH/2, vx:0, vy:0, r:R_BALL, m:1, ball:true, rot:0};
  turn = who; sel=null; drag=null; goalLock=false;
  if(turn==='blue'){ phase='aiwait'; aiTimer = performance.now()+750; }
  else { phase='aim'; if(typeof startTurnTimer==='function') startTurnTimer(); }
  updateHUD();
}
function mk(x,y,team){ return {x,y,vx:0,vy:0,r:R_PIECE,m:2.4,team}; }

/* بُردارِ یکه (جهت) — کمک‌تابعِ ریاضیِ مشترک */
function norm(x,y){ const d=Math.hypot(x,y)||1; return {x:x/d, y:y/d}; }