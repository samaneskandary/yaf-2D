"use strict";

/* ---------- ریاضیاتِ سه‌بعدی برای چرخش واقعی توپ ---------- */
function v3add(a,b){return[a[0]+b[0],a[1]+b[1],a[2]+b[2]]}
function v3sub(a,b){return[a[0]-b[0],a[1]-b[1],a[2]-b[2]]}
function v3scale(a,s){return[a[0]*s,a[1]*s,a[2]*s]}
function v3dot(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]}
function v3cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]}
function v3norm(a){const l=Math.hypot(a[0],a[1],a[2]);return l>0?[a[0]/l,a[1]/l,a[2]/l]:[0,0,0]}

function quatMultiply(q1, q2) {
  return [
    q1[0]*q2[0] - q1[1]*q2[1] - q1[2]*q2[2] - q1[3]*q2[3],
    q1[0]*q2[1] + q1[1]*q2[0] + q1[2]*q2[3] - q1[3]*q2[2],
    q1[0]*q2[2] - q1[1]*q2[3] + q1[2]*q2[0] + q1[3]*q2[1],
    q1[0]*q2[3] + q1[1]*q2[2] - q1[2]*q2[1] + q1[3]*q2[0]
  ];
}
function quatFromAxisAngle(axis, angle) {
  const ha = angle / 2, s = Math.sin(ha);
  return [Math.cos(ha), axis[0]*s, axis[1]*s, axis[2]*s];
}
function rotatePointByQuat(p, q) {
  const pQ = [0, p[0], p[1], p[2]];
  const qConj = [q[0], -q[1], -q[2], -q[3]];
  let res = quatMultiply(quatMultiply(q, pQ), qConj);
  return [res[1], res[2], res[3]];
}

/* ---------- هندسه سه‌بعدی کامل توپ (۱۲ پنتاگون سراسری) ---------- */
const BALL_3D_PENTS = [];
const BALL_3D_LINES = [];
(function() {
    const phi = (1 + Math.sqrt(5)) / 2;
    const centers = [
      [0, 1, phi], [0, -1, phi], [0, 1, -phi], [0, -1, -phi],
      [1, phi, 0], [-1, phi, 0], [1, -phi, 0], [-1, -phi, 0],
      [phi, 0, 1], [-phi, 0, 1], [phi, 0, -1], [-phi, 0, -1]
    ];

    const R_PENT = 0.38;
    const R_LINE_END = 0.60;

    for(let i=0; i<12; i++) {
      let C = v3norm(centers[i]);

      let ref = [0, 0, 1];
      if (Math.abs(v3dot(C, ref)) > 0.99) ref = [1, 0, 0];

      let up = v3sub(ref, v3scale(C, v3dot(ref, C)));
      up = v3norm(up);
      let right = v3norm(v3cross(C, up));

      const vertices = [];
      const lineDirs = [];

      for (let k=0; k<5; k++) {
        const alpha = k * 2 * Math.PI / 5;
        const dir = v3add(v3scale(up, Math.cos(alpha)), v3scale(right, Math.sin(alpha)));
        lineDirs.push(v3norm(dir));

        const vx = C[0]*Math.cos(R_PENT) + dir[0]*Math.sin(R_PENT);
        const vy = C[1]*Math.cos(R_PENT) + dir[1]*Math.sin(R_PENT);
        const vz = C[2]*Math.cos(R_PENT) + dir[2]*Math.sin(R_PENT);
        vertices.push([vx, vy, vz]);
      }

      BALL_3D_PENTS.push({center: C, vertices: vertices});

      for (let k=0; k<5; k++) {
        const d = lineDirs[k];
        const s = [
          C[0]*Math.cos(R_PENT) + d[0]*Math.sin(R_PENT),
          C[1]*Math.cos(R_PENT) + d[1]*Math.sin(R_PENT),
          C[2]*Math.cos(R_PENT) + d[2]*Math.sin(R_PENT)
        ];
        const e = [
          C[0]*Math.cos(R_LINE_END) + d[0]*Math.sin(R_LINE_END),
          C[1]*Math.cos(R_LINE_END) + d[1]*Math.sin(R_LINE_END),
          C[2]*Math.cos(R_LINE_END) + d[2]*Math.sin(R_LINE_END)
        ];
        BALL_3D_LINES.push({start: s, end: e});
      }
    }
})();

