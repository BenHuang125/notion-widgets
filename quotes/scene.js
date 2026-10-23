// Notion 首頁語錄框（quotes.html）的程式，分三個檔、依序載入、共用全域變數。
"use strict";
/* ───────── 畫圖：畫框（博物館畫框剖面：深色外緣、圓弧木線、平面胡桃木、金色內線、內階） ───────── */
function hex2rgb(h){return [1,3,5].map(function(i){return parseInt(h.substr(i,2),16)})}
function shade(h,k){var c=hex2rgb(h);return 'rgb('+c.map(function(v){return Math.round(clamp(k>1?v+(255-v)*(k-1):v*k,0,255))}).join(',')+')'}
var PROFILE=[[0,'#3A2619'],[.1,'#4A3122'],[.13,'#6A4A33'],[.27,'#A07A57'],[.42,'#5E4029'],[.46,'#704E36'],[.78,'#5F422E'],[.8,'#A98450'],[.85,'#E6C88F'],[.9,'#B48D55'],[.92,'#2B1C12'],[1,'#3A281B']];
function drawFrame(){var x=G.fx,y=G.fy,w=G.fw,h=G.fh,t=FT;
  // 外陰影
  ctx.save();ctx.shadowColor='rgba(55,35,20,.30)';ctx.shadowBlur=14;ctx.shadowOffsetX=2;ctx.shadowOffsetY=5;ctx.fillStyle='#4A3122';
  ctx.beginPath();ctx.rect(x,y,w,h);ctx.rect(x+t,y+t,w-2*t,h-2*t);ctx.fill('evenodd');ctx.restore();
  // 四邊：每一邊依光線（左上來）調亮暗
  var sides=[
    {k:1.12,pts:[[x,y],[x+w,y],[x+w-t,y+t],[x+t,y+t]],g:[x,y,x,y+t]},
    {k:.98,pts:[[x,y],[x+t,y+t],[x+t,y+h-t],[x,y+h]],g:[x,y,x+t,y]},
    {k:.72,pts:[[x,y+h],[x+t,y+h-t],[x+w-t,y+h-t],[x+w,y+h]],g:[x,y+h,x,y+h-t]},
    {k:.82,pts:[[x+w,y],[x+w,y+h],[x+w-t,y+h-t],[x+w-t,y+t]],g:[x+w,y,x+w-t,y]}];
  sides.forEach(function(sd){var gr=ctx.createLinearGradient(sd.g[0],sd.g[1],sd.g[2],sd.g[3]);
    PROFILE.forEach(function(p){gr.addColorStop(p[0],shade(p[1],sd.k))});
    ctx.fillStyle=gr;ctx.beginPath();sd.pts.forEach(function(p,i){i?ctx.lineTo(p[0],p[1]):ctx.moveTo(p[0],p[1])});ctx.closePath();ctx.fill()});
  // 木紋（只在平面那一段）
  ctx.save();ctx.lineWidth=.6;
  for(var i=0;i<Math.floor(w/26);i++){var gx=x+t+i*26+hash(i)*14,a=.07+hash(i+50)*.08;ctx.strokeStyle='rgba(30,18,10,'+a+')';
    ctx.beginPath();ctx.moveTo(gx,y+t*.55);ctx.bezierCurveTo(gx+8,y+t*.6,gx+14,y+t*.5,gx+22,y+t*.62);ctx.stroke();
    ctx.beginPath();ctx.moveTo(gx+5,y+h-t*.6);ctx.bezierCurveTo(gx+12,y+h-t*.66,gx+18,y+h-t*.55,gx+26,y+h-t*.64);ctx.stroke()}
  for(var j=0;j<Math.floor(h/18);j++){var gy=y+t+j*18+hash(j+9)*8;ctx.strokeStyle='rgba(30,18,10,.1)';
    ctx.beginPath();ctx.moveTo(x+t*.6,gy);ctx.lineTo(x+t*.62,gy+10);ctx.stroke();ctx.beginPath();ctx.moveTo(x+w-t*.6,gy);ctx.lineTo(x+w-t*.62,gy+10);ctx.stroke()}
  ctx.restore();
  // 圓弧木線的高光、四角斜接縫
  ctx.strokeStyle='rgba(255,236,205,.35)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(x+t*.24,y+h-t*.24);ctx.lineTo(x+t*.24,y+t*.24);ctx.lineTo(x+w-t*.24,y+t*.24);ctx.stroke();
  ctx.strokeStyle='rgba(20,10,4,.35)';ctx.lineWidth=.6;[[x,y,x+t,y+t],[x+w,y,x+w-t,y+t],[x,y+h,x+t,y+h-t],[x+w,y+h,x+w-t,y+h-t]].forEach(function(l){ctx.beginPath();ctx.moveTo(l[0],l[1]);ctx.lineTo(l[2],l[3]);ctx.stroke()});
  // 頂邊的細亮線（精靈站的地方）
  ctx.strokeStyle='rgba(255,240,215,.45)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y+.5);ctx.lineTo(x+w,y+.5);ctx.stroke();
  // 畫框投在畫面上的內陰影（左上較深）
  var ix=G.ix,iy=G.iy,iw=G.iw,ih=G.ih,gs;
  gs=ctx.createLinearGradient(0,iy,0,iy+7);gs.addColorStop(0,'rgba(20,10,4,.42)');gs.addColorStop(1,'rgba(20,10,4,0)');ctx.fillStyle=gs;ctx.fillRect(ix,iy,iw,7);
  gs=ctx.createLinearGradient(ix,0,ix+6,0);gs.addColorStop(0,'rgba(20,10,4,.32)');gs.addColorStop(1,'rgba(20,10,4,0)');ctx.fillStyle=gs;ctx.fillRect(ix,iy,6,ih);
  gs=ctx.createLinearGradient(ix+iw,0,ix+iw-3,0);gs.addColorStop(0,'rgba(20,10,4,.18)');gs.addColorStop(1,'rgba(20,10,4,0)');ctx.fillStyle=gs;ctx.fillRect(ix+iw-3,iy,3,ih);
  gs=ctx.createLinearGradient(0,iy+ih,0,iy+ih-3);gs.addColorStop(0,'rgba(20,10,4,.16)');gs.addColorStop(1,'rgba(20,10,4,0)');ctx.fillStyle=gs;ctx.fillRect(ix,iy+ih-3,iw,3);
  // 左邊的小門（通往畫裡），金色門框
  var dw=8,dx=x+(t-dw)/2,dh=15,dy=G.floor-dh,open=doorOpen>0;
  ctx.fillStyle=open?'#EADFCF':'#2E1E13';ctx.beginPath();ctx.moveTo(dx,G.floor);ctx.lineTo(dx,dy+dw/2);ctx.arc(dx+dw/2,dy+dw/2,dw/2,Math.PI,0);ctx.lineTo(dx+dw,G.floor);ctx.closePath();ctx.fill();
  if(!open){ctx.fillStyle='#5A3E2B';ctx.beginPath();ctx.moveTo(dx+1,G.floor);ctx.lineTo(dx+1,dy+dw/2);ctx.arc(dx+dw/2,dy+dw/2,dw/2-1,Math.PI,0);ctx.lineTo(dx+dw-1,G.floor);ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.25)';ctx.lineWidth=.5;ctx.beginPath();ctx.moveTo(dx+dw/2,dy+1);ctx.lineTo(dx+dw/2,G.floor);ctx.stroke();
    ctx.fillStyle='#E6C88F';ctx.beginPath();ctx.arc(dx+dw-2.3,G.floor-6,.7,0,7);ctx.fill()}
  ctx.strokeStyle='#C9A36A';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(dx,G.floor);ctx.lineTo(dx,dy+dw/2);ctx.arc(dx+dw/2,dy+dw/2,dw/2,Math.PI,0);ctx.lineTo(dx+dw,G.floor);ctx.stroke()}
