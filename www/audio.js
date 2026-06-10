"use strict";
/* ---------- صدا (WebAudio، بدون فایلِ خارجی) ---------- */
let actx = null;
function audio(){
  try{
    if(!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if(actx.state === 'suspended') actx.resume();
  }catch(e){}
  return actx;
}
function beep(freq, dur, type, vol){
  if(!soundOn) return;
  const a = audio(); if(!a) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type || 'sine';
  o.frequency.value = freq;
  o.connect(g); g.connect(a.destination);
  const t = a.currentTime, d = dur || 0.15, v = vol || 0.15;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.start(t); o.stop(t + d + 0.03);
}
function noise(dur, vol){
  if(!soundOn) return;
  const a = audio(); if(!a) return;
  const n = Math.floor(a.sampleRate * (dur||0.1));
  const buf = a.createBuffer(1, n, a.sampleRate);
  const data = buf.getChannelData(0);
  for(let i=0;i<n;i++) data[i] = (Math.random()*2-1) * (1 - i/n);
  const src = a.createBufferSource(); src.buffer = buf;
  const g = a.createGain(); g.gain.value = vol || 0.12;
  src.connect(g); g.connect(a.destination); src.start();
}
function kickSound(){ if(!soundOn)return; beep(165,0.08,'triangle',0.28); beep(90,0.13,'sine',0.22); noise(0.05,0.08); }
function hit(v){ if(!soundOn)return; const vol=Math.min(0.26, 0.05+v*0.012); beep(230,0.05,'square',vol); }
function thud(v){ if(!soundOn)return; const vol=Math.min(0.20, 0.04+Math.abs(v)*0.008); beep(120,0.07,'sine',vol); }
function impactSound(v){ hit(v); }
function whistle(){ if(!soundOn)return; beep(2000,0.12,'square',0.12); setTimeout(()=>beep(2350,0.10,'square',0.10),95); }
function cutWhistle(){ if(!soundOn)return; beep(2100,0.42,'square',0.13); }
function goalJingle(){ if(!soundOn)return; [523,659,784,1047].forEach((f,i)=> setTimeout(()=>beep(f,0.18,'triangle',0.20), i*110)); }
/* تشویقِ تماشاگر: غرشِ نویزِ فیلترشده با اوج‌گیریِ تدریجی */
function crowdCheer(){
  if(!soundOn) return;
  const a = audio(); if(!a) return;
  try{
    const dur = 1.8;
    const n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i] = (Math.random()*2 - 1);
    const src = a.createBufferSource(); src.buffer = buf; src.loop = false;
    const hp = a.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=350;
    const bp = a.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=1100; bp.Q.value=0.5;
    const g  = a.createGain();
    const t = a.currentTime;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(0.40, t+0.30);   // اوجِ غرش
    g.gain.linearRampToValueAtTime(0.30, t+0.9);
    g.gain.exponentialRampToValueAtTime(0.0001, t+dur);
    src.connect(hp); hp.connect(bp); bp.connect(g); g.connect(a.destination);
    src.start(t); src.stop(t+dur);
    // چند «هورا»یِ کوتاه برای حسِ جمعیت
    [0,0.18,0.34].forEach((off,i)=> setTimeout(()=>beep(520+i*40,0.12,'sawtooth',0.06), off*1000));
  }catch(e){}
}
/* گل = سوت؛ و وقتی بازیکن (قرمز) گل می‌زند، تشویقِ تماشاگر هم پخش می‌شود */
function celebrate(scorer){
  if(!soundOn) return;
  whistle();
  if(scorer==='red') setTimeout(crowdCheer, 120);
}
/* صدای پایانِ مهلتِ نوبت */
function timeoutBeep(){ if(!soundOn)return; beep(300,0.12,'square',0.18); setTimeout(()=>beep(210,0.20,'square',0.18),135); }