/* ---------- رندر ---------- */
function draw(){
  const w=cv.clientWidth, h=cv.clientHeight;
  ctx.clearRect(0,0,w,h);
  ctx.save();
  ctx.translate(view.ox, view.oy);
  ctx.scale(view.scale, view.scale);

  drawPitch();
  for(const mp of pieces){ drawPiece(mp); }
  if(ball){ drawBall(ball); }

  drawGoalOcclusion();
  for(const p of posts){ softShadow(p.x,p.y,p.r); disc(p.x,p.y,p.r,'#f4f4f4','#bdbdbd'); }

  if(sel && drag){
    const dx=sel.x-drag.x, dy=sel.y-drag.y;
    const pull=Math.min(Math.hypot(dx,dy),MAX_PULL);
    if(pull>4){
      const dir=norm(dx,dy), len=40+(pull/MAX_PULL)*150;
      const ex=sel.x+dir.x*len, ey=sel.y+dir.y*len;
      const t=pull/MAX_PULL;
      const col = `rgb(${Math.round(120+135*t)},${Math.round(220-150*t)},90)`;
      ctx.strokeStyle=col; ctx.lineWidth=8; ctx.lineCap='round';
      ctx.setLineDash([16,12]);
      ctx.beginPath(); ctx.moveTo(sel.x,sel.y); ctx.lineTo(ex,ey); ctx.stroke();
      ctx.setLineDash([]);
      const a=Math.atan2(dir.y,dir.x);
      ctx.fillStyle=col; ctx.beginPath();
      ctx.moveTo(ex,ey);
      ctx.lineTo(ex-18*Math.cos(a-0.4), ey-18*Math.sin(a-0.4));
      ctx.lineTo(ex-18*Math.cos(a+0.4), ey-18*Math.sin(a+0.4));
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,.9)'; ctx.lineWidth=4;
      ctx.beginPath(); ctx.arc(sel.x,sel.y,sel.r+6,0,7); ctx.stroke();
    }
  }
  ctx.restore();
}
function disc(x,y,r,fill,edge){
  ctx.beginPath(); ctx.arc(x,y,r,0,7);
  const g=ctx.createRadialGradient(x-r*0.3,y-r*0.4,r*0.2, x,y,r);
  g.addColorStop(0,fill); g.addColorStop(1,edge);
  ctx.fillStyle=g; ctx.fill();
  ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,.25)'; ctx.stroke();
  ctx.beginPath(); ctx.arc(x,y-r*0.05,r,0,7);
  ctx.lineWidth=2; ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.stroke();
}

/* ---------- نورپردازی: دو منبعِ فرضی در چپ و راستِ زمین، وسطِ طول ---------- */
function lightSources(){
  const ly = (WALL.t + WALL.b) / 2;
  return [ {x: WALL.l, y: ly}, {x: WALL.r, y: ly} ];
}
/* سایه‌ی نرم اما واضح‌تر و بزرگ‌تر — مطابقِ هر دو منبعِ نور */
function softShadow(x,y,r,strength){
  strength = strength||1;
  for(const L of lightSources()){
    let dx=x-L.x, dy=y-L.y, d=Math.hypot(dx,dy)||1;
    const nx=dx/d, ny=dy/d;
    const off = r*0.62;
    const sx=x+nx*off, sy=y+ny*off;
    const ang=Math.atan2(ny,nx);
    const g=ctx.createRadialGradient(sx,sy,r*0.20, sx,sy,r*1.55);
    g.addColorStop(0,'rgba(0,0,0,'+(0.26*strength)+')');
    g.addColorStop(.65,'rgba(0,0,0,'+(0.13*strength)+')');
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.ellipse(sx, sy, r*1.55, r*1.08, ang, 0, 7); ctx.fill();
  }
}
function drawPiece(mp){
  const x=mp.x, y=mp.y, r=mp.r;
  softShadow(x,y,r,1.35);
  if(mp.rot===undefined) mp.rot=0;
  const sp=Math.hypot(mp.vx||0, mp.vy||0);
  mp.rot += sp*0.03;
  const flag = (mp.team==='red') ? playerFlag : opponentFlag;
  ctx.save();
  ctx.translate(x,y); ctx.rotate(mp.rot); ctx.translate(-x,-y);
  ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.clip();
  paintFlag(ctx, x, y, r, flag);
  ctx.restore();
  ctx.save();
  ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.clip();
  const g=ctx.createRadialGradient(x-r*0.35,y-r*0.42,r*0.1, x,y,r);
  g.addColorStop(0,'rgba(255,255,255,.40)'); g.addColorStop(.5,'rgba(255,255,255,0)'); g.addColorStop(1,'rgba(0,0,0,.20)');
  ctx.fillStyle=g; ctx.fillRect(x-r,y-r,2*r,2*r);
  ctx.restore();
  ctx.lineWidth=3; ctx.strokeStyle='rgba(0,0,0,.35)';
  ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.stroke();
}

