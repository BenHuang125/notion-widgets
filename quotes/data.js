// Notion 首頁語錄框（quotes.html）的程式，分四個檔、依序載入、共用全域變數。
// 這個檔：書架上收藏的語錄（存在瀏覽器 localStorage `quote-shelf.v1`，不准改名）。
// 第一次打開、還沒存過時，用下面四句當起始收藏。
"use strict";
var SHELF_KEY = 'quote-shelf.v1';
var SEED_QUOTES = [
 {h:"Don't try to predict the future. Build a life that allows you to benefit from the unexpected.",
  b:"The aim isn't to get everything right, but to put yourself in a position where, even when things don't go to plan, you can still come out ahead."},
 {h:"Small failures are the price of learning. It's when you suppress them or refuse to learn from them that the real damage is done.",
  b:"Don't shy away from setbacks. Small setbacks are part of what builds resilience and protects you from being brought down by a much bigger failure later on."},
 {h:"Look for opportunities where the downside is limited but the upside is potentially unlimited.",
  b:"Before making a decision, ask yourself: what's the most I could lose, and how much could I stand to gain? Prioritise opportunities where the potential reward far outweighs the risk."},
 {h:"Don't waste your energy worrying about things that are beyond your control.",
  b:"You can't change everyone's mind, and you certainly can't reason with everyone. Know where your influence ends, and learn to let go of what you cannot change."}
];
var SEED_AT = Date.UTC(2026, 9, 23, 0, 0, 0);
var EMPTY_QUOTE = {id:null, h:'Your bookshelf is empty.', b:'Click the glowing bookshelf on the frame to add your first quote.'};

function shelfRaw(){try{return JSON.parse(localStorage.getItem(SHELF_KEY) || 'null')}catch(e){return null}}
function shelfSeed(){return SEED_QUOTES.map(function(q, i){return {id:'seed' + i, h:q.h, b:q.b, at:SEED_AT - i * 60000}})}
// 讀出來一律清理：壞掉的項目丟掉、依加入時間排（最新在最前）
function shelfLoad(){var o = shelfRaw(), items = o && Array.isArray(o.items) ? o.items : shelfSeed();
  return items.filter(function(q){return q && typeof q.h === 'string' && q.h.trim()})
    .map(function(q){return {id:String(q.id || ('q' + q.at)), h:q.h.trim(), b:typeof q.b === 'string' ? q.b.trim() : '', at:+q.at || 0}})
    .sort(function(a, b){return b.at - a.at})}
var shelfCanSave = true;
function shelfSave(items){var o = shelfRaw() || {};
  try{localStorage.setItem(SHELF_KEY, JSON.stringify({v:1, items:items, seen:o.seen || null}));shelfCanSave = true}catch(e){shelfCanSave = false}
  window.dispatchEvent(new Event('shelf-change'))}
function shelfSeen(id){var o = shelfRaw();return !!(o && o.seen === id)}
function shelfMarkSeen(id){var o = shelfRaw();if(!o)return;o.seen = id;try{localStorage.setItem(SHELF_KEY, JSON.stringify(o))}catch(e){}}
function shelfNewId(){return 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)}

var QUOTES = shelfLoad();
// 框打開時：有還沒在框上出現過的最新語錄就先放它，否則隨機一句
function firstQuote(){if(!QUOTES.length)return 0;
  if(shelfRaw() && !shelfSeen(QUOTES[0].id)){shelfMarkSeen(QUOTES[0].id);return 0}
  return Math.floor(Math.random() * QUOTES.length)}
