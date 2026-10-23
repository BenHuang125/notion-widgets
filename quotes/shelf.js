// Notion 首頁語錄框（quotes.html）的程式，分四個檔、依序載入、共用全域變數。
// 這個檔：點畫框上的發光書架 → 在同一個框裡打開語錄收藏。
// 每一句是一組：深咖啡一行（主句）＋淺咖啡一行（說明），最新加入的排最前面；
// 新增、修改、刪除都寫回 quotes/data.js 的儲存，框上的語錄會馬上換成最新的。
"use strict";
var shelfEl=document.getElementById('shelf'),shelfList=document.getElementById('shelfList'),shelfCount=document.getElementById('shelfCount'),
  shelfToast=document.getElementById('shelfToast'),shelfEditing=null,shelfUndo=null,shelfToastTimer=0;
var ICON={edit:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M11.2 2.6l2.2 2.2-7.6 7.6-2.9.7.7-2.9z" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linejoin="round"/></svg>',
  del:'<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 4.5h9M6.5 4.5V3h3v1.5M5 4.5l.6 8.5h4.8l.6-8.5" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>'};
var MONTHS=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function shelfDate(at){var d=new Date(at);return d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear()}
function el(tag,cls,text){var e=document.createElement(tag);if(cls)e.className=cls;if(text!=null)e.textContent=text;return e}

/* ───────── 打開／關上 ───────── */
function openShelf(){if(!shelfEl.hidden)return;shelfEl.hidden=false;renderShelf();
  requestAnimationFrame(function(){shelfEl.classList.add('open')});setTimeout(function(){shelfEl.classList.add('open')},30);
  document.getElementById('shelfBack').focus({preventScroll:true})}
function closeShelf(){if(shelfEl.hidden)return;shelfEditing=null;shelfEl.classList.remove('open');setTimeout(function(){shelfEl.hidden=true},260)}
document.getElementById('shelfBack').addEventListener('click',closeShelf);
document.getElementById('shelfAdd').addEventListener('click',function(){shelfEditing='new';renderShelf()});
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&!shelfEl.hidden){if(shelfEditing){shelfEditing=null;renderShelf()}else closeShelf()}});

/* ───────── 畫框上的書架：滑過發亮、點了打開 ───────── */
function localXY(e){var r=widget.getBoundingClientRect();return {x:e.clientX-r.left,y:e.clientY-r.top}}
widget.addEventListener('pointermove',function(e){if(!shelfEl.hidden)return;var p=localXY(e),on=onShelf(p.x,p.y);shelfHoverT=on?1:0;widget.classList.toggle('shelf-over',on)});
widget.addEventListener('pointerleave',function(){shelfHoverT=0;widget.classList.remove('shelf-over')});
widget.addEventListener('click',function(e){if(!shelfEl.hidden)return;var p=localXY(e);if(!onShelf(p.x,p.y))return;
  var b=shelfBox();sparkle(b.x+b.w/2,b.y+b.h/2,10,22,6);widget.classList.remove('shelf-over');shelfHoverT=0;openShelf()});

/* ───────── 清單 ───────── */
function renderShelf(){var items=shelfLoad(),n=items.length;shelfList.textContent='';
  shelfCount.textContent=n===1?'1 quote':n+' quotes';
  if(shelfEditing==='new') shelfList.appendChild(editor(null));
  items.forEach(function(q,i){shelfList.appendChild(shelfEditing===q.id?editor(q):pair(q,n-i))});
  if(!n&&shelfEditing!=='new'){var em=el('p','shelf-empty','No quotes yet — press + to add your first one.');shelfList.appendChild(em)}
  var ed=shelfList.querySelector('form.editing');if(ed&&ed._ready)ed._ready();
  if(!shelfCanSave){var w=el('p','shelf-warn','This browser is blocking storage, so changes will be lost when the page closes.');shelfList.prepend(w)}}