/* ---------- پرچم‌ها: رسمِ سراسری برای مهره‌ها و سواچ‌ها ---------- */
function _starPath(g,cx,cy,R,rot){
  g.beginPath();
  for(let i=0;i<5;i++){
    const ao = rot - Math.PI/2 + i*2*Math.PI/5;
    const ai = ao + Math.PI/5;
    const ox=cx+Math.cos(ao)*R, oy=cy+Math.sin(ao)*R;
    if(i===0) g.moveTo(ox,oy); else g.lineTo(ox,oy);
    g.lineTo(cx+Math.cos(ai)*R*0.5, cy+Math.sin(ai)*R*0.5);
  }
  g.closePath();
}
function _crescentStar(g,cx,cy,R,mark,field){
  g.fillStyle=mark; g.beginPath(); g.arc(cx,cy,R,0,7); g.fill();
  g.fillStyle=field; g.beginPath(); g.arc(cx+R*0.30,cy,R*0.82,0,7); g.fill();
  g.fillStyle=mark; _starPath(g, cx+R*1.02, cy, R*0.42, 0.30); g.fill();
}
function paintFlag(g,x,y,r,flag){
  const left=x-r, top=y-r, S=2*r, cx=x, cy=y;
  const F=(typeof FLAGS!=='undefined'&&FLAGS[flag])?FLAGS[flag]:{type:'hstripe',cols:['#141414','#dd0000','#ffce00']};
  switch(F.type){
    case 'hstripe':{
      const n=F.cols.length;
      for(let i=0;i<n;i++){ g.fillStyle=F.cols[i]; g.fillRect(left, top+S*i/n, S, S/n+1); }
      break;
    }
    case 'vstripe':{
      const n=F.cols.length;
      for(let i=0;i<n;i++){ g.fillStyle=F.cols[i]; g.fillRect(left+S*i/n, top, S/n+1, S); }
      if(F.star){ g.fillStyle=F.star; _starPath(g,cx,cy,r*0.30,0); g.fill(); }
      break;
    }
    case 'cross':{
      g.fillStyle=F.field; g.fillRect(left,top,S,S);
      const bh=r*0.28, offX=-r*0.16;
      g.fillStyle=F.cross;
      g.fillRect(left, cy-bh, S, 2*bh);
      g.fillRect(cx+offX-bh, top, 2*bh, S);
      break;
    }
    case 'crescent':{
      g.fillStyle=F.field; g.fillRect(left,top,S,S);
      let markCx=cx;
      if(F.hoist){
        const hw=S*(F.hoistW||0.28);
        g.fillStyle=F.hoist; g.fillRect(left,top,hw,S);
        markCx = left+hw+(S-hw)/2;       // مرکزِ هلال در ناحیه‌ی رنگی
      }
      _crescentStar(g, markCx, cy, r*0.46, F.mark, F.field);
      break;
    }
    case 'starfield':{
      g.fillStyle=F.field; g.fillRect(left,top,S,S);
      g.fillStyle=F.star; _starPath(g,cx,cy, r*(F.starR||0.42), 0); g.fill();
      break;
    }
    case 'saltire':{   // جامائیکا
      const TL=[left,top],TR=[left+S,top],BR=[left+S,top+S],BL=[left,top+S],C=[cx,cy];
      const tri=(p,q,rr,col)=>{ g.fillStyle=col; g.beginPath(); g.moveTo(p[0],p[1]); g.lineTo(q[0],q[1]); g.lineTo(rr[0],rr[1]); g.closePath(); g.fill(); };
      tri(TL,TR,C,F.a); tri(BL,BR,C,F.a);     // بالا/پایین
      tri(TL,BL,C,F.b); tri(TR,BR,C,F.b);     // چپ/راست
      g.strokeStyle=F.cross; g.lineWidth=S*0.16; g.lineCap='butt';
      g.beginPath(); g.moveTo(left,top); g.lineTo(left+S,top+S); g.moveTo(left+S,top); g.lineTo(left,top+S); g.stroke();
      break;
    }
    case 'southafrica':{
      const red='#e03c31', navy='#001489', green='#007749', white='#ffffff', black='#101820';
      g.fillStyle=red;  g.fillRect(left,top,S,S/2+0.5);
      g.fillStyle=navy; g.fillRect(left,cy,S,S/2+0.5);
      // گُوِهٔ سیاهِ کنارِ میله
      g.fillStyle=black; g.beginPath(); g.moveTo(left,top); g.lineTo(left,top+S); g.lineTo(cx,cy); g.closePath(); g.fill();
      // پالِ Y: سفیدِ ضخیم سپس سبز روی آن (حاشیه‌ی سفید)
      const pall=(wd,col)=>{
        g.strokeStyle=col; g.lineWidth=wd; g.lineCap='butt'; g.lineJoin='round';
        g.beginPath();
        g.moveTo(left, top);   g.lineTo(cx,cy);
        g.moveTo(left, top+S); g.lineTo(cx,cy);
        g.moveTo(cx,cy);       g.lineTo(left+S, cy);
        g.stroke();
      };
      pall(S*0.30, white);
      pall(S*0.18, green);
      break;
    }
    case 'brazil':{
      g.fillStyle='#009c3b'; g.fillRect(left,top,S,S);
      const ins=S*0.12;
      g.fillStyle='#ffdf00'; g.beginPath();
      g.moveTo(cx, top+ins); g.lineTo(left+S-ins, cy); g.lineTo(cx, top+S-ins); g.lineTo(left+ins, cy); g.closePath(); g.fill();
      g.save();
      g.fillStyle='#002776'; g.beginPath(); g.arc(cx,cy, r*0.34, 0,7); g.fill();
      g.beginPath(); g.arc(cx,cy, r*0.34,0,7); g.clip();
      g.save(); g.translate(cx,cy); g.rotate(-0.32);
      g.fillStyle='#ffffff'; g.fillRect(-r*0.5, -r*0.045, r, r*0.09);
      g.restore();
      g.fillStyle='#ffffff';
      [[-0.12,-0.13],[0.13,-0.06],[-0.04,0.15],[0.10,0.17],[0.0,0.02]].forEach(p=>{ g.beginPath(); g.arc(cx+p[0]*r, cy+p[1]*r, r*0.024,0,7); g.fill(); });
      g.restore();
      break;
    }
    default:{
      g.fillStyle='#888'; g.fillRect(left,top,S,S);
    }
  }
}
function drawFlagSwatch(canvas, flag){
  const g=canvas.getContext('2d');
  const dpr=Math.min(window.devicePixelRatio||1, 2);
  g.setTransform(dpr,0,0,dpr,0,0);
  const w=canvas.width/dpr, cx=w/2, cy=w/2, r=w/2-3;
  g.clearRect(0,0,w,w);
  g.save();
  g.beginPath(); g.arc(cx,cy,r,0,7); g.clip();
  paintFlag(g,cx,cy,r,flag);
  const sh=g.createRadialGradient(cx-r*0.35,cy-r*0.42,r*0.1, cx,cy,r);
  sh.addColorStop(0,'rgba(255,255,255,.35)'); sh.addColorStop(.5,'rgba(255,255,255,0)'); sh.addColorStop(1,'rgba(0,0,0,.18)');
  g.fillStyle=sh; g.fillRect(cx-r,cy-r,2*r,2*r);
  g.restore();
  g.lineWidth=2.5; g.strokeStyle='rgba(0,0,0,.30)';
  g.beginPath(); g.arc(cx,cy,r,0,7); g.stroke();
}
function drawBall(b){
  const x=b.x, y=b.y, r=b.r;
  const sp=Math.hypot(b.vx,b.vy);
  if(sp>1.5){
    const ux=-b.vx/sp, uy=-b.vy/sp, len=Math.min(sp*1.6, r*2.6);
    const tx=x+ux*len, ty=y+uy*len;
    const tg=ctx.createLinearGradient(x,y,tx,ty);
    tg.addColorStop(0,'rgba(255,255,255,.40)'); tg.addColorStop(1,'rgba(255,255,255,0)');
    ctx.strokeStyle=tg; ctx.lineWidth=r*1.5; ctx.lineCap='round';
    ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(tx,ty); ctx.stroke();
  }
  softShadow(x,y,r);
  ctx.save();
  ctx.beginPath(); ctx.arc(x,y,r,0,7);
  const g=ctx.createRadialGradient(x-r*0.3,y-r*0.35,r*0.15, x,y,r);
  g.addColorStop(0,'#ffffff'); g.addColorStop(1,'#dde3e7');
  ctx.fillStyle=g; ctx.fill();
  ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.clip();

  if(!b.quat) b.quat = [1, 0, 0, 0];
  if(sp > 0.1) {
    const ax = -b.vy / sp;
    const ay = b.vx / sp;
    const angle = sp * 0.045;
    const dq = quatFromAxisAngle([ax, ay, 0], angle);
    b.quat = quatMultiply(dq, b.quat);
    const len = Math.hypot(b.quat[0], b.quat[1], b.quat[2], b.quat[3]);
    b.quat[0]/=len; b.quat[1]/=len; b.quat[2]/=len; b.quat[3]/=len;
  }

  ctx.fillStyle = '#16181c';
  for (const pent of BALL_3D_PENTS) {
    const rc = rotatePointByQuat(pent.center, b.quat);
    if (rc[2] > 0) {
      ctx.beginPath();
      for (let i=0; i<5; i++) {
        const rv = rotatePointByQuat(pent.vertices[i], b.quat);
        const px = x + rv[0] * r;
        const py = y + rv[1] * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.strokeStyle = 'rgba(40,44,50,.5)';
  ctx.lineWidth = 1.6;
  for (const line of BALL_3D_LINES) {
    const rs = rotatePointByQuat(line.start, b.quat);
    const re = rotatePointByQuat(line.end, b.quat);
    if (rs[2] > 0 && re[2] > 0) {
      ctx.beginPath();
      ctx.moveTo(x + rs[0] * r, y + rs[1] * r);
      ctx.lineTo(x + re[0] * r, y + re[1] * r);
      ctx.stroke();
    }
  }

  ctx.restore();
  ctx.lineWidth=2; ctx.strokeStyle='rgba(0,0,0,.28)';
  ctx.beginPath(); ctx.arc(x,y,r,0,7); ctx.stroke();
  ctx.fillStyle='rgba(255,255,255,.35)';
  ctx.beginPath(); ctx.ellipse(x-r*0.35,y-r*0.4,r*0.26,r*0.16,-0.6,0,7); ctx.fill();
}
function shade(hex,f){
  const n=parseInt(hex.slice(1),16);
  let r=(n>>16)&255, g=(n>>8)&255, b=n&255;
  r=Math.max(0,Math.min(255,Math.round(r*f)));
  g=Math.max(0,Math.min(255,Math.round(g*f)));
  b=Math.max(0,Math.min(255,Math.round(b*f)));
  return 'rgb('+r+','+g+','+b+')';
}
function mulberry32(a){
  return function(){
    a|=0; a=a+0x6D2B79F5|0;
    let t=Math.imul(a^a>>>15, 1|a);
    t=t+Math.imul(t^t>>>7, 61|t)^t;
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
function paintRowTexture(g,x,y,w,h,row,lv){
  const rnd=mulberry32(lv*9173 + row*131 + 7);
  if(lv===1){
    const n=Math.floor(w*h*(0.011+0.006*rnd()));
    for(let k=0;k<n;k++){
      const px=x+rnd()*w, py=y+rnd()*h, a=0.04+rnd()*0.10;
      g.fillStyle = rnd()<0.5 ? 'rgba(60,38,12,'+a+')' : 'rgba(255,225,170,'+(a*0.7)+')';
      const s=0.6+rnd()*1.7; g.fillRect(px,py,s,s);
    }
    const clods=2+Math.floor(rnd()*4);
    for(let k=0;k<clods;k++){
      const px=x+rnd()*w, py=y+rnd()*h, rr=2+rnd()*4;
      g.fillStyle='rgba(40,24,8,'+(0.06+rnd()*0.06)+')';
      g.beginPath(); g.ellipse(px,py,rr,rr*0.7,rnd()*3,0,7); g.fill();
    }
  }else{
    const dens=0.014+rnd()*0.010;
    const n=Math.floor(w*h*dens);
    g.lineWidth=1;
    for(let k=0;k<n;k++){
      const px=x+rnd()*w, py=y+rnd()*h, len=1.5+rnd()*5.5;
      const ang=rnd()*Math.PI*2;
      const a=0.025+rnd()*0.07;
      g.strokeStyle = rnd()<0.5 ? 'rgba(255,255,255,'+a+')' : 'rgba(0,0,0,'+a+')';
      g.beginPath(); g.moveTo(px,py); g.lineTo(px+Math.cos(ang)*len, py+Math.sin(ang)*len); g.stroke();
    }
    const blobs=3+Math.floor(rnd()*4);
    for(let k=0;k<blobs;k++){
      const px=x+rnd()*w, py=y+rnd()*h, rr=8+rnd()*22;
      const bg=g.createRadialGradient(px,py,0,px,py,rr);
      const a=0.03+rnd()*0.05;
      const c = rnd()<0.5 ? '255,255,255' : '0,0,0';
      bg.addColorStop(0,'rgba('+c+','+a+')'); bg.addColorStop(1,'rgba('+c+',0)');
      g.fillStyle=bg; g.beginPath(); g.arc(px,py,rr,0,7); g.fill();
    }
  }
}
/* برفکِ ریزِ تصادفی + لکه‌های نرمِ سراسری → زمینِ طبیعی‌تر و نامنظم‌تر */
function paintGlobalNoise(g, lv){
  const rnd=mulberry32(lv*2671 + 99);
  const x0=WALL.l, y0=WALL.t, w=WALL.r-WALL.l, h=WALL.b-WALL.t;
  // برفکِ ریزِ پراکنده (محو)
  const specks=Math.floor(w*h*0.020);
  for(let k=0;k<specks;k++){
    const px=x0+rnd()*w, py=y0+rnd()*h;
    const a=0.012+rnd()*0.045;
    g.fillStyle = rnd()<0.5 ? 'rgba(255,255,255,'+a+')' : 'rgba(0,0,0,'+a+')';
    const s=0.5+rnd()*1.2; g.fillRect(px,py,s,s);
  }
  // لکه‌های بزرگِ نرم برای شکستنِ یکنواختی
  const patches=16+Math.floor(rnd()*10);
  for(let k=0;k<patches;k++){
    const px=x0+rnd()*w, py=y0+rnd()*h, rr=22+rnd()*72;
    const a=0.012+rnd()*0.028;
    const c=rnd()<0.5?'255,255,255':'0,0,0';
    const bg=g.createRadialGradient(px,py,0,px,py,rr);
    bg.addColorStop(0,'rgba('+c+','+a+')'); bg.addColorStop(1,'rgba('+c+',0)');
    g.fillStyle=bg; g.beginPath(); g.ellipse(px,py,rr,rr*(0.6+rnd()*0.5),rnd()*3,0,7); g.fill();
  }
}
let pitchCanvas=null, pitchKey='';
function buildPitchCache(){
  const key=level+'|'+FH;
  if(pitchKey===key && pitchCanvas) return pitchCanvas;
  pitchKey=key;
  const C=document.createElement('canvas');
  C.width=Math.round(FW); C.height=Math.round(FH);
  const g=C.getContext('2d');
  const tones={1:['#b98a4e','#a87a40'], 2:['#2aa85d','#239150'], 3:['#2e6f86','#27617a']};
  const [g1,g2]=tones[level]||tones[1];
  const pw=WALL.r-WALL.l, ph=WALL.b-WALL.t;
  const stripes=10, sh=ph/stripes;
  for(let i=0;i<stripes;i++){
    const base=(i%2? g1:g2), yy=WALL.t+i*sh;
    g.fillStyle=base; g.fillRect(WALL.l, yy, pw, sh+1);
    paintRowTexture(g, WALL.l, yy, pw, sh, i, level);
  }
  paintGlobalNoise(g, level);
  pitchCanvas=C;
  return C;
}
function drawPitch(){
  const back   = {1:'#241803', 2:'#0a2417', 3:'#07242a'}[level] || '#0a2417';
  const pw=WALL.r-WALL.l, ph=WALL.b-WALL.t;
  ctx.fillStyle=back; ctx.fillRect(-40,-40,FW+80,FH+80);
  ctx.drawImage(buildPitchCache(), 0, 0);

  // --- دو پروژکتورِ کناری: چپ و راستِ زمین، وسطِ طول؛ کنتراستِ واضح‌تر ---
  const ly=(WALL.t+WALL.b)/2;
  for(const L of [{x:WALL.l,y:ly},{x:WALL.r,y:ly}]){
    const lg=ctx.createRadialGradient(L.x,L.y, ph*0.02, L.x,L.y, ph*0.74);
    lg.addColorStop(0,'rgba(255,255,232,.26)');     // هستهٔ پرنورِ پروژکتور
    lg.addColorStop(.35,'rgba(255,255,232,.12)');
    lg.addColorStop(1,'rgba(255,255,232,0)');
    ctx.fillStyle=lg; ctx.fillRect(WALL.l,WALL.t,pw,ph);
  }
  // تاریکیِ مرکز و دو سرِ زمین — قوی‌تر تا توهمِ نورِ پروژکتور از دو طرف ساخته شود
  const dg=ctx.createRadialGradient(FW/2, ly, ph*0.10, FW/2, ly, ph*0.80);
  dg.addColorStop(0,'rgba(0,0,0,0)');
  dg.addColorStop(.6,'rgba(0,0,0,.12)');
  dg.addColorStop(1,'rgba(0,0,0,.30)');
  ctx.fillStyle=dg; ctx.fillRect(WALL.l,WALL.t,pw,ph);

  ctx.strokeStyle='rgba(255,255,255,.8)'; ctx.lineWidth=3;
  ctx.strokeRect(WALL.l, WALL.t, pw, ph);
  ctx.beginPath(); ctx.moveTo(WALL.l,FH/2); ctx.lineTo(WALL.r,FH/2); ctx.stroke();
  ctx.beginPath(); ctx.arc(FW/2,FH/2,70,0,7); ctx.stroke();
  ctx.beginPath(); ctx.arc(FW/2,FH/2,5,0,7); ctx.fillStyle='rgba(255,255,255,.8)'; ctx.fill();
  const bw=GOAL_W+90, bh=70;
  ctx.strokeRect(FW/2-bw/2, WALL.t, bw, bh);
  ctx.strokeRect(FW/2-bw/2, WALL.b-bh, bw, bh);
  drawGoal(WALL.t,-1); drawGoal(WALL.b,1);
}
function poly(pts,fill){
  ctx.beginPath(); pts.forEach((p,i)=> i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1]));
  ctx.closePath(); if(fill){ ctx.fillStyle=fill; ctx.fill(); }
}
function thinBar(ax,ay,bx,by,w){
  ctx.strokeStyle='#eef2f5'; ctx.lineWidth=w; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
  ctx.strokeStyle='rgba(0,0,0,.20)'; ctx.lineWidth=Math.max(1,w*0.5);
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
}
function groundEdge(ax,ay,bx,by){
  ctx.strokeStyle='rgba(255,255,255,.26)'; ctx.lineWidth=1.5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
}
/* ---------- تورِ یک صفحه با قابلیت تعیین رنگ خطوط ---------- */
function netPanel(p0,p1,p2,p3, nu, nv, lineColor){
  const lerp=(a,b,t)=>[a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t];
  ctx.strokeStyle=lineColor; ctx.lineWidth=1; ctx.lineCap='butt';
  for(let i=0;i<=nu;i++){
    const t=i/nu, a=lerp(p0,p1,t), b=lerp(p3,p2,t);
    ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke();
  }
  for(let j=0;j<=nv;j++){
    const t=j/nv, a=lerp(p0,p3,t), b=lerp(p1,p2,t);
    ctx.beginPath(); ctx.moveTo(a[0],a[1]); ctx.lineTo(b[0],b[1]); ctx.stroke();
  }
}
function tubeBar(ax,ay,bx,by,w){
  const dx=bx-ax, dy=by-ay, len=Math.hypot(dx,dy)||1;
  const px=-dy/len, py=dx/len, hw=w/2;
  const mx=(ax+bx)/2, my=(ay+by)/2;
  const g=ctx.createLinearGradient(mx-px*hw,my-py*hw, mx+px*hw,my+py*hw);
  g.addColorStop(0.00,'#8f99a1'); g.addColorStop(0.28,'#ffffff');
  g.addColorStop(0.52,'#e9eef2'); g.addColorStop(1.00,'#79838b');
  ctx.lineCap='round';
  ctx.strokeStyle='rgba(0,0,0,.32)'; ctx.lineWidth=w+1.6;
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
  ctx.strokeStyle=g; ctx.lineWidth=w;
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.85)'; ctx.lineWidth=Math.max(1,w*0.24);
  ctx.beginPath();
  ctx.moveTo(ax+px*hw*0.4, ay+py*hw*0.4);
  ctx.lineTo(bx+px*hw*0.4, by+py*hw*0.4); ctx.stroke();
}
/* میله‌ی اوریب: خطِ صاف و تمیز (بدون گرادیانِ پله‌پله)، خاکستریِ روشن، هم‌ضخامتِ تیرهای جلو */
function diagBar(ax,ay,bx,by,w){
  ctx.lineCap='round'; ctx.lineJoin='round';
  ctx.strokeStyle='rgba(0,0,0,.30)'; ctx.lineWidth=w+1.4;
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
  ctx.strokeStyle='#cbd0d5'; ctx.lineWidth=w;          // خاکستریِ روشن (کمی تیره‌تر از سفیدِ جلو)
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.42)'; ctx.lineWidth=Math.max(1,w*0.22);
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
}
function solidEdge(ax,ay,bx,by,w){
  ctx.lineCap='round';
  ctx.strokeStyle='rgba(0,0,0,.30)'; ctx.lineWidth=w+1.4;
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
  ctx.strokeStyle='#ffffff'; ctx.lineWidth=w;
  ctx.beginPath(); ctx.moveTo(ax,ay); ctx.lineTo(bx,by); ctx.stroke();
}
/* دروازه = جعبه‌ی توهمِ سه‌بعدی با تورهای تیمی */
function drawGoal(yLine, dir){
  const d=GOAL_DEPTH, H=GOAL_H, pin=14;
  const yB  = yLine + dir*d;
  const yT  = yB    + dir*H;
  const yFT = yLine + dir*H;
  const xL=GX1, xR=GX2, xbL=GX1+pin, xbR=GX2-pin;
  ctx.save();
  ctx.fillStyle='rgba(0,0,0,.12)';
  ctx.beginPath(); ctx.ellipse((xL+xR)/2, yLine - dir*4, GOAL_W*0.5, 9, 0,0,7); ctx.fill();

  // رنگ‌بندی متفاوت برای دیواره پشت بر اساس تیم (پایین قرمز، بالا آبی)
  const isRedGoal = dir === 1;
  const backFillColor = isRedGoal ? 'rgba(100,20,20,.07)' : 'rgba(20,20,100,.07)';
  poly([[xbL,yB],[xbR,yB],[xbR,yT],[xbL,yT]], backFillColor);

  poly([[xL,yFT],[xR,yFT],[xbR,yT],[xbL,yT]], 'rgba(6,16,11,.12)');

  const FTL=[xL,yFT],  FTR=[xR,yFT];
  const BTL=[xbL,yT],  BTR=[xbR,yT];
  const BBL=[xbL,yB],  BBR=[xbR,yB];
  const FBL=[xL,yLine],FBR=[xR,yLine];

  // سقف: سفیدِ پررنگ‌تر
  netPanel(FTL, FTR, BTR, BTL, 8, 3, 'rgba(255,255,255,0.20)');

  // دیواره پشت: خطوط رنگیِ تیمی (قرمز / آبی) — پررنگ‌تر
  const backNetColor = isRedGoal ? 'rgba(255,80,80,0.32)' : 'rgba(90,150,255,0.32)';
  netPanel(BTL, BTR, BBR, BBL, 8, 3, backNetColor);

  // دیواره‌های کناری: سفیدِ پررنگ‌تر
  netPanel(FTL, BTL, BBL, FBL, 3, 3, 'rgba(255,255,255,0.26)');
  netPanel(FTR, BTR, BBR, FBR, 3, 3, 'rgba(255,255,255,0.26)');

  groundEdge(xL,yLine,xR,yLine);
  diagBar(xL,yLine,xbL,yB,5.2);
  diagBar(xR,yLine,xbR,yB,5.2);

  tubeBar(xbL,yB,xbL,yT,3.0);
  tubeBar(xbR,yB,xbR,yT,3.0);
  // دو میله‌ی اوریبِ بالا: صاف، خاکستریِ روشن، هم‌ضخامتِ تیرهای عمودیِ جلو (۵٫۲)
  diagBar(xL,yFT,xbL,yT,5.2);
  diagBar(xR,yFT,xbR,yT,5.2);
  tubeBar(xL,yLine,xL,yFT,5.2);
  tubeBar(xR,yLine,xR,yFT,5.2);
  tubeBar(xL,yFT,xR,yFT,5.6);

  solidEdge(xbL,yT,xbR,yT,3.2);
  ctx.restore();
}

function drawGoalOcclusion(){
  const objs = ball ? pieces.concat([ball]) : pieces;
  const topObjs=[], botObjs=[];
  for(const o of objs){
    if(o.x>GX1-o.r && o.x<GX2+o.r){
      if(o.y - o.r < WALL.t) topObjs.push(o);
      if(o.y + o.r > WALL.b) botObjs.push(o);
    }
  }
  if(topObjs.length) drawGoalFront(WALL.t,-1, topObjs);
  if(botObjs.length) drawGoalFront(WALL.b, 1, botObjs);
}
function drawGoalFront(yLine, dir, objs){
  const H=GOAL_H, d=GOAL_DEPTH, pin=14;
  const yFT=yLine+dir*H, yB=yLine+dir*d, yT=yB+dir*H;
  const xL=GX1, xR=GX2, xbL=GX1+pin, xbR=GX2-pin;
  ctx.save();

  if(objs && objs.length){
    ctx.save();
    ctx.beginPath();
    for(const o of objs){
      ctx.moveTo(o.x + o.r, o.y);
      ctx.arc(o.x, o.y, o.r, 0, 7);
    }
    ctx.clip();

    ctx.beginPath();
    if(dir<0){
      ctx.rect(xL, yLine-(H+d)-4, xR-xL, (H+d)+4);
    }else{
      ctx.rect(xL, yLine, xR-xL, (H+d)+4);
    }
    ctx.clip();

    ctx.fillStyle='rgba(6,16,11,.34)';
    for(const o of objs){
      ctx.fillRect(o.x-o.r, o.y-o.r, o.r*2, o.r*2);
    }
    // فقط سایه روی مهره/توپ می‌افتد؛ طرحِ تورِ دروازه روی آن کشیده نمی‌شود

    ctx.restore();
  }

  tubeBar(xL,yLine,xL,yFT,5.2);
  tubeBar(xR,yLine,xR,yFT,5.2);
  tubeBar(xL,yFT,xR,yFT,5.6);
  ctx.restore();
}
