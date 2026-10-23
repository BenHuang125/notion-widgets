// Notion 首頁語錄框（quotes.html）的程式，分三個檔、依序載入、共用全域變數。
"use strict";
/* ───────── 畫圖：精靈（綠色變色龍，顏色跟著心情變） ───────── */
var MOOD_COL={calm:[92,150,96],happy:[150,190,70],proud:[198,168,66],curious:[62,160,150],bored:[138,142,112],sad:[92,118,150],angry:[180,72,52],sleepy:[84,110,92]};
var SLEEP_COL=[178,192,162];
function mix(a,b,k){return [0,1,2].map(function(i){return Math.round(a[i]+(b[i]-a[i])*k)})}
function rgb(c,a){return a==null?'rgb('+c.join(',')+')':'rgba('+c.join(',')+','+a+')'}
function pose(anim,t){
  var s=Math.sin,o={gait:'stand',ph:0,pitch:0,lift:s(t*1.8)*.2,raise:0,ha:1.3,curl:.75,swish:.4,eye:1,mouth:'closed',tool:null,tilt:0,sx:1,tailGlow:0};
  switch(anim){
  case'walk':o.gait='walk';o.ph=t*5.5;o.lift=Math.abs(s(t*5.5))*.4;o.pitch=s(t*2.75)*.04;o.curl=.55;break;
  case'run':o.gait='walk';o.ph=t*11;o.lift=Math.abs(s(t*11))*1.2;o.curl=.4;o.mouth='open';break;
  case'climb':o.gait='walk';o.ph=t*5;o.curl=.5;break;
  case'hammer':o.raise=1;o.ha=1.5+s(t*3)*.15;o.curl=1;o.tailGlow=1;o.pitch=-.05;break;
  case'water':o.raise=1;o.ha=2.4+s(t*4)*.2;o.tilt=-.2;o.tailGlow=.6;break;
  case'fish':o.gait='sit';o.pitch=-.35;o.raise=1;o.ha=1.4;o.tool='rod';o.curl=.9;break;
  case'read':o.gait='sit';o.pitch=-.45;o.raise=1;o.ha=1.1;o.tool='book';o.tilt=.25;break;
  case'paint':o.raise=1;o.ha=1.4+s(t*5)*.45;o.tool='brush';o.tilt=s(t*.8)*.12;o.swish=1;break;
  case'write':o.gait='sit';o.pitch=-.35;o.raise=1;o.ha=1+s(t*12)*.08;o.tool='paper';o.tilt=.3;break;
  case'tea':o.gait='sit';o.pitch=-.4;var k=Math.max(0,s(t*.9));o.raise=1;o.ha=1+k*.9;o.tool='cup';o.tilt=-k*.15;break;
  case'sleep':o.gait='curl';o.eye=0;o.curl=1.25;o.lift=s(t*1.2)*.25;o.swish=0;break;
  case'lie':o.gait='sit';o.pitch=-.55;o.tilt=-.35;o.curl=1;break;
  case'stack':o.raise=1;o.ha=.9+s(t*3)*.4;o.pitch=.12;break;
  case'flute':o.gait='sit';o.pitch=-.35;o.raise=1;o.ha=2;o.tool='flute';o.eye=.15;o.tilt=s(t*1.5)*.12;break;
  case'dance':o.lift=Math.abs(s(t*6))*4;o.pitch=s(t*3)*.25;o.raise=1;o.ha=2.5+s(t*6)*.4;o.curl=.6+s(t*3)*.4;o.swish=1.6;o.mouth='smile';o.tailGlow=.5;break;
  case'lookup':o.gait='sit';o.pitch=-.3;o.tilt=-.35;break;
  case'sweep':o.swish=3;o.curl=.25;o.pitch=.06;break;
  case'peek':o.gait='walk';o.ph=0;o.tilt=.3;break;
  case'wave':o.raise=1;o.ha=2.6+s(t*12)*.45;o.mouth='smile';o.tilt=.15;break;
  case'magic':o.raise=1;o.ha=2.3+s(t*5)*.1;o.lift=.5+s(t*3)*.4;o.curl=1.1;o.tailGlow=1;o.mouth='smile';break;
  case'sulk':o.gait='curl';o.curl=.3;o.swish=0;o.eye=.45;o.tilt=.3;o.pitch=.1;break;
  case'stomp':o.raise=1;o.ha=.4+Math.max(0,s(t*11))*.9;o.lift=Math.max(0,s(t*11))*1.2;o.mouth='open';o.curl=.4;o.swish=2;break;
  case'swing':o.gait='sit';o.pitch=-.3;o.mouth='smile';o.curl=1;break;
  case'stretch':o.sx=1.12;o.mouth='open';o.eye=0;o.pitch=-.12;o.curl=.2;break;
  case'spin':o.lift=Math.abs(s(t*8))*4;o.mouth='smile';break;
  case'tilt':o.tilt=s(t*3)*.35;break;
  case'shrug':o.pitch=-.1;o.lift=.8;break;
  case'rub':o.raise=1;o.ha=2.1+s(t*10)*.15;o.eye=0;break;
  case'jump':var j=Math.max(0,s(t*6));o.lift=j*7;o.pitch=-j*.25;o.mouth='smile';o.curl=.5;break}
  var m=mood();
  if(m==='sad'){o.curl=Math.min(o.curl,.35);o.eye=Math.min(o.eye,.6)}
  if(m==='sleepy')o.eye=Math.min(o.eye,.5);
  if(m==='happy'&&o.mouth==='closed')o.mouth='smile';
  if(m==='angry'&&anim==='idle'){o.mouth='open';o.pitch=-.08}
  return o}
