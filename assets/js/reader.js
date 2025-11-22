/* assets/js/reader.js
   Fully fixed version for fenwanovel.online
   Loads books from /Fenwanovel-afritales/books/<bookId>/
   Handles previews, unlocking, next chapter, and watermark.
*/

// IMPORTANT: Your GitHub Pages site root contains Fenwanovel-afritales/
// So all book paths need this prefix.
const REPO_PREFIX = '/Fenwanovel-afritales/';

const FREE_CHAPTERS_SET = new Set([1,2,3,4,5,6]); 
const DEFAULT_PRICE = 30;
const LS_UNLOCK = 'fenwa:unlocked';

function dbg(msg){
  try { console.log('[reader]', msg); } catch(e){}
}

async function readJSON(path){
  dbg('readJSON -> ' + path);
  const r = await fetch(path, {cache:'no-store'});
  if(!r.ok) throw new Error('Failed to load ' + path + ' (status '+r.status+')');
  return await r.json();
}

function getCoinsLocal(){
  return (typeof window.getCoins === 'function')
      ? window.getCoins()
      : parseInt(localStorage.getItem('fenwa:coins')||'0',10) || 0;
}

function updateCoinBadges(){
  const b = getCoinsLocal();
  document.querySelectorAll('#coinBadge,#coinBadge2,.coin-amount').forEach(el => {
    if(el) el.textContent = b;
  });
}

function getUnlocked(bookId){
  try { return JSON.parse(localStorage.getItem(LS_UNLOCK + ':' + bookId) || '[]').map(Number); }
  catch(e){ return []; }
}
function setUnlocked(bookId, list){
  localStorage.setItem(LS_UNLOCK + ':' + bookId, JSON.stringify(list));
}
function isUnlocked(bookId, chapterId){
  return getUnlocked(bookId).includes(Number(chapterId));
}

function attachNextFooter(contentEl, currId){
  if(contentEl.querySelector('.next-footer')) return;
  const footer = document.createElement('div');
  footer.className = 'next-footer';
  footer.innerHTML = `<button class="btn" onclick="nextChapter(${currId})">Next Chapter →</button>`;
  contentEl.appendChild(footer);
}

async function revealChapter(bookId, chId){
  try {
    const meta = await readJSON(REPO_PREFIX + 'books/' + bookId + '/book.json');
    const ch = meta.chapters.find(c => Number(c.id) === Number(chId));
    if(!ch){ dbg('No chapter in JSON: ' + chId); return; }

    const path = REPO_PREFIX + 'books/' + bookId + '/' + ch.file;
    const r = await fetch(path, {cache:'no-store'});
    if(!r.ok){ dbg('Failed to fetch chapter ' + path); return; }

    const html = await r.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(html,'text/html');
    const body = doc.querySelector('body') || doc;

    const sec = document.getElementById('ch'+chId);
    if(!sec){ dbg('Missing section element ch'+chId); return; }

    const contentEl = sec.querySelector('.content');
    contentEl.innerHTML = body.innerHTML;

    attachNextFooter(contentEl, Number(chId));
    updateCoinBadges();
  } catch(err){
    dbg('revealChapter error: ' + err.message);
  }
}

window.unlockChapter = function(bookId, chapterId, price){
  try {
    price = Number(price || DEFAULT_PRICE);

    if(isUnlocked(bookId, chapterId)){
      alert('✔ Already unlocked');
      return true;
    }

    if(typeof window.spendCoins === 'function'){
      const ok = window.spendCoins(price);
      if(!ok){
        alert('Not enough TatiCoin');
        if(window.openBuyModal) window.openBuyModal();
        return false;
      }
    } else {
      const bal = getCoinsLocal();
      if(bal < price){
        alert('Not enough TatiCoin');
        if(window.openBuyModal) window.openBuyModal();
        return false;
      }
      localStorage.setItem('fenwa:coins', String(bal - price));
      updateCoinBadges();
    }

    const list = getUnlocked(bookId);
    list.push(Number(chapterId));
    setUnlocked(bookId, list);

    alert('🔓 Chapter ' + chapterId + ' unlocked!');
    revealChapter(bookId, chapterId).then(()=>{
      const sec = document.getElementById('ch'+chapterId);
      if(sec) sec.scrollIntoView({behavior:'smooth'});
    });

    return true;
  } catch(err){
    dbg('unlockChapter error: ' + err.message);
    return false;
  }
};

