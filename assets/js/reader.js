/* debug-friendly reader.js
   Replace the existing assets/js/reader.js with this file.
   It logs every step to #fetch-debug and catches runtime errors so we can see them on mobile.
*/

const REPO_PREFIX = ''; // keep empty if files are in site root
const FREE_CHAPTERS_SET = new Set([1,2,3,4,5,6]);
const DEFAULT_PRICE = 30;
const LS_UNLOCK = 'fenwa:unlocked';

function dbg(msg){
  try {
    const el = document.getElementById('fetch-debug');
    if(el) el.innerHTML += '<div>' + String(msg) + '</div>';
  } catch(e){}
  try { console.log('[reader-debug]', msg); } catch(e){}
}

// safe JSON fetch
async function readJSON(path){
  dbg('readJSON -> ' + path);
  const r = await fetch(path, {cache:'no-store'});
  if(!r.ok) throw new Error('Failed to load ' + path + ' (status '+ r.status +')');
  return await r.json();
}

function getCoins(){ return (typeof window.getCoins === 'function') ? window.getCoins() : parseInt(localStorage.getItem('fenwa:coins')||'0',10) || 0; }
function setCoinsBadge(){
  const b = getCoins();
  document.querySelectorAll('#coinBadge2,#coinBadge').forEach(el => { if(el) el.textContent = b; });
}

// reveal helper
function attachNextFooter(contentEl, currId){
  if(contentEl.querySelector('.next-footer')) return;
  const footer = document.createElement('div');
  footer.className = 'next-footer';
  footer.innerHTML = `<button class="btn" onclick="nextChapter(${currId})">Next Chapter →</button>`;
  contentEl.appendChild(footer);
}

function getUnlocked(bookId){
  try { return JSON.parse(localStorage.getItem(LS_UNLOCK + ':' + bookId) || '[]').map(Number); }
  catch(e){ return []; }
}
function setUnlocked(bookId, list){
  localStorage.setItem(LS_UNLOCK + ':' + bookId, JSON.stringify(list));
}
function isUnlocked(bookId, chId){
  return getUnlocked(bookId).includes(Number(chId));
}
window.unlockChapter = function(bookId, chId, price){
  price = Number(price || DEFAULT_PRICE);
  if(isUnlocked(bookId, chId)) { alert('Already unlocked'); return true; }
  if(typeof window.spendCoins === 'function'){
    if(!window.spendCoins(price)){ alert('Not enough coins'); return false; }
  } else {
    const bal = getCoins();
    if(bal < price){ alert('Not enough coins'); return false; }
    localStorage.setItem('fenwa:coins', String(bal - price));
    setCoinsBadge();
  }
  const arr = getUnlocked(bookId); arr.push(Number(chId)); setUnlocked(bookId, arr);
  alert('Chapter ' + chId + ' unlocked');
  // reload the chapter content
  revealChapter(bookId, chId);
  return true;
};

async function revealChapter(bookId, chId){
  try {
    const meta = await (await fetch(REPO_PREFIX + 'books/' + bookId + '/book.json', {cache:'no-store'})).json();
    const ch = meta.chapters.find(c => Number(c.id) === Number(chId));
    if(!ch) { dbg('revealChapter: chapter file not found in book.json for id ' + chId); return; }
    const path = REPO_PREFIX + 'books/' + bookId + '/' + ch.file;
    const r = await fetch(path, {cache:'no-store'});
    if(!r.ok){ dbg('revealChapter: fetch ' + path + ' failed status ' + r.status); return; }
    const html = await r.text();
    const sec = document.getElementById('ch'+chId);
    if(!sec) { dbg('revealChapter: section element not found for ch' + chId); return; }
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.querySelector('body') || doc;
    const contentEl = sec.querySelector('.content');
    contentEl.innerHTML = body.innerHTML;
    attachNextFooter(contentEl, Number(chId));
    setCoinsBadge();
  } catch(err){
    dbg('revealChapter error: ' + err.message);
    console.error(err);
  }
}

window.nextChapter = function(currId){
  try {
    const next = Number(currId) + 1;
    const sec = document.getElementById('ch' + next);
    if(!sec){
      alert('No next chapter.');
      return;
    }
    const bookId = location.pathname.split('/').slice(-2,-1)[0];
    if(FREE_CHAPTERS_SET.has(next) || isUnlocked(bookId, next)){
      // ensure full view loaded
      if(!FREE_CHAPTERS_SET.has(next)) revealChapter(bookId, next);
      sec.scrollIntoView({behavior:'smooth', block:'start'});
      return;
    }
    // otherwise prompt unlock
    if(confirm(`Unlock chapter ${next} for ${DEFAULT_PRICE} TatiCoin?`)){
      const ok = window.unlockChapter ? window.unlockChapter(bookId, next, DEFAULT_PRICE) : false;
      if(ok) document.getElementById('ch' + next).scrollIntoView({behavior:'smooth'});
    }
  } catch(e){ dbg('nextChapter error: ' + e.message); console.error(e); }
};