function toWorld(x,y){var m=ctx.getTransform(),p=m.transformPoint(new DOMPoint(x,y));return {x:p.x/DPR,y:p.y/DPR}}
function legPath(hx,hy,fx,fy,kx){ctx.beginPath();ctx.moveTo(hx,hy);ctx.quadraticCurveTo(hx+kx,(hy+fy)/2-.5,fx,fy);ctx.stroke();
  ctx.beginPath();ctx.moveTo(fx-.9,fy);ctx.lineTo(fx+.9,fy);ctx.stroke()}
function drawSpirit(x,y,s,anim){
  var t=S.t,o=pose(anim,t),f=S.face,m=mood(),col=S.col,rot=0;
  var base=rgb(col),dark=rgb(mix(col,[28,24,18],.38)),darker=rgb(mix(col,[28,24,18],.6)),light=rgb(mix(col,[255,250,236],.42));
  if(S.mode==='left'&&!S.tween){rot=-Math.PI/2;f=1}else if(S.mode==='right'&&!S.tween){rot=Math.PI/2;f=-1}
  if(!rot&&anim!=='swing'){var sh=1-Math.min(.6,o.lift/10);ctx.fillStyle='rgba(43,33,27,'+(.16*sh)+')';ctx.beginPath();ctx.ellipse(x,y+.3,9*s*sh,1.5*s,0,0,7);ctx.fill()}
  ctx.save();ctx.translate(x,y);
  if(anim==='swing'){var sw=Math.sin(t*2.2)*.5;ctx.translate(0,-34);ctx.rotate(sw);ctx.translate(0,34)}
  ctx.rotate(rot);ctx.scale(f*s,s);
  if(anim==='spin'&&S.react) ctx.scale(Math.cos(S.react.t*9),1);
  ctx.translate(0,-o.lift);
  var low=o.gait==='curl'?2.2:0;ctx.translate(0,low);
  ctx.lineCap='round';ctx.lineJoin='round';
  // 遠側的腳（暗一點）
  var feet=[[4,0],[-5,Math.PI],[4,Math.PI],[-5,0]]; // [x, 步伐相位]
  function leg(i,far){var hx=feet[i][0]+(far?1:0),hy=-7,ph=o.ph+feet[i][1],dx=0,up=0;
    if(o.gait==='walk'){dx=Math.sin(ph)*2.2;up=Math.max(0,Math.cos(ph))*1.4}
    if(o.gait==='sit'&&hx>0){dx=1.5;up=1}
    if(o.gait==='curl'){dx=hx>0?2:-2;up=-.2}
    ctx.strokeStyle=far?darker:dark;ctx.lineWidth=far?1.4:1.8;legPath(hx,hy,hx+dx,-.4-up-low+(o.gait==='curl'?0:0),hx>0?-1.6:1.6)}
  leg(2,1);leg(3,1);
  ctx.save();ctx.translate(-5,-6);ctx.rotate(o.pitch);ctx.scale(o.sx,1);ctx.translate(5,6);
  // 尾巴：捲起來的螺旋，心情好時鬆、難過時垂
  var px=-8,py=-8.6,ang=Math.PI-.35,N=15,pts=[[px,py]];
  for(var i=0;i<N;i++){var u=i/N,L=1.75*(1-u*.55);ang+=-o.curl*(.08+u*.6)+Math.sin(t*2.6+i*.45)*.045*o.swish;px+=Math.cos(ang)*L;py+=Math.sin(ang)*L;pts.push([px,py])}
  for(var q=0;q<N;q++){ctx.strokeStyle=q%4===2?dark:base;ctx.lineWidth=3.4*(1-q/N)+.7;ctx.beginPath();ctx.moveTo(pts[q][0],pts[q][1]);ctx.lineTo(pts[q+1][0],pts[q+1][1]);ctx.stroke()}
  ctx.strokeStyle='rgba(255,255,255,.45)';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]-1.4);for(var q2=1;q2<6;q2++)ctx.lineTo(pts[q2][0],pts[q2][1]-1.4*(1-q2/8));ctx.stroke();
  S.tailW=toWorld(pts[N][0],pts[N][1]);
  if(o.tailGlow){var tw=S.tailW;S._tg=o.tailGlow}else S._tg=0;
  // 身體
  function bodyP(){ctx.beginPath();ctx.moveTo(-8.6,-8.2);ctx.bezierCurveTo(-6.5,-14.6,2,-14.8,6.4,-10.6);ctx.lineTo(7.6,-8.8);ctx.lineTo(5.6,-5.4);ctx.bezierCurveTo(1,-4.1,-4,-4.2,-7.4,-5.4);ctx.closePath()}
  bodyP();ctx.fillStyle=base;ctx.fill();
  ctx.save();bodyP();ctx.clip();
  ctx.fillStyle=light;ctx.beginPath();ctx.ellipse(-.5,-4.6,8,1.9,0,0,7);ctx.fill();
  ctx.fillStyle=dark;[-5,-1,3].forEach(function(bx){ctx.beginPath();ctx.moveTo(bx-.8,-15);ctx.lineTo(bx+1.1,-15);ctx.lineTo(bx+.2,-6.8);ctx.lineTo(bx-1.2,-7.4);ctx.closePath();ctx.globalAlpha=.55;ctx.fill()});ctx.globalAlpha=1;
  ctx.fillStyle=light;[[-3,-10],[1.2,-11.6],[-6.3,-9],[4,-9.2]].forEach(function(d){ctx.beginPath();ctx.arc(d[0],d[1],.55,0,7);ctx.fill()});
  ctx.restore();
  bodyP();ctx.strokeStyle=darker;ctx.lineWidth=.55;ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(-7.4,-10.3);ctx.bezierCurveTo(-5.4,-13.9,1,-14.1,4.6,-11.8);ctx.stroke();
  ctx.fillStyle=dark;for(var c2=0;c2<5;c2++){var cx=-6+c2*2.6,cy=-13.4+Math.abs(c2-1.8)*.55;ctx.beginPath();ctx.moveTo(cx-.7,cy+.4);ctx.lineTo(cx,cy-.9);ctx.lineTo(cx+.7,cy+.4);ctx.fill()}
  // 頭（可歪頭）
  ctx.save();ctx.translate(6,-9.6);ctx.rotate(o.tilt);ctx.translate(-6,9.6);
  function headP(){ctx.beginPath();ctx.moveTo(5.2,-12.4);ctx.lineTo(8.6,-16.3);ctx.quadraticCurveTo(11,-13.6,11.8,-12.6);ctx.quadraticCurveTo(13.8,-11.2,14.4,-9.2);ctx.quadraticCurveTo(13.6,-7.2,12,-6.9);ctx.lineTo(7,-6);ctx.lineTo(5.4,-8.2);ctx.closePath()}
  headP();ctx.fillStyle=base;ctx.fill();
  ctx.save();headP();ctx.clip();ctx.fillStyle=light;ctx.beginPath();ctx.moveTo(6,-6);ctx.lineTo(14.4,-9.2);ctx.lineTo(14.4,-5);ctx.lineTo(6,-5);ctx.fill();ctx.restore();
  headP();ctx.strokeStyle=darker;ctx.lineWidth=.55;ctx.stroke();
  ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(5.6,-12.6);ctx.lineTo(8.6,-16.1);ctx.stroke();
  ctx.strokeStyle=dark;ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(8.6,-16.1);ctx.quadraticCurveTo(8.4,-13.6,7.2,-12.2);ctx.stroke();
  // 嘴
  ctx.strokeStyle=darker;ctx.lineWidth=.6;ctx.beginPath();
  if(o.mouth==='open'){ctx.moveTo(14.2,-9);ctx.lineTo(10.4,-8.5);ctx.lineTo(13.4,-7.4);ctx.fillStyle='#B5525C';ctx.fill();ctx.stroke()}
  else if(o.mouth==='smile'){ctx.moveTo(14.2,-9.1);ctx.quadraticCurveTo(12,-7.9,10.2,-8.9);ctx.stroke()}
  else{ctx.moveTo(14.2,-9.1);ctx.lineTo(10.4,-8.6);ctx.stroke()}
  // 眼睛：轉來轉去的砲塔眼
  ctx.fillStyle=light;ctx.beginPath();ctx.arc(10,-11,2.7,0,7);ctx.fill();
  ctx.strokeStyle=dark;ctx.lineWidth=.45;for(var r=0;r<6;r++){var a=r/6*Math.PI*2;ctx.beginPath();ctx.moveTo(10+Math.cos(a)*1.4,-11+Math.sin(a)*1.4);ctx.lineTo(10+Math.cos(a)*2.6,-11+Math.sin(a)*2.6);ctx.stroke()}
  ctx.beginPath();ctx.arc(10,-11,2.7,0,7);ctx.strokeStyle=darker;ctx.lineWidth=.5;ctx.stroke();
  var ey=S.blink<0?0:o.eye,ex2=10+S.eye.x*f*1.1,ey2=-11+S.eye.y*1.1;
  if(ey>.1){ctx.save();ctx.beginPath();ctx.arc(10,-11,2.3,0,7);ctx.clip();
    ctx.fillStyle='#1F1813';ctx.beginPath();ctx.arc(ex2,ey2,1.05,0,7);ctx.fill();ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.arc(ex2-.35,ey2-.4,.32,0,7);ctx.fill();
    if(ey<1){ctx.fillStyle=base;ctx.fillRect(7,-14,6,3*(1-ey)+.4)}
    if(m==='angry'){ctx.fillStyle=dark;ctx.beginPath();ctx.moveTo(7.5,-13.8);ctx.lineTo(12.5,-12.6);ctx.lineTo(12.5,-14);ctx.fill()}
    ctx.restore()}
  else{ctx.strokeStyle=darker;ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(8.2,-10.8);ctx.quadraticCurveTo(10,-10,11.8,-10.8);ctx.stroke()}
  if(m==='happy'||m==='proud'){ctx.fillStyle='rgba(214,120,110,.35)';ctx.beginPath();ctx.ellipse(11.6,-7.9,1.2,.6,0,0,7);ctx.fill()}
  S.mouthW=toWorld(14.2,-9);S.headW=toWorld(8.6,-16.5);
  ctx.restore(); // head
  // 近側的腳；舉起來的前腳當作手
  leg(1,0);
  var hand=null;
  if(o.raise){var hx=4,hy=-7,a=o.ha,k1={x:hx+Math.sin(a)*3.6,y:hy+Math.cos(a)*3.6},h2={x:k1.x+Math.sin(a+.5)*3.4,y:k1.y+Math.cos(a+.5)*3.4};
    ctx.strokeStyle=dark;ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(hx,hy);ctx.lineTo(k1.x,k1.y);ctx.lineTo(h2.x,h2.y);ctx.stroke();
    ctx.beginPath();ctx.arc(h2.x,h2.y,.9,0,7);ctx.fillStyle=dark;ctx.fill();hand=h2}
  else leg(0,0);
  ctx.restore(); // pitch
  if(hand){ctx.save();ctx.translate(-5,-6);ctx.rotate(o.pitch);ctx.scale(o.sx,1);ctx.translate(5,6);drawTool(o.tool,hand,1,t);S.handW=toWorld(hand.x,hand.y);ctx.restore()}
  else S.handW=S.mouthW;
  if(isRain(clock.now())&&S.mode==='top'&&anim!=='sleep'&&anim!=='lie'){ctx.save();ctx.translate(-2,-20);ctx.fillStyle=C.leaf;ctx.beginPath();ctx.ellipse(0,0,12,4.2,0,Math.PI,0);ctx.fill();ctx.fillStyle=C.leafD;ctx.beginPath();ctx.ellipse(0,0,12,4.2,0,Math.PI*1.5,0);ctx.lineTo(0,0);ctx.fill();
    ctx.strokeStyle=dark;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-6,6,-9,11);ctx.stroke();ctx.restore()}
  ctx.restore();
  // 舌頭（抓蝴蝶）
  if(S.tongue&&S.mouthW){var tk=S.tongue.t<.15?S.tongue.t/.15:Math.max(0,1-(S.tongue.t-.15)/.2),mx=S.mouthW.x,my=S.mouthW.y,tx=mx+(S.tongue.tx-mx)*tk,ty=my+(S.tongue.ty-my)*tk;
    ctx.strokeStyle='#C2606A';ctx.lineWidth=1.1*s;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(mx,my);ctx.lineTo(tx,ty);ctx.stroke();ctx.fillStyle='#C2606A';ctx.beginPath();ctx.arc(tx,ty,1.6*s,0,7);ctx.fill()}
  // 尾巴尖的魔法光
  if(S._tg&&S.tailW){var g=ctx.createRadialGradient(S.tailW.x,S.tailW.y,0,S.tailW.x,S.tailW.y,7);g.addColorStop(0,'rgba(236,196,118,'+(.7*S._tg)+')');g.addColorStop(1,'rgba(236,196,118,0)');ctx.fillStyle=g;ctx.fillRect(S.tailW.x-7,S.tailW.y-7,14,14)}
  if(anim==='sulk'||(m==='sad'&&S.mode==='top'&&!S.hidden)){var ccx=x,ccy=y-30*s;ctx.fillStyle='rgba(120,112,104,.55)';ctx.beginPath();ctx.arc(ccx-4,ccy,4,0,7);ctx.arc(ccx+2,ccy-2,5,0,7);ctx.arc(ccx+7,ccy,3.5,0,7);ctx.fill();
    ctx.strokeStyle='rgba(134,162,168,.8)';ctx.lineWidth=1;for(var i2=0;i2<3;i2++){var dy=((t*14+i2*5)%9);ctx.beginPath();ctx.moveTo(ccx-3+i2*4,ccy+4+dy);ctx.lineTo(ccx-3.6+i2*4,ccy+6+dy);ctx.stroke()}}}

