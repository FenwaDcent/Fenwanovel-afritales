/* assets/js/reader.js (robust ready-to-paste version)
   - Tries multiple path prefixes to avoid 404s when site is served under a repo folder.
   - Keeps same features: preview/full chapter loading, unlock with coins, next flow, watermark.
   - Shows helpful debug lines in #fetch-debug (if present).
*/

const FREE_CHAPTERS_SET = new Set([1,2,3,4,5,6]);
const DEFAULT_PRICE = 30;
const LS_UNLOCK = 'fenwa:unlocked'; // usage: fenwa:unlocked:<bookId>

// toggles for troubleshooting: set to true if you want verbose debug output in page.
const READER_DEBUG = false;

function dbg(msg){
  if(!READER_DEBUG) return;
  try {
    const el = document.getElementById('fetch-debug');
    if(el) el.innerHTML += '<div>' + String(msg) + '</div>';
  } catch(e){}
  try { console.log('[reader-debug]', msg); } catch(e){}
}

// Try multiple candidate prefixes to find where /books/<bookId>/book.json is served.
// Returns the successful prefix string or throws if none succeed.
async function detectPrefix(bookId){
  // Candidate prefixes in order:
  // 1. '' (relative)
  // 2. '/' (absolute from site root)
  // 3. inferred repo base from pathname (if present)
  const candidates = ['','/'];

  // infer repo segment(s) from location.pathname, e.g. "/Fenwanovel-afritales/..."
  try {
    const parts = location.pathname.split('/').filter(Boolean); // remove empty
    if(parts.length > 0){
      // If the path contains a folder at the root, try prefixes built from the first segment and first two segments
      candidates.push('/' + parts[0] + '/');
      if(parts.length > 1) candidates.push('/' + parts.slice(0,2).join('/') + '/');
    }
  } catch(e){ dbg('prefix infer error: ' + e.message); }

  // dedupe while preserving order
  const seen = new Set();
  const uniq = [];
  for(const c of candidates){ if(!seen.has(c)){ uniq.push(c); seen.add(c); } }

  dbg('detectPrefix: trying candidates -> ' + uniq.join(', '));
  for(const p of uniq){
    const path = p + 'books/' + bookId + '/book.json';
    dbg('detectPrefix: probing ' + path);
    try {
      const r = await fetch(path, {cache:'no-store'});
      dbg('probe result for ' + path + ' -> ' + r.status);
      if(r.ok) return p;
    } catch(e){
      dbg('probe fetch error for ' + path + ': ' + (e && e.message ? e.message : String(e)));
    }
  }
  throw new Error('Could not find books/' + bookId + '/book.json with tested prefixes: ' + uniq.join(', '));
}

// safe JSON fetch wrapper (uses explicit path)
async function readJSON(path){
  dbg('readJSON -> ' + path);
  const r = await fetch(path, {cache:'no-store'});
  if(!r.ok) throw new Error('Failed to load ' + path + ' (status ' + r.status + ')');
  return await r.json();
}

function getCoinsLocal(){
  return (typeof window.getCoins === 'function') ? window.getCoins() : parseInt(localStorage.getItem('fenwa:coins')||'0',10) || 0;
}
function updateCoinBadges(){
  const b = getCoinsLocal();
  document.querySelectorAll('#coinBadge,#coinBadge2,.coin-amount').forEach(el => { if(el) el.textContent = b; });
}

function getUnlocked(bookId){
  try { return JSON.parse(localStorage.getItem(LS_UNLOCK + ':' + bookId) || '[]').map(Number); }
  catch(e){ return []; }
}
function setUnlocked(bookId, list){ localStorage.setItem(LS_UNLOCK + ':' + bookId, JSON.stringify(list)); }
function isUnlocked(bookId, chapterId){ return getUnlocked(bookId).includes(Number(chapterId)); }

function attachNextFooter(contentEl, currId){
  if(contentEl.querySelector('.next-footer')) return;
  const footer = document.createElement('div');
  footer.className = 'next-footer';
  footer.innerHTML = `<button class="btn" onclick="nextChapter(${currId})">Next Chapter →</button>`;
  contentEl.appendChild(footer);
}

async function revealChapter(basePrefix, bookId, chId){
  try {
    const meta = await readJSON(basePrefix + 'books/' + bookId + '/book.json');
    const ch = meta.chapters.find(c => Number(c.id) === Number(chId));
    if(!ch){ dbg('revealChapter: not found in book.json -> ' + chId); return; }
    const path = basePrefix + 'books/' + bookId + '/' + ch.file;
    const r = await fetch(path, {cache:'no-store'});
    if(!r.ok){ dbg('revealChapter: fetch failed ' + path + ' status ' + r.status); return; }
    const html = await r.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const body = doc.querySelector('body') || doc;
    const sec = document.getElementById('ch' + chId);
    if(!sec){ dbg('revealChapter: section element missing for ch' + chId); return; }
    const contentEl = sec.querySelector('.content');
    contentEl.innerHTML = body.innerHTML;
    attachNextFooter(contentEl, Number(chId));
    updateCoinBadges();
  } catch(err){
    dbg('revealChapter error: ' + (err && err.message ? err.message : String(err)));
    console.error(err);
  }
}