/* ───────── 畫圖：世界 ───────── */
function drawSky(t){var h=hourOf(t);
  // 背景白天晚上一樣；只有太陽、月亮、雲在變
  var arcY=function(k){return 14+(1-Math.sin(k*Math.PI))*34};
  if(h>=6&&h<18.5){var k=(h-6)/12.5,sx=lerp(G.fx+30,G.fx+G.fw-30,k),sy=arcY(k),warm=Math.max(0,1-Math.min(k,1-k)*6);
    var halo=ctx.createRadialGradient(sx,sy,0,sx,sy,22);halo.addColorStop(0,'rgba(240,200,120,.35)');halo.addColorStop(1,'rgba(240,200,120,0)');ctx.fillStyle=halo;ctx.fillRect(sx-22,sy-22,44,44);
    ctx.fillStyle=warm>0?'rgb(236,'+Math.round(196-warm*40)+','+Math.round(118-warm*30)+')':'#ECC476';ctx.beginPath();ctx.arc(sx,sy,6.5,0,7);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=.8;ctx.beginPath();ctx.arc(sx,sy,5.4,3.4,4.6);ctx.stroke()}
  else{var hh=h>=18.5?h-18.5:h+5.5,k2=hh/11.5,mx=lerp(G.fx+30,G.fx+G.fw-30,k2),my=arcY(k2);
    var ph=((t-EPOCH)/(29.53*24*HOUR)+.45)%1; // 月相
    ctx.fillStyle='#E7DCC4';ctx.beginPath();ctx.arc(mx,my,6,0,7);ctx.fill();
    ctx.fillStyle='#FFFFFF';ctx.beginPath();ctx.arc(mx+(ph-.5)*16,my-1,5.6,0,7);ctx.fill();
    ctx.strokeStyle='rgba(180,160,130,.5)';ctx.lineWidth=.5;ctx.beginPath();ctx.arc(mx,my,6,0,7);ctx.stroke()}
  // 雲：早晚帶一點暖色
  var dusk=(h>16.5&&h<19)||(h>5&&h<7.5);
  ctx.save();ctx.globalAlpha=.6;
  for(var c=0;c<3;c++){var cx=((S.t*(3+c)+hash(c+9)*W*1.3)%(W+160))-80,cy=12+c*13;ctx.fillStyle=dusk?(c===1?'#F1DCCB':'#F4E6D8'):(c===1?'#EFE7DB':'#F3EDE4');
    ctx.beginPath();ctx.ellipse(cx,cy,26,6,0,0,7);ctx.ellipse(cx+12,cy-4,14,6,0,0,7);ctx.fill()}
  ctx.restore();
  if(isRain(t)){ctx.strokeStyle='rgba(134,162,168,.55)';ctx.lineWidth=1;drops.forEach(function(d){ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x-1.2,d.y+6);ctx.stroke()})}}
