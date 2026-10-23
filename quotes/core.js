// Notion 首頁語錄框（quotes.html）的程式，分三個檔、依序載入、共用全域變數。
"use strict";
/* ───────── 語錄：來自書架收藏（quotes/data.js 的 QUOTES，最新的在最前面） ───────── */
var QUOTE_MS=30000;

/* ───────── 小工具 ───────── */
var HOUR=3600e3, EPOCH=Date.UTC(2026,9,22,16,0,0); // 台北 2026-10-23 00:00
function clamp(v,a,b){return v<a?a:v>b?b:v}
function lerp(a,b,t){return a+(b-a)*t}
function rnd(a,b){return a+Math.random()*(b-a)}
function pick(a){return a[Math.floor(Math.random()*a.length)]}
function hash(n){n=(n|0)^0x9e3779b9;n=Math.imul(n^(n>>>16),0x85ebca6b);n=Math.imul(n^(n>>>13),0xc2b2ae35);return ((n^(n>>>16))>>>0)/4294967296}
var store={get:function(){try{return JSON.parse(localStorage.getItem('frame-spirit.v1')||'null')}catch(e){return null}},
  set:function(o){try{localStorage.setItem('frame-spirit.v1',JSON.stringify(o))}catch(e){}}};

/* ───────── 時間（預覽可快轉） ───────── */
var clock={speed:1,simBase:Date.now(),realBase:Date.now(),
  now:function(){return this.simBase+(Date.now()-this.realBase)*this.speed},
  setSpeed:function(s){this.simBase=this.now();this.realBase=Date.now();this.speed=s},
  jump:function(t){this.simBase=t;this.realBase=Date.now()}};
function hourOf(t){var d=new Date(t);return d.getHours()+d.getMinutes()/60} // 看的人所在地的時間
function darkness(t){var h=hourOf(t);
  if(h>=19.5||h<5) return 1; if(h>=17.5) return (h-17.5)/2; if(h<6.5) return 1-(h-5)/1.5; return 0}
function isNight(t){var h=hourOf(t);return h>=22.5||h<6}
function isRain(t){var b=Math.floor((t-EPOCH)/(5*HOUR));return hash(b*7+3)<0.14}

/* ───────── 世界進度：依真實時間推算，不靠存檔 ───────── */
var PLAN=[['tree1',30],['house',44],['garden',22],['pond',26],['bench',12],['lantern',10],
  ['chimney',14],['swing',12],['tree2',30],['birdhouse',10],['mailbox',9],['fence',16]];
var PLAN_LABEL={tree1:'種第一棵樹',house:'蓋小房子',garden:'整理花園',pond:'挖小池塘',bench:'做長椅',lantern:'立路燈',
  chimney:'加煙囪',swing:'做鞦韆',tree2:'種第二棵樹',birdhouse:'釘鳥屋',mailbox:'做信箱',fence:'圍籬笆',repaint:'幫屋頂換顏色',replant:'換一批花'};
function worldAt(t){
  var h=(t-EPOCH)/HOUR, w={done:{},age:{},active:null,p:0,cycle:0,h:h}, acc=0;
  if(h<0){w.active='tree1';return w}
  for(var i=0;i<PLAN.length;i++){var id=PLAN[i][0],d=PLAN[i][1];
    if(h>=acc+d){w.done[id]=1;w.age[id]=h-acc-d}else if(h>=acc&&!w.active){w.active=id;w.p=(h-acc)/d}
    acc+=d}
  if(h>=acc){var k=Math.floor((h-acc)/14);w.cycle=k;w.active=k%2?'replant':'repaint';w.p=((h-acc)/14)%1}
  return w}
function prog(w,id){return w.done[id]?1:(w.active===id?w.p:0)}

/* ───────── 版面 ───────── */
var widget=document.getElementById('widget'),cv=document.getElementById('world'),ctx=cv.getContext('2d'),panel=document.getElementById('panel');
var W=0,H=0,DPR=1,G={};
var SKY=76,SIDE=28,BOT=12,FT=19;
function layout(){
  var r=widget.getBoundingClientRect();W=r.width;H=r.height;DPR=window.devicePixelRatio||1;SKY=Math.round(clamp(H*.32,46,76));
  cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);
  G.fx=SIDE;G.fy=SKY;G.fw=W-2*SIDE;G.fh=H-SKY-BOT;
  G.ix=G.fx+FT;G.iy=G.fy+FT;G.iw=G.fw-2*FT;G.ih=G.fh-2*FT;
  G.floor=G.iy+G.ih;
  panel.style.left=G.ix+'px';panel.style.top=G.iy+'px';panel.style.width=G.iw+'px';panel.style.height=G.ih+'px';
  fitQuote()}