/* ───────── 魔法光點 ───────── */
var sparks=[];
function sparkle(x,y,n,sp,up,life){for(var i=0;i<n;i++){var a=Math.random()*Math.PI*2,v=Math.random()*(sp||14);
  sparks.push({x:x,y:y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(up||0),t:0,life:(life||.9)*rnd(.6,1.2),r:rnd(.7,1.6),star:Math.random()<.35})}}
function ring(x,y,n){for(var i=0;i<n;i++){var a=i/n*Math.PI*2;sparks.push({x:x,y:y,vx:Math.cos(a)*30,vy:Math.sin(a)*30,t:0,life:.6,r:1.2,star:i%3===0})}}
function updSparks(dt){sparks.forEach(function(p){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy=p.vy*.96+4*dt});sparks=sparks.filter(function(p){return p.t<p.life})}
function drawSparks(){sparks.forEach(function(p){var k=1-p.t/p.life,tw=.6+.4*Math.sin(p.t*30+p.x);ctx.globalAlpha=k*tw;
  var g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*3.2);g.addColorStop(0,'rgba(236,196,118,.9)');g.addColorStop(1,'rgba(236,196,118,0)');ctx.fillStyle=g;ctx.fillRect(p.x-p.r*3.2,p.y-p.r*3.2,p.r*6.4,p.r*6.4);
  ctx.fillStyle='#C99A45';if(p.star){ctx.beginPath();var r=p.r*2;ctx.moveTo(p.x,p.y-r);ctx.lineTo(p.x+r*.25,p.y);ctx.lineTo(p.x,p.y+r);ctx.lineTo(p.x-r*.25,p.y);ctx.closePath();ctx.moveTo(p.x-r,p.y);ctx.lineTo(p.x,p.y+r*.25);ctx.lineTo(p.x+r,p.y);ctx.lineTo(p.x,p.y-r*.25);ctx.fill()}
  else{ctx.beginPath();ctx.arc(p.x,p.y,p.r*.6,0,7);ctx.fill()}});ctx.globalAlpha=1}