function drawTree(x,g,autumnMix){if(g<=0)return;var y=G.fy;
  if(g<.15){ctx.strokeStyle=C.leafD;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y-3-g*30);ctx.stroke();ctx.fillStyle=C.leaf;ctx.beginPath();ctx.ellipse(x+2,y-3-g*30,2.5,1.2,-.4,0,7);ctx.fill();
    ctx.fillStyle=C.soil;ctx.beginPath();ctx.ellipse(x,y,5,1.5,0,Math.PI,0);ctx.fill();return}
  var hgt=14+g*36,tw=1.6+g*3.4;
  ctx.fillStyle=C.wood;ctx.beginPath();ctx.moveTo(x-tw,y);ctx.lineTo(x-tw*.5,y-hgt);ctx.lineTo(x+tw*.5,y-hgt);ctx.lineTo(x+tw,y);ctx.fill();
  ctx.fillStyle=C.woodD;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+tw*.5,y-hgt);ctx.lineTo(x+tw,y);ctx.fill();
  var r=6+g*13,sw=Math.sin(S.t*.8+x)*.8;
  [[0,-hgt-r*.25,r],[-r*.7,-hgt+r*.35,r*.72],[r*.75,-hgt+r*.3,r*.68]].forEach(function(b,i){var cx=x+b[0]+sw,cy=y+b[1],rr=b[2];
    var col=autumnMix>hash(i+x)?C.autumn:C.leaf,cold=autumnMix>hash(i+x)?'#A06E35':C.leafD;
    ctx.fillStyle=col;ctx.beginPath();for(var k=0;k<6;k++){var a=k/6*Math.PI*2-Math.PI/2;ctx.lineTo(cx+Math.cos(a)*rr,cy+Math.sin(a)*rr)}ctx.fill();
    ctx.fillStyle=cold;ctx.beginPath();ctx.moveTo(cx,cy);for(var k2=0;k2<=3;k2++){var a2=k2/6*Math.PI*2-Math.PI/2+Math.PI/3*0;a2=(-Math.PI/2)+(k2+0)*Math.PI/3;ctx.lineTo(cx+Math.cos(a2)*rr,cy+Math.sin(a2)*rr)}ctx.closePath();ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=.6;ctx.beginPath();ctx.moveTo(cx-rr*.86,cy-rr*.5);ctx.lineTo(cx,cy-rr);ctx.stroke()})}