function X(frac){return G.fx+G.fw*frac}
var SLOT={tree1:.055,swing:.085,house:.19,mailbox:.262,garden:.34,fence:.34,bench:.465,easel:.545,pond:.64,cairn:.715,tree2:.795,birdhouse:.795,lantern:.905,shelf:.962};
var PROJ_SLOT={tree1:'tree1',house:'house',garden:'garden',pond:'pond',bench:'bench',lantern:'lantern',chimney:'house',
  swing:'swing',tree2:'tree2',birdhouse:'tree2',mailbox:'mailbox',fence:'garden',repaint:'house',replant:'garden'};

/* ───────── 語錄字母（精靈可挪動） ───────── */
var curQuoteId=null,qTop=document.getElementById('qTop'),qBot=document.getElementById('qBot'),qi=firstQuote(),displaced=[];
function spanify(el,text){el.textContent='';
  text.split(' ').forEach(function(word,wi){
    if(wi) el.appendChild(document.createTextNode(' '));
    var wd=document.createElement('span');wd.style.whiteSpace='nowrap';
    for(var i=0;i<word.length;i++){var s=document.createElement('span');s.className='ch';s.textContent=word[i];wd.appendChild(s)}
    el.appendChild(wd)})}
function fitLine(el,max,width,min){var s=max;el.style.fontSize=s+'px';while(s>min&&el.scrollWidth>width){s-=.25;el.style.fontSize=s+'px'}return el.scrollWidth<=width}
// 每行先縮字到放得下；下半行太小（<10px）還放不下時改成最多兩行
function fitQuote(){if(!G.iw)return;var w=G.iw-68,th=G.ih*.54,bh=G.ih-th-1;
  fitLine(qTop,Math.max(9,Math.min(21,(th-8)/1.3)),w,9);
  qBot.classList.remove('wrap');var bmax=Math.max(8,Math.min(14.5,(bh-11)/1.4));
  if(!fitLine(qBot,bmax,w,Math.min(10,bmax))){qBot.classList.add('wrap');fitLine(qBot,Math.max(8,Math.min(bmax,(bh-11)/2.8)),1e9,8)}}
function quoteAt(i){return QUOTES[i]||EMPTY_QUOTE}
function setQuote(i){qi=QUOTES.length?((i%QUOTES.length)+QUOTES.length)%QUOTES.length:0;displaced=[];var q=quoteAt(qi);curQuoteId=q.id;spanify(qTop,q.h);spanify(qBot,q.b);fitQuote()}
function swapQuote(i){qTop.classList.add('fade');qBot.classList.add('fade');
  setTimeout(function(){setQuote(i);qTop.classList.remove('fade');qBot.classList.remove('fade')},750)}
// 書架有改動（這個框或同一個 Notion 的其他分頁）：有新加的語錄就馬上換上它，否則留在原本那句（被改了就換成新字）
function reloadQuotes(){var oldAt=QUOTES[0]?QUOTES[0].at:-Infinity;QUOTES=shelfLoad();
  if(QUOTES.length&&QUOTES[0].at>oldAt){shelfMarkSeen(QUOTES[0].id);swapQuote(0);return}
  var k=QUOTES.findIndex(function(q){return q.id===curQuoteId});
  if(k>=0){if(QUOTES[k].h!==qTop.textContent||QUOTES[k].b!==qBot.textContent)swapQuote(k);else qi=k}else swapQuote(qi)}
window.addEventListener('shelf-change',reloadQuotes);
window.addEventListener('storage',function(e){if(e.key===SHELF_KEY||e.key===null)reloadQuotes()});
function nextQuote(){qTop.classList.add('fade');qBot.classList.add('fade');
  setTimeout(function(){setQuote(qi+1);qTop.classList.remove('fade');qBot.classList.remove('fade');
    if(S&&!S.hidden&&Math.random()<.6) say(pick(['👀','✨','📖']))},750)}
function letterPool(){var a=[].slice.call(qTop.querySelectorAll('.ch')).concat([].slice.call(qBot.querySelectorAll('.ch')));
  return a.filter(function(s){return /[A-Za-z]/.test(s.textContent)&&displaced.indexOf(s)<0})}
function letterX(s){var r=s.getBoundingClientRect(),wr=widget.getBoundingClientRect();return {x:r.left-wr.left+r.width/2,y:r.top-wr.top+r.height/2}}

/* ───────── 配色 ───────── */
var C={iv:'#F6F0E4',ivS:'#D8C9B2',ivD:'#B49F84',ivH:'#FFFDF8',eye:'#3A2A20',
  wood:'#6B4A33',woodL:'#8E6A4B',woodD:'#3F2B1D',gold:'#C9A36A',
  roofs:[['#7A3036','#5B2328'],['#4D6355','#38493E'],['#55617A','#3F485B'],['#A8793A','#83592A']],
  leaf:'#93A68A',leafD:'#6F8668',autumn:'#C48A48',stone:'#BDB1A0',stoneD:'#988B7A',
  water:'#8BA6AB',waterD:'#6C8990',soil:'#7C5C43',flowers:[['#7A3036','#F2E8D6','#C9973F'],['#55617A','#F2E8D6','#B5647A'],['#C9973F','#7A3036','#F2E8D6']]};