window.nextChapter = function(currId){
  try {
    const next = Number(currId) + 1;
    const sec = document.getElementById('ch'+next);
    if(!sec){ alert('No next chapter.'); return; }

    const bookId = location.pathname.split('/').slice(-2,-1)[0];

    if(FREE_CHAPTERS_SET.has(next) || isUnlocked(bookId, next)){
      if(!FREE_CHAPTERS_SET.has(next)) revealChapter(bookId, next);
      sec.scrollIntoView({behavior:'smooth'});
      return;
    }

    if(confirm(`Unlock chapter ${next} for ${DEFAULT_PRICE} TatiCoin?`)){
      const ok = window.unlockChapter(bookId, next, DEFAULT_PRICE);
      if(ok) sec.scrollIntoView({behavior:'smooth'});
    }

  } catch(err){
    dbg('nextChapter error: ' + err.message);
  }
};

async function loadBook(){
  try {
    dbg('loadBook starting...');
    const parts = location.pathname.split('/');
    const bookId = parts[parts.length - 2];

    const metaPath = REPO_PREFIX + 'books/' + bookId + '/book.json';
    const book = await readJSON(metaPath);

    document.getElementById('bookTitle').textContent =
      `${book.title} — ${book.author || ''}`;

    updateCoinBadges();

    const container = document.getElementById('chapters');
    container.innerHTML = '';

    const unlocked = getUnlocked(bookId);

    for(const ch of book.chapters){
      const sec = document.createElement('section');
      sec.className = 'chapter';
      sec.id = 'ch' + ch.id;

      const h = document.createElement('h2');
      h.textContent = `Chapter ${ch.id}`;
      sec.appendChild(h);

      const content = document.createElement('div');
      content.className = 'content';
      content.innerHTML = '<p class="small">Loading preview…</p>';
      sec.appendChild(content);

      if(!FREE_CHAPTERS_SET.has(ch.id) && !unlocked.includes(ch.id)){
        const cta = document.createElement('div');
        cta.style.display='flex';
        cta.style.justifyContent='space-between';
        cta.style.alignItems='center';
        cta.style.marginTop='8px';
        cta.innerHTML = `
          <div class="small">Locked — unlock to read full chapter</div>
          <button class="btn" onclick="unlockChapter('${bookId}', ${ch.id}, ${DEFAULT_PRICE})">
            Unlock (${DEFAULT_PRICE} TatiCoin)
          </button>`;
        sec.appendChild(cta);
      }

      container.appendChild(sec);

      (async () => {
        try {
          const chapterPath = REPO_PREFIX + 'books/' + bookId + '/' + ch.file;
          const r = await fetch(chapterPath, {cache:'no-store'});
          if(!r.ok){
            content.innerHTML = '<p class="small">Failed to load chapter.</p>';
            return;
          }
          const html = await r.text();
          const parser = new DOMParser();
          const doc = parser.parseFromString(html,'text/html');
          const body = doc.querySelector('body') || doc;

          const paragraphs = Array.from(body.querySelectorAll('p'));
          const previewHtml = paragraphs.slice(0,2).map(p => p.outerHTML).join('') 
                || body.innerHTML;

          if(FREE_CHAPTERS_SET.has(ch.id) || unlocked.includes(ch.id)){
            content.innerHTML = body.innerHTML;
            attachNextFooter(content, ch.id);
          } else {
            content.innerHTML = previewHtml;
          }

        } catch(err){
          content.innerHTML = '<p class="small">Failed to load chapter.</p>';
        }
      })();
    }

    const watermark = document.getElementById('tati-watermark');
    if(watermark){
      watermark.textContent =
        `Fenwa — ${localStorage.getItem('fenwa:user') || 'reader'} — ${new Date().toLocaleString()}`;
    }

    const loading = document.getElementById('loading');
    if(loading) loading.remove();

  } catch(err){
    const loading = document.getElementById('loading');
    if(loading)
      loading.innerHTML = 'Error loading book: ' + err.message;
  }
}

document.addEventListener('DOMContentLoaded', loadBook);