function drawHouse(w,t){var p=prog(w,'house');if(p<=0)return;var x=X(SLOT.house),y=G.fy,bw=34,sd=9,wh=24,col=C.roofs[(Math.ceil(w.cycle/2))%C.roofs.length];
  ctx.save();if(houseShake>0)ctx.translate(Math.sin(houseShake*60)*1.2,0);
  var bx=x-bw/2;
  // 地基
  ctx.fillStyle=C.stone;ctx.fillRect(bx-2,y-3,(bw+sd+4)*Math.min(1,p/.2),3);
  if(p>=.2){var ph=Math.min(1,(p-.2)/.2)*wh;ctx.fillStyle=C.woodL;[bx,bx+bw-2,bx+bw+sd-2].forEach(function(px){ctx.fillRect(px,y-3-ph,2,ph)})}
  if(p>=.4){var wf=Math.min(1,(p-.4)/.25),wy=y-3-wh*wf;
    ctx.fillStyle='#EFE5D3';ctx.fillRect(bx,wy,bw,wh*wf);
    ctx.fillStyle='#CDB99C';ctx.beginPath();ctx.moveTo(bx+bw,y-3);ctx.lineTo(bx+bw+sd,y-3-4);ctx.lineTo(bx+bw+sd,wy-4);ctx.lineTo(bx+bw,wy);ctx.fill();
    ctx.strokeStyle='rgba(120,95,70,.2)';ctx.lineWidth=.6;for(var i=1;i<5;i++){var ly=y-3-i*5;if(ly>wy){ctx.beginPath();ctx.moveTo(bx,ly);ctx.lineTo(bx+bw,ly);ctx.stroke()}}
    ctx.strokeStyle='#FFFFFF';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(bx+.5,y-3);ctx.lineTo(bx+.5,wy);ctx.stroke()}
  if(p>=.65){var rf=Math.min(1,(p-.65)/.2),top=y-3-wh,peak=top-16;
    ctx.globalAlpha=rf;ctx.fillStyle=col[0];ctx.beginPath();ctx.moveTo(bx-4,top+1);ctx.lineTo(x,peak);ctx.lineTo(bx+bw+4,top+1);ctx.fill();
    ctx.fillStyle=col[1];ctx.beginPath();ctx.moveTo(x,peak);ctx.lineTo(x+sd,peak-4);ctx.lineTo(bx+bw+sd+3,top-3);ctx.lineTo(bx+bw+4,top+1);ctx.fill();
    ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(bx-4,top+1);ctx.lineTo(x,peak);ctx.stroke();ctx.globalAlpha=1;
    var cp=prog(w,'chimney');if(cp>0){var chx=bx+bw-7,cht=6+10*cp;ctx.fillStyle=C.stoneD;ctx.fillRect(chx,top-cht+1,5,cht);ctx.fillStyle=C.stone;ctx.fillRect(chx-1,top-cht,7,2);
      var hh=hourOf(t);if(cp>=1&&(hh>17||hh<9||S.actKey==='tea')){for(var s2=0;s2<3;s2++){var k=(S.t*.35+s2/3)%1;ctx.fillStyle='rgba(200,190,178,'+(.5*(1-k))+')';ctx.beginPath();ctx.arc(chx+2.5+Math.sin(k*5)*3,top-cht-3-k*16,2+k*3,0,7);ctx.fill()}}}}
  if(p>=.85){var df=(p-.85)/.15;ctx.fillStyle=C.woodD;ctx.globalAlpha=Math.min(1,df*2);ctx.beginPath();ctx.moveTo(x-4,y-3);ctx.lineTo(x-4,y-14);ctx.arc(x,y-14,4,Math.PI,0);ctx.lineTo(x+4,y-3);ctx.fill();
    var lit=darkness(t)>.3&&(hourOf(t)<23||S.hidden);ctx.fillStyle=lit?'#F2CF84':'#5A6A70';ctx.globalAlpha=Math.min(1,Math.max(0,df*2-1));
    ctx.fillRect(bx+bw-11,y-19,6,6);ctx.fillStyle=lit?'#F2CF84':'#5A6A70';ctx.fillRect(bx+4,y-19,6,6);ctx.globalAlpha=1;
    if(lit){var gr=ctx.createRadialGradient(bx+bw-8,y-16,0,bx+bw-8,y-16,18);gr.addColorStop(0,'rgba(242,207,132,.35)');gr.addColorStop(1,'rgba(242,207,132,0)');ctx.fillStyle=gr;ctx.fillRect(bx+bw-26,y-34,36,36)}}
  if(w.active==='house'||w.active==='chimney'||w.active==='repaint'){ctx.fillStyle=C.woodL;for(var j=0;j<3;j++)ctx.fillRect(bx-24,y-2-j*2.2,14,1.8)} // 木料堆
  ctx.restore();
  if(S.hidden&&S.actKey==='nap'){var zt=S.t%3;ctx.fillStyle='rgba(110,90,70,'+(1-zt/3)+')';ctx.font='600 9px Newsreader,Georgia,serif';ctx.fillText('z',bx+bw-6+zt*4,y-26-zt*7);if(zt>1)ctx.fillText('z',bx+bw-2+(zt-1)*4,y-30-(zt-1)*7)}}