/* ───────── 精靈的狀態 ───────── */
var saved=store.get()||{},nowReal=Date.now(),awayH=Math.max(0,(+saved.lastSeen>0?(nowReal-saved.lastSeen)/HOUR:0)||0);
function num(v,a,b,d){v=+v;return isFinite(v)?clamp(v,a,b):d} // 存檔壞掉或被改過也不會卡住
saved={v:num(saved.v,-1,1,null),anger:num(saved.anger,0,1,0),pebbles:Math.round(num(saved.pebbles,0,7,0)),pets:Math.round(num(saved.pets,0,1e6,0)),lastSeen:saved.lastSeen};
var S={mode:'top',u:0,face:1,act:null,actKey:null,phase:'go',path:[],actT:0,actDur:0,anim:'idle',t:0,
  tween:null,hidden:false,react:null,bubble:null,blink:2,proud:0,
  v:(saved.v==null?.2:.15+(saved.v-.15)*Math.exp(-awayH/6)),anger:(saved.anger||0)*Math.exp(-awayH),
  pebbles:saved.pebbles||0,col:[92,150,96],eye:{x:0,y:0},eyeT:{x:0,y:0},eyeTimer:0,tongue:null,pets:saved.pets||0,
  N:{energy:.3,hunger:.3,fun:.4,create:.4,social:awayH>36?.95:.25,tidy:.1,curious:.4},data:{}};
(function seedNeeds(){var h=hourOf(clock.now()),k=Math.floor(clock.now()/HOUR);
  for(var n in S.N) S.N[n]=clamp(S.N[n]+(hash(k+n.length*13)-.5)*.4,0,1);
  if(h>20) S.N.energy=.7})();
function save(){store.set({v:S.v,anger:S.anger,lastSeen:Date.now(),pebbles:S.pebbles,pets:S.pets})}

/* ───────── 心情 ───────── */
var MOOD_EMO={happy:['😊','🎵','❤️','🌼'],calm:['🙂','🍃','☕'],curious:['❓','👀','✨'],bored:['😑','💭','🥱'],
  sad:['😢','🌧️','😞'],angry:['😠','💢','😤'],sleepy:['😴','💤','😪'],proud:['😎','✨','🏠']};
var MOOD_LABEL={happy:'開心',calm:'平靜',curious:'好奇',bored:'無聊',sad:'低落',angry:'生氣',sleepy:'想睡',proud:'得意'};
function mood(){if(S.anger>.5)return'angry';if(S.N.energy>.82)return'sleepy';if(S.v<-.35)return'sad';
  if(S.proud>0)return'proud';if(S.v>.45)return'happy';if(S.N.fun>.78)return'bored';if(S.N.curious>.7)return'curious';return'calm'}
function say(e,life){S.bubble={e:e,t:0,life:life||2.6}}
function feel(dv,da){S.v=clamp(S.v+(dv||0),-1,1);S.anger=clamp(S.anger+(da||0),0,1)}

/* ───────── 位置與路線 ───────── */
function scr(p){ // 位置 → 畫面座標（腳底）
  if(p.mode==='top') return {x:p.u,y:G.fy,s:1.15};
  if(p.mode==='inside') return {x:p.u,y:G.floor,s:.76};
  if(p.mode==='left') return {x:G.fx-1,y:p.u,s:.9};
  return {x:G.fx+G.fw+1,y:p.u,s:.9}}
var ADJ={top:['left','right'],left:['top','inside'],right:['top'],inside:['left']};
function joint(a,b){var dY=G.floor;
  if(a==='top'&&b==='left') return [{mode:'top',u:G.fx+6},{mode:'left',u:G.fy+12}];
  if(a==='left'&&b==='top') return [{mode:'left',u:G.fy+12},{mode:'top',u:G.fx+6}];
  if(a==='top'&&b==='right') return [{mode:'top',u:G.fx+G.fw-6},{mode:'right',u:G.fy+12}];
  if(a==='right'&&b==='top') return [{mode:'right',u:G.fy+12},{mode:'top',u:G.fx+G.fw-6}];
  if(a==='left'&&b==='inside') return [{mode:'left',u:dY},{mode:'inside',u:G.ix+12,door:1}];
  return [{mode:'inside',u:G.ix+12},{mode:'left',u:dY,door:1}]}
function route(to){var q=[[S.mode]],seen={},seq=null;seen[S.mode]=1;
  while(q.length){var p=q.shift(),l=p[p.length-1];if(l===to.mode){seq=p;break}
    ADJ[l].forEach(function(n){if(!seen[n]){seen[n]=1;q.push(p.concat(n))}})}
  var path=[];for(var i=0;i<seq.length-1;i++) path=path.concat(joint(seq[i],seq[i+1]));
  path.push(to);return path}