function beam(ax,ay,bx,by){ctx.save();ctx.strokeStyle='rgba(201,154,69,.75)';ctx.lineWidth=1;ctx.setLineDash([1.5,3]);ctx.lineDashOffset=-S.t*24;
  ctx.beginPath();ctx.moveTo(ax,ay);ctx.quadraticCurveTo((ax+bx)/2,Math.min(ay,by)-16,bx,by);ctx.stroke();ctx.restore()}
function drawMagicFX(){if(S.phase!=='do'||!S.act||!S.handW||S.hidden)return;var h=S.handW,an=S.anim;
  if(an==='hammer'&&S.data.tgt!=null){var tx=S.data.tgt,ty=G.fy-16;beam(h.x,h.y,tx,ty);
    for(var i=0;i<2;i++){var a=S.t*1.6+i*Math.PI,px=tx+Math.cos(a)*9,py=ty-4+Math.sin(a*1.3)*4;ctx.save();ctx.translate(px,py);ctx.rotate(a*.7);ctx.fillStyle=i?C.woodL:C.wood;ctx.fillRect(-4,-.8,8,1.6);ctx.restore()}}
  if(an==='water'&&S.data.tgt!=null){var cx=S.data.tgt,cy=G.fy-30;ctx.fillStyle='rgba(205,212,214,.9)';ctx.beginPath();ctx.arc(cx-4,cy,3.5,0,7);ctx.arc(cx+1,cy-2,4.5,0,7);ctx.arc(cx+6,cy,3.2,0,7);ctx.fill();
    ctx.strokeStyle='rgba(134,162,168,.85)';ctx.lineWidth=.9;for(var r=0;r<4;r++){var dy=((S.t*22+r*6)%20);ctx.beginPath();ctx.moveTo(cx-4+r*3,cy+4+dy);ctx.lineTo(cx-4.4+r*3,cy+6.5+dy);ctx.stroke()}beam(h.x,h.y,cx,cy+2)}
  if(an==='magic'&&S.data.letter&&S.data.letter.isConnected){var L=letterX(S.data.letter);beam(h.x,h.y,L.x,L.y+4)}}