function drawGarden(w){var p=prog(w,'garden');if(p<=0)return;var x=X(SLOT.garden),y=G.fy,len=46;
  ctx.fillStyle=C.soil;ctx.beginPath();ctx.moveTo(x-len/2,y);ctx.quadraticCurveTo(x,y-5,x+len/2,y);ctx.fill();
  var fl=C.flowers[Math.floor(w.cycle/2)%C.flowers.length],n=Math.floor(p*9);
  for(var i=0;i<n;i++){var fx=x-len/2+5+i*4.6,hgt=6+hash(i+3)*6,sw=Math.sin(S.t*1.4+i)*.8;ctx.strokeStyle=C.leafD;ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(fx,y-2);ctx.lineTo(fx+sw,y-2-hgt);ctx.stroke();
    ctx.fillStyle=fl[i%3];ctx.beginPath();ctx.arc(fx+sw,y-2-hgt,1.9,0,7);ctx.fill();ctx.fillStyle='rgba(255,255,255,.6)';ctx.fillRect(fx+sw-.6,y-3-hgt,1,1)}
  var fp=prog(w,'fence');if(fp>0){var m=Math.floor(fp*14);for(var j=0;j<m;j++){var px=x-len/2-8+j*(len+16)/13;ctx.fillStyle=j%2?'#E6DCCB':C.iv;ctx.fillRect(px,y-9,2,9);ctx.fillStyle=C.ivS;ctx.fillRect(px+1.2,y-9,.8,9)}
    if(m>1){ctx.fillStyle=C.ivS;ctx.fillRect(x-len/2-8,y-6.5,Math.min(m,13)*(len+16)/13,1)}}}
function drawPond(w){var p=prog(w,'pond');if(p<=0)return;var x=X(SLOT.pond),y=G.fy;
  ctx.fillStyle=C.stoneD;ctx.beginPath();ctx.moveTo(x-26,y);ctx.lineTo(x-22,y-9);ctx.lineTo(x+22,y-9);ctx.lineTo(x+26,y);ctx.fill();
  ctx.fillStyle=C.stone;ctx.beginPath();ctx.moveTo(x-26,y);ctx.lineTo(x-22,y-9);ctx.lineTo(x-14,y-9);ctx.lineTo(x-18,y);ctx.fill();
  ctx.fillStyle=C.water;ctx.globalAlpha=Math.min(1,p*1.3);ctx.beginPath();ctx.ellipse(x,y-9,21,3.2,0,0,7);ctx.fill();ctx.fillStyle=C.waterD;ctx.beginPath();ctx.ellipse(x+4,y-8.6,15,2,0,0,Math.PI);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.7)';ctx.lineWidth=.7;var rp=(S.t*.6)%1;ctx.globalAlpha=(1-rp)*Math.min(1,p);ctx.beginPath();ctx.ellipse(x+6,y-9,3+rp*8,.7+rp*1.4,0,0,7);ctx.stroke();ctx.globalAlpha=1;
  if(p>=1&&Math.sin(S.t*.5)>.96){ctx.fillStyle='#C9973F';ctx.beginPath();ctx.ellipse(x-6,y-9.5,2.4,1,0,0,7);ctx.fill()}}