/* ───────── 活動清單 ───────── */
var bfly=null,leaves=[],dust=[],notes=[],hearts=[],ffly=[],drops=[],doorOpen=0,houseShake=0,lastWorld=null;
function topX(frac,off){return {mode:'top',u:clamp(X(frac)+(off||0),G.fx+10,G.fx+G.fw-10)}}
function insideX(x){return {mode:'inside',u:clamp(x,G.ix+14,G.ix+G.iw-14)}}
var A={
 build:{l:'正在',ok:function(w,n){return w.active&&!n},at:function(w){S.data.tgt=X(SLOT[PROJ_SLOT[w.active]]);return topX(SLOT[PROJ_SLOT[w.active]],-34)},dur:[14,26],sat:{create:.65,fun:.1},cost:{energy:.12},anim:'hammer',
   end:function(){feel(.06)}},
 water:{l:'澆花澆樹',ok:function(w,n){return !n&&(prog(w,'garden')>.3||prog(w,'tree1')>.2)},at:function(w){if(prog(w,'garden')>.3&&Math.random()<.6){S.data.tgt=X(SLOT.garden);return topX(SLOT.garden,-30)}S.data.tgt=X(SLOT.tree1);return topX(SLOT.tree1,26)},dur:[8,13],sat:{tidy:.2,create:.15},anim:'water'},
 fish:{l:'釣魚',ok:function(w,n){return !n&&w.done.pond},at:function(){return topX(SLOT.pond,-34)},dur:[20,38],sat:{fun:.55,hunger:.55},anim:'fish',pref:1.35,
   start:function(){S.data.bite=rnd(6,S.actDur-4);S.data.got=null},
   tick:function(){if(!S.data.got&&S.actT>S.data.bite){var r=Math.random();S.data.got=r<.55?'fish':r<.72?'boot':'none';
     splash(X(SLOT.pond),G.fy-9);
     if(S.data.got==='fish'){say('🐟');feel(.18);setTimeout(function(){say('❤️')},1400)}
     else if(S.data.got==='boot'){say('👢');feel(-.04);setTimeout(function(){say('😑')},1400)}
     else{say('💦');feel(-.14)}}}},
 read:{l:'看書',ok:function(){return true},at:function(w){return w.done.bench?topX(SLOT.bench,0):topX(SLOT.tree1,22)},dur:[16,30],sat:{fun:.3,curious:.45},anim:'read'},
 paint:{l:'畫畫',ok:function(w,n){return !n},at:function(){return topX(SLOT.easel,-14)},dur:[14,24],sat:{create:.55,fun:.2},anim:'paint'},
 journal:{l:'寫日記',ok:function(){return true},at:function(){return topX(pick([.12,.42,.58,.86]),0)},dur:[12,20],sat:{create:.35},anim:'write'},
 tea:{l:'泡茶',ok:function(){return true},at:function(w){return w.done.bench?topX(SLOT.bench,4):topX(SLOT.house,32)},dur:[12,22],sat:{hunger:.4,energy:.15},anim:'tea',pref:1.15},
 nap:{l:'睡覺',ok:function(){return true},at:function(w){return w.done.house?topX(SLOT.house,-2):topX(SLOT.tree1,18)},dur:[26,50],sat:{energy:1},anim:'sleep',
   start:function(w){S.hidden=!!(w.done.house)}},
 stargaze:{l:'看星星',ok:function(w,n){return n&&hourOf(clock.now())<23.6&&hourOf(clock.now())>6&&!isRain(clock.now())},at:function(){return topX(rnd(.5,.75),0)},dur:[20,34],sat:{fun:.3,curious:.3},anim:'lie'},
 butterfly:{l:'追蝴蝶',ok:function(){return !!bfly},at:function(){return topX((bfly.x-G.fx)/G.fw,-10)},dur:[8,14],sat:{fun:.45,curious:.25},cost:{energy:.08},anim:'run'},
 pebbles:{l:'疊石頭',ok:function(w,n){return !n},at:function(){return topX(SLOT.cairn,-12)},dur:[10,16],sat:{create:.25,fun:.2},anim:'stack',end:function(){S.pebbles=Math.min(7,S.pebbles+1);feel(.05);save()}},
 flute:{l:'吹笛子',ok:function(){return true},at:function(){return topX(rnd(.08,.92),0)},dur:[10,18],sat:{fun:.35,social:.1},anim:'flute'},
 dance:{l:'跳舞',ok:function(){return mood()==='happy'||mood()==='proud'},at:function(){return topX(rnd(.1,.9),0)},dur:[6,10],sat:{fun:.45},cost:{energy:.08},anim:'dance'},
 clouds:{l:'看雲發呆',ok:function(w,n){return !n},at:function(){return topX(rnd(.05,.95),0)},dur:[12,22],sat:{curious:.25,energy:.1},anim:'lookup',pref:1.15},
 sweep:{l:'掃落葉',ok:function(){return leaves.filter(function(l){return l.land}).length>=3},at:function(){var l=leaves.find(function(l){return l.land});return topX((l.x-G.fx)/G.fw,-6)},dur:[8,12],sat:{tidy:.6},anim:'sweep',
   end:function(){leaves=leaves.filter(function(l){return !l.land})}},
 stroll:{l:'散步',ok:function(){return true},at:function(){return topX(rnd(.03,.97),0)},dur:[2,4],sat:{curious:.2},anim:'idle'},
 peek:{l:'爬到畫框邊',ok:function(w,n){return !n},at:function(){return {mode:'right',u:G.fy+rnd(30,G.fh-10)}},dur:[6,10],sat:{curious:.35,fun:.1},anim:'peek'},
 wander:{l:'走進畫裡散步',ok:function(w,n){return !n},at:function(){return insideX(G.ix+rnd(.15,.9)*G.iw)},dur:[4,8],sat:{curious:.35,fun:.15},anim:'idle'},
 nudge:{l:'用魔法挪字母',ok:function(w,n){return !n&&displaced.length<3},at:function(){var p=letterPool();if(!p.length)return null;S.data.letter=pick(p);return insideX(letterX(S.data.letter).x)},dur:[3,4],sat:{fun:.35,curious:.2},anim:'magic',
   tick:function(){var s=S.data.letter;if(s&&!S.data.moved&&S.actT>1.4&&s.isConnected){S.data.moved=1;displaced.push(s);
     s.style.transform='translate('+rnd(-3,3).toFixed(1)+'px,'+rnd(-5,-2).toFixed(1)+'px) rotate('+rnd(-16,16).toFixed(0)+'deg)';
     S.N.tidy+=.15;setTimeout(function(){say(pick(['😆','😏','✨']))},300)}}},
 tidy:{l:'把字母擺回去',ok:function(){return displaced.some(function(s){return s.isConnected})},at:function(){var s=displaced.find(function(s){return s.isConnected});S.data.letter=s;return insideX(letterX(s).x)},dur:[3,4],sat:{tidy:.7},anim:'magic',
   tick:function(){var s=S.data.letter;if(s&&!S.data.moved&&S.actT>1.4){S.data.moved=1;s.style.transform='';displaced=displaced.filter(function(d){return d!==s})}}},
 wave:{l:'跟你打招呼',ok:function(w,n){return !n},at:function(){return topX(rnd(.3,.7),0)},dur:[3,4],sat:{social:.7},anim:'wave',start:function(){say(pick(['👋','❤️','😊']))}},
 sulk:{l:'一個人難過',ok:function(){return S.v<-.3},at:function(){return topX(pick([.02,.97,.6]),0)},dur:[14,24],sat:{},anim:'sulk',end:function(){feel(.22)}},
 stomp:{l:'生氣跺腳',ok:function(){return S.anger>.45},at:function(){return topX(rnd(.2,.8),0)},dur:[5,8],sat:{},anim:'stomp',end:function(){feel(0,-.4)}},
 swing:{l:'盪鞦韆',ok:function(w,n){return !n&&w.done.swing},at:function(){return topX(SLOT.swing,6)},dur:[10,18],sat:{fun:.5},anim:'swing'},
 stretch:{l:'伸懶腰',ok:function(){return true},at:function(){return {mode:S.mode,u:S.u}},dur:[2.5,3.5],sat:{energy:.05},anim:'stretch'}
};
function choose(){
  var t=clock.now(),w=worldAt(t),n=isNight(t),m=mood(),best=[],k;
  if(n){k=A.stargaze.ok(w,n)&&Math.random()<.35?'stargaze':'nap';return start(k,w)}
  if(S.N.social>.85) return start('wave',w);
  for(k in A){var a=A[k];if(k==='stargaze'||!a.ok(w,n))continue;
    var sc=.04;for(var nd in a.sat) sc+=(S.N[nd]||0)*a.sat[nd];
    sc*=(a.pref||1)*rnd(.65,1.35);
    if(k===S.actKey) sc*=.25;
    if(m==='sad'&&k==='sulk') sc+=.9; if(m==='angry'&&k==='stomp') sc+=1;
    if(m==='happy'&&(k==='dance'||k==='flute')) sc*=1.6;
    if(m==='sleepy'&&k==='nap') sc+=.6;
    if(k==='build') sc+=.15; // 有工程時比較常去做
    best.push([sc,k])}
  best.sort(function(a,b){return b[0]-a[0]});
  var top=best.slice(0,3),sum=top.reduce(function(s,x){return s+x[0]},0),r=Math.random()*sum;
  for(var i=0;i<top.length;i++){r-=top[i][0];if(r<=0)return start(top[i][1],w)}
  return start(top[0][1],w)}