function pair(q,no){var a=el('article','pair');a.dataset.id=q.id;
  var d=el('div','pd'),l=el('div','pl');
  d.appendChild(el('span','no',String(no).padStart(2,'0')));d.appendChild(el('p','ph',q.h));
  var tools=el('span','tools'),be=el('button','tool'),bd=el('button','tool');
  be.innerHTML=ICON.edit;be.title='Edit';be.setAttribute('aria-label','Edit quote');bd.innerHTML=ICON.del;bd.title='Delete';bd.setAttribute('aria-label','Delete quote');
  be.addEventListener('click',function(){shelfEditing=q.id;renderShelf()});
  bd.addEventListener('click',function(){removeQuote(q.id)});
  tools.appendChild(be);tools.appendChild(bd);d.appendChild(tools);
  l.appendChild(el('p','pb',q.b||'—'));l.appendChild(el('time','at',shelfDate(q.at)));
  a.appendChild(d);a.appendChild(l);return a}
function editor(q){var a=el('form','pair editing'),d=el('div','pd'),l=el('div','pl');
  var th=el('textarea','eh'),tb=el('textarea','eb');th.rows=1;tb.rows=1;
  th.placeholder='The quote (dark row)';tb.placeholder='What it means to you (light row)';th.value=q?q.h:'';tb.value=q?q.b:'';
  th.setAttribute('aria-label','Quote');tb.setAttribute('aria-label','Explanation');
  d.appendChild(th);l.appendChild(tb);
  var bar=el('div','ebar'),cancel=el('button','ebtn ghost','Cancel'),save=el('button','ebtn','Save');cancel.type='button';save.type='submit';
  bar.appendChild(el('span','ehint','Enter to save · Esc to cancel'));bar.appendChild(cancel);bar.appendChild(save);l.appendChild(bar);
  a.appendChild(d);a.appendChild(l);
  function grow(t){t.style.height='auto';t.style.height=t.scrollHeight+'px'}
  [th,tb].forEach(function(t){t.addEventListener('input',function(){grow(t);t.classList.remove('bad')});
    t.addEventListener('keydown',function(e){if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing){e.preventDefault();if(t===th&&!tb.value.trim())tb.focus();else a.requestSubmit()}})});
  cancel.addEventListener('click',function(){shelfEditing=null;renderShelf()});
  a.addEventListener('submit',function(e){e.preventDefault();var h=th.value.trim(),b=tb.value.trim();
    if(!h){th.classList.add('bad');th.focus();return}
    var items=shelfLoad();
    if(q){items=items.map(function(x){return x.id===q.id?{id:x.id,h:h,b:b,at:x.at}:x})}
    else items.unshift({id:shelfNewId(),h:h,b:b,at:Date.now()});
    shelfEditing=null;shelfSave(items);renderShelf();
    var first=shelfList.querySelector('.pair');if(!q&&first){first.classList.add('fresh');shelfList.scrollTop=0}});
  a._ready=function(){grow(th);grow(tb);th.focus()};return a}
function removeQuote(id){var items=shelfLoad(),gone=items.find(function(x){return x.id===id});if(!gone)return;
  shelfSave(items.filter(function(x){return x.id!==id}));renderShelf();
  shelfUndo=gone;toast('Quote deleted',function(){if(!shelfUndo)return;var cur=shelfLoad();cur.push(shelfUndo);shelfUndo=null;shelfSave(cur);renderShelf()})}
function toast(msg,undo){shelfToast.textContent='';shelfToast.appendChild(el('span',null,msg));
  if(undo){var b=el('button','undo','Undo');b.addEventListener('click',function(){undo();shelfToast.hidden=true});shelfToast.appendChild(b)}
  shelfToast.hidden=false;clearTimeout(shelfToastTimer);shelfToastTimer=setTimeout(function(){shelfToast.hidden=true;shelfUndo=null},6000)}
// 其他分頁改了收藏：收藏開著時跟著更新（正在編輯時不打斷）
window.addEventListener('storage',function(e){if((e.key===SHELF_KEY||e.key===null)&&!shelfEl.hidden&&!shelfEditing)renderShelf()});
// 收藏打開時，點擊與滑鼠不要穿過去碰到變色龍
['click','pointermove','pointerdown'].forEach(function(t){shelfEl.addEventListener(t,function(e){e.stopPropagation()})});