window.unlockChapter = function(bookId, chapterId, price){
  try {
    price = Number(price || DEFAULT_PRICE);
    if(isUnlocked(bookId, chapterId)){ alert('✔ Already unlocked'); return true; }
    if(typeof window.spendCoins === 'function'){
      const ok = window.spendCoins(price);
      if(!ok){ alert('Not enough TatiCoin — buy more.'); if(typeof window.openBuyModal==='function') window.openBuyModal(); return false; }
    } else {
      const bal = getCoinsLocal();
      if(bal < price){ alert('Not enough TatiCoin — buy more.'); if(typeof window.openBuyModal==='function') window.openBuyModal(); return false; }
      localStorage.setItem('fenwa:coins', String(bal - price));
      updateCoinBadges();
    }
    const list = getUnlocked(bookId);
    list.push(Number(chapterId));
    setUnlocked(bookId, list);
    alert('🔓 Chapter ' + chapterId + ' unlocked!');
    // After unlock we need to detect prefix again and reveal
    detectPrefix(bookId).then(prefix => {
      revealChapter(prefix, bookId, chapterId).then(()=> {
        const sec = document.getElementById('ch' + chapterId);
        if(sec) sec.scrollIntoView({behavior:'smooth', block:'start'});
      });
    }).catch(err => { dbg('unlock detectPrefix error: ' + err.message); });
    return true;
  } catch(e){
    dbg('unlockChapter error: ' + e.message);
    console.error(e);
    return false;
  }
};

window.nextChapter = function(currId){
  try {
    const next = Number(currId) + 1;
    const sec = document.getElementById('ch' + next);
    if(!sec){ alert('No next chapter.'); return; }
    const bookId = location.pathname.split('/').slice(-2,-1)[0];
    if(FREE_CHAPTERS_SET.has(next) || isUnlocked(bookId, next)){
      if(!FREE_CHAPTERS_SET.has(next)){
        detectPrefix(bookId).then(prefix => revealChapter(prefix, bookId, next)).catch(err => dbg('nextChapter reveal detect error: ' + err.message));
      }
      sec.scrollIntoView({behavior:'smooth', block:'start'});
      return;
    }
    if(confirm(`Unlock chapter ${next} for ${DEFAULT_PRICE} TatiCoin?`)){
      const ok = window.unlockChapter ? window.unlockChapter(bookId, next, DEFAULT_PRICE) : false;
      if(ok) document.getElementById('ch' + next).scrollIntoView({behavior:'smooth'});
    }
  } catch(e){ dbg('nextChapter error: ' + e.message); console.error(e); }
};

// main loader
async function loadBook(){
  try {
    dbg('loadBook: starting');
    const parts = location.pathname.split('/');
    const bookId = parts[parts.length - 2];
    if(!bookId) throw new Error('Could not determine book id from path: ' + location.pathname);
    dbg('bookId -> ' + bookId);

    // detect working prefix (relative, root, or repo subfolder)
    const prefix = await detectPrefix(bookId);
    dbg('Selected prefix -> "' + prefix + '"');

    // read book meta
    const book = await readJSON(prefix + 'books/' + bookId + '/book.json');
    dbg('book meta loaded: ' + (book.title || book.id || 'unknown'));
    const titleEl = document.getElementById('bookTitle');
    if(titleEl) titleEl.textContent = (book.title || 'Untitled') + ' — ' + (book.author || '');
    updateCoinBadges();

    const container = document.getElementById('chapters');
    if(!container) throw new Error('#chapters element missing in page');
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

      // fetch chapter and show preview or full
      (async (chObj)=>{
        try {
          const chapterPath = prefix + 'books/' + book.id + '/' + chObj.file;
          dbg('fetching chapter -> ' + chapterPath);
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
          dbg('error fetching chapter file: ' + (err && err.message ? err.message : String(err)));
          content.innerHTML = '<p class="small">Failed to load chapter.</p>';
        }
      })(ch);
    }

    // watermark + buy button binding
    try {
      const watermark = document.getElementById('tati-watermark');
      if(watermark) watermark.textContent = `Fenwa — ${localStorage.getItem('fenwa:user') || 'reader'} — ${new Date().toLocaleString()}`;
      document.getElementById('buyBtn2')?.addEventListener('click', ()=>{ if(window.openBuyModal) window.openBuyModal(); else alert('Buy modal not available'); });
      document.getElementById('buyModal')?.addEventListener('click', (e)=>{ if(e.target === e.currentTarget && window.closeBuyModal) window.closeBuyModal(); });
    } catch(e){ dbg('watermark binding error: ' + e.message); }

    dbg('loadBook: finished');
    const loadEl = document.getElementById('loading'); if(loadEl) loadEl.remove();
  } catch(err){
    dbg('loadBook ERROR: ' + (err && err.message ? err.message : String(err)));
    console.error(err);
    const loadEl = document.getElementById('loading');
    if(loadEl) loadEl.innerHTML = 'Error loading book: ' + (err && err.message ? err.message : String(err));
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try { loadBook(); } catch(e){ dbg('DOMContentLoaded wrapper error: ' + e.message); console.error(e); }
});