function start(k,w){var a=A[k],to=a.at(w);if(!to){S.actKey=k;return start('stroll',w)}
  S.act=a;S.actKey=k;S.path=route(to);S.phase='go';S.actT=0;S.actDur=rnd(a.dur[0],a.dur[1]);S.data={letter:S.data&&S.data.letter,tgt:S.data&&S.data.tgt};
  if(k==='nudge'||k==='tidy'){} else S.data.letter=null;
  if(k==='nap'&&isNight(clock.now())) S.actDur=600}
function finish(){var a=S.act;for(var nd in a.sat) S.N[nd]=clamp(S.N[nd]-a.sat[nd],0,1);
  for(var c in (a.cost||{})) S.N[c]=clamp(S.N[c]+a.cost[c],0,1);
  if(a.end) a.end();S.act=null;S.hidden=false;S.anim='idle'}

/* ───────── 點擊與摸摸 ───────── */
var clicks=[],hover=0,mouse={x:-99,y:-99,in:false};
function spiritBox(){if(S.hidden){var hx=X(SLOT.house);return {x:hx-22,y:G.fy-46,w:46,h:46}}
  var p=curScr();if(S.mode==='left'||S.mode==='right')return {x:p.x-14,y:p.y-22,w:28,h:30};return {x:p.x-17*p.s,y:p.y-21*p.s,w:34*p.s,h:23*p.s}}