function drawTool(tool,h,f,t){if(!tool||!h)return;ctx.save();ctx.translate(h.x,h.y);ctx.lineCap='round';
  switch(tool){
  case'hammer':ctx.rotate(-.6*f+Math.sin(t*14)*.6*f);ctx.strokeStyle=C.woodL;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(0,-6);ctx.stroke();ctx.fillStyle=C.stoneD;ctx.fillRect(-2.2,-8,4.4,2.4);break;
  case'can':ctx.fillStyle=C.stoneD;ctx.fillRect(-1+f,-1,5*f,4);ctx.strokeStyle=C.stoneD;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(4*f,0);ctx.lineTo(7.5*f,-2);ctx.stroke();
    ctx.fillStyle=C.water;for(var i=0;i<3;i++){var k=(t*3+i/3)%1;ctx.fillRect(8*f+k*2*f,-1+k*10,1,1.5)}break;
  case'rod':ctx.strokeStyle=C.woodL;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(16*f,-12);ctx.stroke();
    ctx.strokeStyle='rgba(90,70,50,.5)';ctx.lineWidth=.5;var by=16+Math.sin(t*3)*.8+(S.data.got&&S.actT-S.data.bite<.8?4:0);ctx.beginPath();ctx.moveTo(16*f,-12);ctx.lineTo(22*f,by-6);ctx.stroke();
    ctx.fillStyle='#7A3036';ctx.beginPath();ctx.arc(22*f,by-6,1.3,0,7);ctx.fill();break;
  case'book':ctx.fillStyle='#7A3036';ctx.fillRect(-3*f-2,-3,5,4);ctx.fillStyle=C.ivH;ctx.fillRect(-3*f-1.5,-2.6,4,.8);break;
  case'brush':ctx.strokeStyle=C.woodL;ctx.lineWidth=.9;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(3*f,-4);ctx.stroke();break;
  case'paper':ctx.fillStyle=C.ivH;ctx.fillRect(-1,-1,5*f,3);break;
  case'cup':ctx.fillStyle=C.ivH;ctx.fillRect(-1.5,-3,3,3);ctx.strokeStyle='rgba(180,160,140,.6)';ctx.lineWidth=.7;
    for(var j=0;j<2;j++){var k2=(t*.8+j*.5)%1;ctx.beginPath();ctx.moveTo(j*1.4-.6,-4-k2*6);ctx.quadraticCurveTo(j*1.4+1,-6-k2*6,j*1.4-.6,-8-k2*6);ctx.globalAlpha=1-k2;ctx.stroke()}ctx.globalAlpha=1;break;
  case'flute':ctx.strokeStyle=C.woodL;ctx.lineWidth=1.3;ctx.beginPath();ctx.moveTo(-1*f,-2);ctx.lineTo(7*f,-1);ctx.stroke();break;
  case'broom':ctx.strokeStyle=C.woodL;ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(3*f,8);ctx.stroke();ctx.fillStyle=C.gold;ctx.beginPath();ctx.moveTo(1*f,8);ctx.lineTo(6*f,10.5);ctx.lineTo(1*f,10.5);ctx.fill();break}
  ctx.restore()}