// main loader
async function loadBook(){
  try {
    dbg('loadBook: start');
    // find book id from url
    const parts = location.pathname.split('/');
    const bookId = parts[parts.length - 2];
    if(!bookId){ throw new Error('Could not determine book id from path: ' + location.pathname); }
    dbg('book id -> ' + bookId);
    const metaPath = REPO_PREFIX + 'books/' + bookId + '/book.json';
    const book = await readJSON(metaPath);
    dbg('loaded book meta: ' + (book.title || book.id || 'no title'));
    document.getElementById('bookTitle').textContent = (book.title || 'Untitled') + ' — ' + (book.author || '');
    setCoinsBadge();

    const container = document.getElementById('chapters');
    container.innerHTML = '';
    const unlocked = getUnlocked(bookId).map(Number);

    for(const ch of book.chapters){
      const sec = document.createElement('section');
      sec.className = 'chapter';
      sec.id = 'ch' + ch.id;
      sec.dataset.ch = ch.id;

      const h = document.createElement('h2');
      h.textContent = `Chapter ${ch.id}`;
      sec.appendChild(h);

      const content = document.createElement('div');
      content.className = 'content';
      content.innerHTML = '<p class="small">Loading preview…</p>';
      sec.appendChild(content);

      // locked CTA if needed
      if(!FREE_CHAPTERS_SET.has(Number(ch.id)) && !unlocked.includes(Number(ch.id))){
        const cta = document.createElement('div');
        cta.style.display='flex';
        cta.style.justifyContent='space-between';
        cta.style.alignItems='center';
        cta.style.marginTop='8px';
        cta.innerHTML = `<div class="small">Locked — unlock to read full chapter</div>
          <div><button class="btn" onclick="unlockChapter('${bookId}', ${ch.id}, ${DEFAULT_PRICE})">Unlock (${DEFAULT_PRICE} TatiCoin)</button></div>`;
        sec.appendChild(cta);
      }

      container.appendChild(sec);

      // fetch chapter file and insert preview or full content
      (async (chObj)=>{
        try {
          const chapterPath = REPO_PREFIX + 'books/' + book.id + '/' + chObj.file;
          dbg('fetch chapter -> ' + chapterPath);
          const r = await fetch(chapterPath, {cache:'no-store'});
          if(!r.ok){ dbg('chapter fetch failed: ' + chapterPath + ' status ' + r.status); content.innerHTML = '<p class="small">Failed to load chapter.</p>'; return; }
          const html = await r.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html, 'text/html');
          const body = doc.querySelector('body') || doc;
          const paragraphs = Array.from(body.querySelectorAll('p'));
          const previewHtml = paragraphs.slice(0,2).map(p => p.outerHTML).join('\n') || body.innerHTML;
          if(FREE_CHAPTERS_SET.has(Number(chObj.id)) || unlocked.includes(Number(chObj.id))){
            content.innerHTML = body.innerHTML;
            attachNextFooter(content, Number(chObj.id));
          } else {
            content.innerHTML = previewHtml;
          }
        } catch(err){
          dbg('error fetching chapter file: ' + err.message);
          content.innerHTML = '<p class="small">Failed to load chapter.</p>';
        }
      })(ch);
    } // end for

    // watermark and buy btn
    try {
      const watermark = document.getElementById('tati-watermark');
      if(watermark) watermark.textContent = `Fenwa — ${localStorage.getItem('fenwa:user') || 'reader'} — ${new Date().toLocaleString()}`;
      document.getElementById('buyBtn2')?.addEventListener('click', ()=>{ if(window.openBuyModal) window.openBuyModal(); else alert('Buy modal not available'); });
      document.getElementById('buyModal')?.addEventListener('click', (e)=>{ if(e.target === e.currentTarget && window.closeBuyModal) window.closeBuyModal(); });
    } catch(e){ dbg('watermark/buyBtn binding error: ' + e.message); }

    dbg('loadBook: finished');
    // remove loading message if any
    const loadEl = document.getElementById('loading');
    if(loadEl) loadEl.remove();

  } catch(err){
    dbg('loadBook ERROR: ' + (err && err.message ? err.message : String(err)));
    console.error(err);
    const loadEl = document.getElementById('loading');
    if(loadEl) loadEl.innerHTML = 'Error loading book: ' + (err.message || String(err));
  }
}

document.addEventListener('DOMContentLoaded', ()=>{
  // small safety wrap
  try {
    loadBook();
  } catch(err){
    dbg('DOM load wrapper error: ' + err.message);
    console.error(err);
  }
});