function hit(x,y){var b=spiritBox();return x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h}
widget.addEventListener('pointermove',function(e){var r=widget.getBoundingClientRect();mouse.x=e.clientX-r.left;mouse.y=e.clientY-r.top;mouse.in=true});
widget.addEventListener('pointerleave',function(){mouse.in=false;hover=0});
widget.addEventListener('click',function(e){var r=widget.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;if(!hit(x,y))return;
  var now=performance.now();clicks=clicks.filter(function(c){return now-c<4000});clicks.push(now);
  if(S.hidden){houseShake=.6;say(clicks.length>2?'💢':'😴');feel(-.03,clicks.length>2?.2:0);return}
  if(clicks.length>=4){feel(-.1,.35);reactTo('angry',['😠','💢']);return}
  var m=mood(),map={happy:'spin',calm:'wave',curious:'tilt',bored:'shrug',sad:'lookup',angry:'stomp',sleepy:'rub',proud:'jump'};
  if(m==='sad') feel(.08); if(m==='calm'||m==='curious') feel(.04);
  if(m==='angry') S.face=(e.clientX-r.left)>curScr().x?-1:1;
  S.N.social=Math.max(0,S.N.social-.25);reactTo(m,MOOD_EMO[m]);save()});
function reactTo(m,emos){var rp=curScr();if(m==='happy'||m==='proud')ring(rp.x,rp.y-14,12);else sparkle(rp.x,rp.y-16,5,12,4);var map={happy:'spin',calm:'wave',curious:'tilt',bored:'shrug',sad:'lookup',angry:'stomp',sleepy:'rub',proud:'jump'};
  S.react={anim:map[m]||'jump',t:0,dur:1.4};say(pick(emos),2.2)}
function pet(){S.pets++;var hp=curScr();sparkle(hp.x,hp.y-18,4,10,6);feel(.1,-.25);S.N.social=0;say(pick(['❤️','🥰','💕']),1.8);
  var p=curScr();for(var i=0;i<3;i++) hearts.push({x:p.x+rnd(-8,8),y:p.y-28*p.s,vy:-rnd(10,18),t:0});save()}

/* ───────── 粒子 ───────── */
function splash(x,y){for(var i=0;i<7;i++) dust.push({x:x+rnd(-4,4),y:y,vx:rnd(-14,14),vy:-rnd(14,30),t:0,life:.7,c:C.water})}
function puff(x,y,c){for(var i=0;i<3;i++) dust.push({x:x,y:y,vx:rnd(-10,10),vy:-rnd(4,12),t:0,life:.6,c:c||C.ivD})}

/* ───────── 每一格更新 ───────── */
var petTimer=0,bubbleTimer=rnd(6,14),saveTimer=0;
function curScr(){var p=scr(S);if(S.tween){var k=S.tween.t/S.tween.d,a=S.tween.a,b=S.tween.b;
  return {x:lerp(a.x,b.x,k),y:lerp(a.y,b.y,k)-Math.sin(k*Math.PI)*8,s:lerp(a.s,b.s,k)}}return p}