function drawProps(w,t){var y=G.fy;
  // 鞦韆
  if(prog(w,'swing')>0){var sx=X(SLOT.swing)+8,top=y-34,sp=prog(w,'swing'),a=S.actKey==='swing'&&S.phase==='do'?Math.sin(S.t*2.2)*.5:0;
    ctx.strokeStyle=C.woodL;ctx.lineWidth=1.6;ctx.beginPath();ctx.moveTo(X(SLOT.tree1)+2,top);ctx.lineTo(sx+10,top);ctx.stroke();
    ctx.save();ctx.translate(sx,top);ctx.rotate(a);ctx.globalAlpha=sp;ctx.strokeStyle='rgba(120,95,70,.8)';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(-4,0);ctx.lineTo(-4,30);ctx.moveTo(4,0);ctx.lineTo(4,30);ctx.stroke();ctx.fillStyle=C.wood;ctx.fillRect(-6,30,12,2);ctx.restore();ctx.globalAlpha=1}
  // 長椅
  var bp=prog(w,'bench');if(bp>0){var bx=X(SLOT.bench);ctx.globalAlpha=Math.min(1,bp*1.5);ctx.fillStyle=C.woodL;ctx.fillRect(bx-13,y-6,26*Math.min(1,bp*1.2),2.2);ctx.fillStyle=C.woodD;ctx.fillRect(bx-11,y-4,1.6,4);ctx.fillRect(bx+9.5,y-4,1.6,4);
    if(bp>.6){ctx.fillStyle=C.wood;ctx.fillRect(bx-13,y-12,26,1.8);ctx.fillRect(bx-11,y-12,1.4,6);ctx.fillRect(bx+9.6,y-12,1.4,6)}ctx.globalAlpha=1}
  // 畫架（它自己的）
  var ex=X(SLOT.easel);ctx.strokeStyle=C.woodL;ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(ex-5,y);ctx.lineTo(ex,y-22);ctx.lineTo(ex+5,y);ctx.moveTo(ex,y-22);ctx.lineTo(ex+1,y);ctx.stroke();
  ctx.fillStyle=C.ivH;ctx.fillRect(ex-7,y-21,14,11);ctx.strokeStyle='rgba(120,95,70,.35)';ctx.lineWidth=.5;ctx.strokeRect(ex-7,y-21,14,11);
  var dots=Math.floor(hash(Math.floor(t/(6*HOUR)))*4)+2+(S.actKey==='paint'&&S.phase==='do'?Math.floor(S.actT/4):0);
  for(var i=0;i<Math.min(dots,9);i++){ctx.fillStyle=[C.leaf,'#7A3036',C.gold,C.water][i%4];ctx.beginPath();ctx.arc(ex-5+hash(i*11+dots)*10,y-19+hash(i*7+dots)*7,1.3,0,7);ctx.fill()}
  // 石頭堆
  for(var j=0;j<S.pebbles;j++){var cx=X(SLOT.cairn),r=4-j*.4;ctx.fillStyle=j%2?C.stone:C.stoneD;ctx.beginPath();ctx.ellipse(cx+(j%2?.6:-.4),y-r-j*2.9,r+1,r*.7,0,0,7);ctx.fill()}
  // 鳥屋
  var hp=prog(w,'birdhouse');if(hp>0&&prog(w,'tree2')>=1){var hx=X(SLOT.birdhouse)+3,hy=y-26;ctx.globalAlpha=hp;ctx.fillStyle='#EFE5D3';ctx.fillRect(hx,hy,7,7);ctx.fillStyle=C.roofs[0][0];ctx.beginPath();ctx.moveTo(hx-1.5,hy);ctx.lineTo(hx+3.5,hy-4);ctx.lineTo(hx+8.5,hy);ctx.fill();ctx.fillStyle=C.woodD;ctx.beginPath();ctx.arc(hx+3.5,hy+3.5,1.2,0,7);ctx.fill();ctx.globalAlpha=1}
  // 信箱
  var mp=prog(w,'mailbox');if(mp>0){var mx=X(SLOT.mailbox);ctx.fillStyle=C.woodD;ctx.fillRect(mx-.8,y-11*mp,1.6,11*mp);if(mp>.5){ctx.fillStyle='#7A3036';ctx.fillRect(mx-4,y-16,8,5);ctx.fillStyle='#5B2328';ctx.fillRect(mx+2,y-16,2,5);ctx.fillStyle=C.gold;ctx.fillRect(mx+3.4,y-19,.8,4)}}
  // 路燈
  var lp=prog(w,'lantern');if(lp>0){var lx=X(SLOT.lantern),lh=30*Math.min(1,lp*1.3);ctx.fillStyle=C.woodD;ctx.fillRect(lx-.9,y-lh,1.8,lh);
    if(lp>.7){var on=darkness(t)>.25;ctx.fillStyle=C.woodD;ctx.fillRect(lx-3.5,y-34,7,1.4);ctx.fillStyle=on?'#F2CF84':'#E6DCCB';ctx.fillRect(lx-2.6,y-32.6,5.2,5);
      if(on){var g2=ctx.createRadialGradient(lx,y-30,0,lx,y-30,26);g2.addColorStop(0,'rgba(242,207,132,.42)');g2.addColorStop(1,'rgba(242,207,132,0)');ctx.fillStyle=g2;ctx.fillRect(lx-26,y-56,52,56)}}}}
