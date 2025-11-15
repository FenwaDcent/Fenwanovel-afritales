/* assets/js/reader.js - fresh copy for the reader page */
const REPO_PREFIX = ''; // keep empty if you serve from site root

const FREE_CHAPTERS_SET = new Set([1,2,3,4,5,6]); // free for demo
const DEFAULT_PRICE = 30;

function readJSON(path){
  return fetch(path, {cache:'no-store'}).then(r=>{
    if(!r.ok) throw new Error('Failed load '+path+' (status '+r.status+')');
    return r.json();
  });
}

function loadBook(){
  const parts = location.pathname.split('/');
  // expecting /books/<book-id>/book.html
  const bookId = parts[parts.length - 2];
  const metaPath = `${REPO_PREFIX}books/${bookId}/book.json`;

  const loading = document.getElementById('loading');
  readJSON(metaPath).then(book=>{
    document.getElementById('bookTitle').textContent = book.title + ' — ' + book.author;
    loading?.remove();
    renderChapters(book, bookId);
  }).catch(err=>{
    console.error(err);
    if(loading) loading.innerHTML = `Failed to load book metadata: ${err.message}`;
  });

  document.getElementById('coinBadge2')?.textContent = (window.getCoins ? getCoins() : 0);
  document.getElementById('buyBtn2')?.addEventListener('click', ()=>window.openBuyModal && window.openBuyModal());
}

function renderChapters(book, bookId){
  const container = document.getElementById('chapters');
  if(!container) return;
  container.innerHTML = '';

  const unlocked = (localStorage.getItem(`fenwa:unlocked:${bookId}`) || '[]');
  let unlockedList = [];
  try { unlockedList = JSON.parse(unlocked).map(Number); } catch(e){ unlockedList = []; }

  book.chapters.forEach(ch=>{
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

    if(!FREE_CHAPTERS_SET.has(ch.id) && !unlockedList.includes(ch.id)){
      const cta = document.createElement('div');
      cta.style.display='flex';
      cta.style.justifyContent='space-between';
      cta.style.alignItems='center';
      cta.style.marginTop='8px';
      cta.innerHTML = `<div class="small">Locked — unlock to read full chapter</div>
        <div><button class="btn" data-ch="${ch.id}">Unlock (${DEFAULT_PRICE} TatiCoin)</button></div>`;
      sec.appendChild(cta);
      cta.querySelector('button')?.addEventListener('click', ()=>unlockChapter(book.id, ch.id, DEFAULT_PRICE));
    }

    container.appendChild(sec);

    // fetch the chapter file
    const chapterPath = `${REPO_PREFIX}books/${book.id}/${ch.file}`;
    fetch(chapterPath).then(r=>r.text()).then(html=>{
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const body = doc.querySelector('body') || doc;
      const paragraphs = Array.from(body.querySelectorAll('p'));
      const previewHtml = paragraphs.slice(0,2).map(p=>p.outerHTML).join('\n') || body.innerHTML.slice(0,400);

      if(FREE_CHAPTERS_SET.has(ch.id) || unlockedList.includes(ch.id)){
        content.innerHTML = body.innerHTML;
        addNext(content, ch.id);
      } else {
        content.innerHTML = previewHtml + `<p class="small dim">... preview only</p>`;
      }
    }).catch(err=>{
      console.error('chapter load failed', err);
      content.innerHTML = '<p class="small">Failed to load chapter (check path).</p>';
    });
  });

  setWatermark();
}

function addNext(contentEl, currId){
  if(contentEl.querySelector('.next-footer')) return;
  const footer = document.createElement('div');
  footer.className = 'next-footer';
  footer.innerHTML = `<button class="btn" data-next="${currId+1}">Next Chapter →</button>`;
  contentEl.appendChild(footer);
  footer.querySelector('button')?.addEventListener('click', ()=>nextChapter(currId));
}

function unlockChapter(bookId, chapterId, price){
  if(typeof window.spendCoins === 'function'){
    const ok = window.spendCoins(price);
    if(!ok){ alert('Not enough coins — buy more.'); window.openBuyModal && window.openBuyModal(); return; }
  } else {
    // fallback local spend
    const cur = parseInt(localStorage.getItem('fenwa:coins') || '0',10) || 0;
    if(cur < price){ alert('Not enough coins.'); window.openBuyModal && window.openBuyModal(); return; }
    localStorage.setItem('fenwa:coins', String(cur - price));
  }

  const key = `fenwa:unlocked:${bookId}`;
  const list = JSON.parse(localStorage.getItem(key) || '[]');
  if(!list.includes(chapterId)) list.push(chapterId);
  localStorage.setItem(key, JSON.stringify(list));
  // now reveal the chapter content
  const sec = document.getElementById('ch' + chapterId);
  if(!sec) return;
  fetch(`/books/${bookId}/chapter-${chapterId}.html`).then(r=>r.text()).then(html=>{
    const parser = new DOMParser();
    const doc = parser.parseFromString(html,'text/html');
    const body = doc.querySelector('body') || doc;
    const contentEl = sec.querySelector('.content');
    contentEl.innerHTML = body.innerHTML;
    addNext(contentEl, chapterId);
    document.getElementById('coinBadge2') && (document.getElementById('coinBadge2').textContent = (window.getCoins?getCoins():localStorage.getItem('fenwa:coins')));
  });
}

window.nextChapter = function(currId){
  const next = currId + 1;
  const sec = document.getElementById('ch' + next);
  if(!sec){ alert('No next chapter.'); return; }
  const bookId = location.pathname.split('/').slice(-2,-1)[0];
  const unlocked = JSON.parse(localStorage.getItem(`fenwa:unlocked:${bookId}`) || '[]').map(Number);
  if(FREE_CHAPTERS_SET.has(next) || unlocked.includes(next)){
    sec.scrollIntoView({behavior:'smooth', block:'start'});
    return;
  }
  unlockChapter(bookId, next, DEFAULT_PRICE);
};

function setWatermark(){
  const el = document.getElementById('tati-watermark');
  if(!el) return;
  const user = localStorage.getItem('fenwa:user-name') || 'Fenwa';
  el.textContent = `Fenwa — ${user} — ${new Date().toLocaleString()}`;
}

document.addEventListener('DOMContentLoaded', loadBook);