function update(dt){
  var simT=clock.now(),w=worldAt(simT),bdt=dt*Math.min(clock.speed,3);
  S.t+=dt;
  // 需求慢慢增加
  var night=isNight(simT),rate={energy:night?.012:.0022,hunger:.003,fun:.0045,create:.0038,social:.0028,tidy:.0008,curious:.004};
  for(var n in rate) S.N[n]=clamp(S.N[n]+rate[n]*bdt,0,1);
  if(S.actKey==='nap'&&S.phase==='do') S.N.energy=clamp(S.N.energy-.02*bdt,0,1);
  S.v+=(.12-S.v)*.004*bdt; S.anger=clamp(S.anger-.012*bdt,0,1); if(S.proud>0)S.proud-=dt;
  // 工程完成 → 得意
  if(lastWorld&&lastWorld.active!==w.active&&lastWorld.active&&!S.hidden){S.proud=18;feel(.25);say(pick(['😎','✨','🎉']),3);S.react={anim:'jump',t:0,dur:1.2};var pp=curScr();ring(pp.x,pp.y-14,14)}
  lastWorld=w;
  // 白天叫醒
  if(S.actKey==='nap'&&!night&&S.actDur>500&&S.phase==='do'){S.actDur=S.actT+1}
  // 反應中
  if(S.react){S.react.t+=dt;S.anim=S.react.anim;if(S.react.t>S.react.dur)S.react=null}
  else if(S.tween){S.tween.t+=dt;S.anim=S.mode==='top'||S.mode==='inside'?'walk':'climb';
    if(S.tween.t>=S.tween.d){S.mode=S.tween.to.mode;S.u=S.tween.to.u;S.tween=null}}
  else{
    if(!S.act) choose();
    if(S.phase==='go'){
      var wp=S.path[0];
      if(!wp){S.phase='do';S.actT=0;if(S.act.start)S.act.start(w)}
      else if(wp.mode!==S.mode){var a=scr(S),b=scr(wp);S.tween={a:a,b:b,t:0,d:wp.door?.7:.35,to:wp};if(wp.door){doorOpen=1.2;sparkle(G.fx+FT/2,G.floor-8,8,16,6)}S.path.shift()}
      else{var sp=(S.mode==='top'?(S.actKey==='butterfly'?46:26):S.mode==='inside'?20:16)*(mood()==='sad'?.7:mood()==='happy'?1.2:1);
        if(S.actKey==='butterfly'&&bfly&&S.path.length===1) wp.u=clamp(bfly.x-8,G.fx+8,G.fx+G.fw-8);
        var d=wp.u-S.u;if(S.mode==='top'||S.mode==='inside'){if(Math.abs(d)>.5)S.face=d>0?1:-1}
        if(Math.abs(d)<=sp*dt){S.u=wp.u;S.path.shift()}else S.u+=Math.sign(d)*sp*dt;
        S.anim=S.mode==='top'||S.mode==='inside'?(S.actKey==='butterfly'?'run':'walk'):'climb'}}
    else{S.actT+=bdt;S.anim=S.act.anim;if(S.act.tick)S.act.tick(bdt);
      if(S.actKey==='butterfly'&&bfly){var dd=bfly.x-S.u;S.face=dd>0?1:-1;S.u+=clamp(dd,-40*dt,40*dt)}
      if(S.anim==='hammer'&&S.data.tgt!=null&&Math.random()<dt*9) sparkle(S.data.tgt+rnd(-8,8),G.fy-rnd(8,24),1,8,6);
      if((S.anim==='magic'||S.anim==='water'||S.anim==='paint')&&S.handW&&Math.random()<dt*7) sparkle(S.handW.x,S.handW.y,1,6,4,.7);
      if(S.anim==='magic'&&S.data.letter&&S.data.letter.isConnected&&Math.random()<dt*6){var LL=letterX(S.data.letter);sparkle(LL.x,LL.y,1,10,2,.7)}
      if(S.anim==='dance'&&Math.random()<dt*10){var da=S.t*5;sparkle(S.u+Math.cos(da)*12,G.fy-10+Math.sin(da)*7,1,4,3)}
      if(S._tg&&S.tailW&&Math.random()<dt*8) sparkle(S.tailW.x,S.tailW.y,1,5,5,.8);
      if(S.anim==='sweep'&&S.tailW&&Math.random()<dt*6) puff(S.tailW.x,G.fy-1,C.ivD);
      if(S.anim==='flute'&&Math.random()<dt*3&&S.handW) sparkle(S.handW.x+S.face*4,S.handW.y-4,1,5,8,1.2);
      if(S.anim==='sweep'&&Math.random()<dt*4) puff(S.u+S.face*8,G.fy-1,C.ivD);
      if((S.anim==='flute')&&Math.random()<dt*1.6) notes.push({x:S.u+S.face*9,y:G.fy-22,t:0,vx:rnd(-4,6)*S.face});
      if(S.actT>=S.actDur) finish()}}
  // 摸摸：滑鼠停在身上
  if(mouse.in&&hit(mouse.x,mouse.y)&&!S.hidden){hover+=dt;widget.classList.add('over');if(hover>.9){petTimer-=dt;if(petTimer<=0){pet();petTimer=1.6}}}
  else{hover=0;petTimer=0;widget.classList.toggle('over',mouse.in&&hit(mouse.x,mouse.y))}
  // 隨機冒泡泡
  bubbleTimer-=dt;if(bubbleTimer<=0){bubbleTimer=rnd(9,22);if(!S.bubble){var m=mood();if(!(S.hidden&&m!=='sleepy'))say(pick(MOOD_EMO[m]))}}
  if(S.bubble){S.bubble.t+=dt;if(S.bubble.t>S.bubble.life)S.bubble=null}
  var tc=(S.actKey==='nap'&&S.phase==='do')?SLEEP_COL:MOOD_COL[mood()],ck=Math.min(1,dt*1.2);S.col=[0,1,2].map(function(i){return S.col[i]+(tc[i]-S.col[i])*ck});
  S.eyeTimer-=dt;if(S.eyeTimer<=0){S.eyeTimer=rnd(.8,2.6);S.eyeT={x:rnd(-1,1),y:rnd(-.8,.8)}}
  if(mouse.in){var ep=curScr(),dxm=mouse.x-ep.x,dym=mouse.y-(ep.y-12);var dm=Math.hypot(dxm,dym);if(dm<260&&dm>1){S.eyeT={x:dxm/dm*S.face,y:dym/dm}}}
  S.eye.x+=(S.eyeT.x-S.eye.x)*Math.min(1,dt*10);S.eye.y+=(S.eyeT.y-S.eye.y)*Math.min(1,dt*10);
  if(S.tongue){S.tongue.t+=dt;if(!S.tongue.ate&&S.tongue.t>.15){S.tongue.ate=1;if(bfly){sparkle(bfly.x,bfly.y,8,16,4);bfly=null;S.N.hunger=Math.max(0,S.N.hunger-.3);feel(.15);say('😋')}}if(S.tongue.t>.4)S.tongue=null}
  if(S.actKey==='butterfly'&&S.phase==='do'&&bfly&&!S.tongue&&S.mouthW&&Math.hypot(bfly.x-S.mouthW.x,bfly.y-S.mouthW.y)<46&&Math.random()<dt*2){S.tongue={t:0,tx:bfly.x,ty:bfly.y}}
  S.blink-=dt;if(S.blink<-.13)S.blink=rnd(2.5,6);
  // 天氣與小生物
  var dk=darkness(simT),rain=isRain(simT);
  if(!bfly&&dk<.2&&!rain&&Math.random()<dt/18) bfly={x:G.fx+rnd(.1,.9)*G.fw,y:G.fy-rnd(30,55),t:0,life:rnd(18,30),vx:rnd(-10,10)};
  if(bfly){bfly.t+=dt;bfly.vx+=rnd(-30,30)*dt;bfly.vx=clamp(bfly.vx,-22,22);bfly.x=clamp(bfly.x+bfly.vx*dt,G.fx+10,G.fx+G.fw-10);
    bfly.y=G.fy-40+Math.sin(bfly.t*1.7)*16;if(bfly.t>bfly.life)bfly=null}
  var trees=[];if(prog(w,'tree1')>.25)trees.push(X(SLOT.tree1));if(prog(w,'tree2')>.6)trees.push(X(SLOT.tree2));
  if(trees.length&&Math.random()<dt/(dk>.5?40:9)&&leaves.length<14){var tx=pick(trees);leaves.push({x:tx+rnd(-14,14),y:G.fy-rnd(34,52),vx:rnd(-6,6),t:0,land:false,c:Math.random()<.6?C.autumn:C.leaf})}
  leaves.forEach(function(l){if(l.land){l.t+=dt;return}l.t+=dt;l.y+=12*dt;l.x+=Math.sin(l.t*2.4)*14*dt+l.vx*dt;if(l.y>=G.fy-1.5){l.y=G.fy-1.5;l.land=true;l.t=0}});
  leaves=leaves.filter(function(l){return !(l.land&&l.t>120)});
  if(dk>.6&&ffly.length<7&&Math.random()<dt) ffly.push({x:X(pick([.06,.34,.79]))+rnd(-25,25),y:G.fy-rnd(8,40),t:0,ph:rnd(0,6)});
  if(dk<.4) ffly=[];ffly.forEach(function(f){f.t+=dt;f.x+=Math.sin(f.t*.7+f.ph)*8*dt;f.y+=Math.cos(f.t*.9+f.ph)*6*dt});
  if(rain){for(var i=0;i<dt*60;i++) drops.push({x:rnd(0,W),y:rnd(-10,G.fy-40),t:0})}
  drops.forEach(function(d){d.t+=dt;d.y+=260*dt});drops=drops.filter(function(d){if(d.y>=G.fy){if(Math.random()<.3)dust.push({x:d.x,y:G.fy-1,vx:rnd(-8,8),vy:-rnd(6,12),t:0,life:.25,c:C.water});return false}return true});
  updSparks(dt);if(!S.hidden&&(mood()==='happy'||mood()==='proud')&&S.mode==='top'&&Math.random()<dt*1.5){var cp=curScr();sparkle(cp.x+rnd(-5,5),cp.y-2,1,4,5,.8)}
  dust.forEach(function(p){p.t+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=60*dt});dust=dust.filter(function(p){return p.t<p.life});
  notes.forEach(function(p){p.t+=dt;p.y-=12*dt;p.x+=p.vx*dt});notes=notes.filter(function(p){return p.t<1.8});
  hearts.forEach(function(p){p.t+=dt;p.y+=p.vy*dt});hearts=hearts.filter(function(p){return p.t<1.2});
  if(doorOpen>0)doorOpen-=dt;if(houseShake>0)houseShake-=dt;
  saveTimer+=dt;if(saveTimer>10){saveTimer=0;save()}
}