function drawParticles(){
  leaves.forEach(function(l){ctx.fillStyle=l.c;ctx.save();ctx.translate(l.x,l.y);ctx.rotate(l.land?.3:Math.sin(l.t*3));ctx.beginPath();ctx.ellipse(0,0,2.4,1.1,0,0,7);ctx.fill();ctx.restore()});
  dust.forEach(function(p){ctx.globalAlpha=1-p.t/p.life;ctx.fillStyle=p.c;ctx.fillRect(p.x,p.y,1.6,1.6)});ctx.globalAlpha=1;
  ctx.font='9px Newsreader,Georgia,serif';notes.forEach(function(p){ctx.globalAlpha=1-p.t/1.8;ctx.fillStyle=C.ivD;ctx.fillText('♪',p.x,p.y)});ctx.globalAlpha=1;
  hearts.forEach(function(p){ctx.globalAlpha=1-p.t/1.2;ctx.fillStyle='#B5525C';var x=p.x,y=p.y;ctx.beginPath();ctx.moveTo(x,y+2);ctx.bezierCurveTo(x-4,y-1,x-2,y-4,x,y-2);ctx.bezierCurveTo(x+2,y-4,x+4,y-1,x,y+2);ctx.fill()});ctx.globalAlpha=1;
  ffly.forEach(function(f){var a=.5+.5*Math.sin(f.t*3+f.ph);var g=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,4);g.addColorStop(0,'rgba(242,214,140,'+a+')');g.addColorStop(1,'rgba(242,214,140,0)');ctx.fillStyle=g;ctx.fillRect(f.x-4,f.y-4,8,8)});
  if(bfly){var fl=Math.abs(Math.sin(bfly.t*14));ctx.fillStyle='#7A3036';ctx.beginPath();ctx.ellipse(bfly.x-2*fl,bfly.y,2.6*fl+.4,1.8,0,0,7);ctx.ellipse(bfly.x+2*fl,bfly.y,2.6*fl+.4,1.8,0,0,7);ctx.fill();ctx.fillStyle=C.woodD;ctx.fillRect(bfly.x-.4,bfly.y-1.5,.8,3)}}
function drawBubble(p){var b=S.bubble;if(!b)return;var bx,by;
  if(S.hidden){bx=X(SLOT.house)+12;by=G.fy-52}else if(S.headW){bx=S.headW.x+5;by=S.headW.y-1}else{bx=p.x+9*p.s;by=p.y-26*p.s}
  var k=Math.min(1,b.t/.18),out=b.t>b.life-.3?(b.life-b.t)/.3:1,sc=(.6+.4*k)*(k<1?1:1+Math.sin(b.t*6)*.03);
  ctx.save();ctx.globalAlpha=Math.max(0,out);ctx.translate(bx,by-Math.sin(b.t*2)*1.2);ctx.scale(sc,sc);
  ctx.fillStyle='#FFFDF8';ctx.strokeStyle='rgba(110,86,62,.35)';ctx.lineWidth=.8;
  ctx.beginPath();if(ctx.roundRect)ctx.roundRect(-11,-20,22,17,8);else ctx.rect(-11,-20,22,17);ctx.fill();ctx.stroke();
  ctx.beginPath();ctx.moveTo(-5,-3.4);ctx.lineTo(-8,2);ctx.lineTo(-1,-3.4);ctx.fill();
  ctx.font='11px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#000';ctx.fillText(b.e,0,-11.2);
  ctx.restore()}
/* ───────── 發光書架（點下去打開語錄收藏，見 quotes/shelf.js） ───────── */
var shelfHover=0,shelfHoverT=0;
function shelfBox(){var k=Math.min(1,SKY/76),w=25,h=30*k,x=X(SLOT.shelf);return {x:x-w/2,y:G.fy-h,w:w,h:h}}
function onShelf(x,y){var b=shelfBox();return x>=b.x-5&&x<=b.x+b.w+5&&y>=b.y-6&&y<=G.fy+2}
function drawBookshelf(t){shelfHover+=(shelfHoverT-shelfHover)*.15;var b=shelfBox(),x=b.x,y=b.y,w=b.w,h=b.h,cx=x+w/2,pulse=.5+.5*Math.sin(S.t*1.6),glow=.6+.25*pulse+.35*shelfHover;
  // 柔和的金色光暈（滑鼠移過去會更亮）
  var r=34+8*pulse+12*shelfHover,g=ctx.createRadialGradient(cx,y+h*.5,2,cx,y+h*.5,r);
  g.addColorStop(0,'rgba(255,214,130,'+(.85*glow).toFixed(3)+')');g.addColorStop(.45,'rgba(240,195,105,'+(.38*glow).toFixed(3)+')');g.addColorStop(1,'rgba(230,190,110,0)');
  ctx.fillStyle=g;ctx.fillRect(cx-r,y+h*.5-r,2*r,2*r);
  // 櫃身：深胡桃木外框、淺一點的背板
  ctx.fillStyle='#3F2B1D';ctx.fillRect(x,y,w,h);
  ctx.fillStyle='#FFE7B0';ctx.fillRect(x+2,y+2,w-4,h-4);
  var gl=ctx.createLinearGradient(0,y,0,y+h);gl.addColorStop(0,'rgba(255,248,215,'+(.5*glow).toFixed(3)+')');gl.addColorStop(1,'rgba(255,200,110,'+(.3*glow).toFixed(3)+')');ctx.fillStyle=gl;ctx.fillRect(x+2,y+2,w-4,h-4);
  // 兩層書：書背顏色沿用畫框的點綴色（酒紅、鼠尾草綠、藍灰、赭黃）
  var cols=['#7A3036','#4D6355','#55617A','#A8793A','#6E2A30','#8E6A4B'],mid=y+h/2;
  [[y+2,mid],[mid+1,y+h-2]].forEach(function(row,ri){var top=row[0],bot=row[1],bx=x+2.5,i=0;
    while(bx<x+w-3){var bw=2+hash(ri*17+i)*1.6,bh=(bot-top)*(.62+hash(ri*31+i*7)*.34);if(bx+bw>x+w-2.5)break;
      var lean=(ri===1&&i===3)?1:0;ctx.save();ctx.translate(bx+bw/2,bot);ctx.rotate(lean*.28);
      ctx.fillStyle=cols[(i+ri*2)%cols.length];ctx.fillRect(-bw/2,-bh,bw,bh);
      ctx.fillStyle='rgba(230,200,143,.8)';ctx.fillRect(-bw/2,-bh*.72,bw,.6);ctx.restore();
      bx+=bw+.5+lean*1.2;i++}});
  ctx.fillStyle='#5E4029';ctx.fillRect(x+1,mid-.5,w-2,1.5);
  // 頂板與金邊
  ctx.fillStyle='#4A3122';ctx.fillRect(x-1.5,y-2,w+3,2.5);ctx.strokeStyle='rgba(230,200,143,.85)';ctx.lineWidth=.6;ctx.strokeRect(x+.5,y+.5,w-1,h-1);
  // 偶爾飄出的小光點
  if(Math.random()<.07+shelfHover*.12) sparkle(x+rnd(2,w-2),y+rnd(0,h*.6),1,5,9,1.2)}
function draw(){var t=clock.now(),w=worldAt(t);
  ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
  drawSky(t);
  var age1=(w.done.tree1?w.age.tree1:0),g1=w.done.tree1?Math.min(1,.45+age1/96*.55):prog(w,'tree1')*.45;
  var age2=(w.done.tree2?w.age.tree2:0),g2=w.done.tree2?Math.min(1,.45+age2/96*.55):prog(w,'tree2')*.45;
  // 嵌入框比較矮時，畫框上的東西整體壓低，不會被切掉
  var k=Math.min(1,SKY/76);ctx.save();if(k<1){ctx.translate(0,G.fy);ctx.scale(1,k);ctx.translate(0,-G.fy)}
  drawTree(X(SLOT.tree1),g1,.45);drawTree(X(SLOT.tree2),g2*.85,.25);
  drawHouse(w,t);drawGarden(w);drawPond(w);drawProps(w,t);ctx.restore();
  drawBookshelf(t);
  drawFrame();
  var p=curScr();
  if(!S.hidden){ctx.globalAlpha=S.tween&&S.tween.to.door?.55:1;drawSpirit(p.x,p.y,p.s,S.anim);ctx.globalAlpha=1}
  drawMagicFX();drawSparks();drawParticles();drawBubble(p);
}

/* ───────── 迴圈（Notion 內嵌會暫停 requestAnimationFrame，所以另外用計時器補） ───────── */
var last=performance.now();
function tick(){var now=performance.now(),dt=(now-last)/1000;if(dt<.012)return;last=now;if(document.hidden)return;dt=Math.min(dt,.1);
  try{update(dt);draw()}catch(e){console.error(e);var er=document.getElementById('err');if(er&&er.hidden){er.hidden=false;er.textContent='畫面出錯：'+(e&&e.message||e)}}}
function raf(){tick();requestAnimationFrame(raf)}
requestAnimationFrame(raf);setInterval(function(){if(performance.now()-last>90)tick()},50);
document.addEventListener('visibilitychange',function(){last=performance.now();if(document.hidden)save()});
window.addEventListener('pagehide',save);
new ResizeObserver(function(){layout()}).observe(widget);

setQuote(qi);layout();S.u=X(.5);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(fitQuote);
setInterval(nextQuote,QUOTE_MS);
if(awayH>36) setTimeout(function(){say('❤️',3)},1500);
