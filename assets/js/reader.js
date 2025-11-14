/* assets/js/reader.js
   Loads book.json and chapter files, shows preview for locked chapters and allows unlock with coins.
*/
const LS_UNLOCK = 'fenwa:unlocked'; // JSON {bookId:[1,2,...]}
const DEFAULT_PRICE = 30;
const FREE_CHAPTERS = new Set([1,2,3,4,5,6]); // change if you want different free% (10% target)

function getUnlocked(bookId){
  try{ const d = JSON.parse(localStorage.getItem(LS_UNLOCK) || '{}'); return new Set((d[bookId]||[]).map(Number)); } catch { return new Set(); }
}
function saveUnlocked(bookId, setObj){
  const d = JSON.parse(localStorage.getItem(LS_UNLOCK) || '{}'); d[bookId] = Array.from(setObj); localStorage.setItem(LS_UNLOCK, JSON.stringify(d));
}
function markUnlocked(bookId, chId){
  const s = getUnlocked(bookId); s.add(Number(chId)); saveUnlocked(bookId,s);
}

function fetchJSON(path){ return fetch(path, {cache:'no-store'}).then(r=>{ if(!r.ok) throw new Error('Failed to load '+path); return r.json(); }); }

function loadBook(){
  const parts = location.pathname.split('/'); const bookId = parts[parts.length-2];
  const jsonPath = `/books/${bookId}/book.json`;
  fetchJSON(jsonPath).then(book => {
    document.getElementById('bookTitle').textContent = `${book.title} — ${book.author}`;
    renderChapters(book, bookId);
  }).catch(e => { console.error(e); document.getElementById('bookTitle').textContent = 'Error loading book'; });
  document.getElementById('coinBadge2')?.textContent = getCoins();
  document.getElementById('buyBtn2')?.addEventListener('click', openBuyModal);
  document.getElementById('buyModal')?.addEventListener('click', e => { if(e.target === e.currentTarget) closeBuyModal(); });
}

function renderChapters(book, bookId){
  const container = document.getElementById('chapters'); container.innerHTML = '';
  const unlocked = getUnlocked(bookId);
  book.chapters.forEach(ch => {
    const sec = document.createElement('section'); sec.className = 'chapter'; sec.id = 'ch'+ch.id; sec.dataset.ch = ch.id;
    const h = document.createElement('h2'); h.textContent = `Chapter ${ch.id} — ${ch.title || ''}`; sec.appendChild(h);
    const content = document.createElement('div'); content.className = 'content'; content.innerHTML = '<p class="small">Loading preview…</p>'; sec.appendChild(content);
    // locked CTA
    const free = FREE_CHAPTERS.has(ch.id); const isUnlocked = unlocked.has(ch.id);
    if(!free && !isUnlocked){
      const cta = document.createElement('div'); cta.style.marginTop='8px';
      cta.innerHTML = `<div class="small">Locked — unlock to read full chapter</div><div style="margin-top:6px"><button class="btn" onclick="unlockAndShow('${book.id}', ${ch.id}, ${DEFAULT_PRICE})">Unlock (${DEFAULT_PRICE} Coins)</button></div>`;
      sec.appendChild(cta);
    }
    container.appendChild(sec);
    // load file
    fetch(`/books/${book.id}/${ch.file}`).then(r=>r.text()).then(html=>{
      const parser = new DOMParser(); const doc = parser.parseFromString(html,'text/html'); const body = doc.querySelector('body')||doc;
      if(free || isUnlocked){ content.innerHTML = body.innerHTML; attachNext(content, ch.id); }
      else { const paras = Array.from(body.querySelectorAll('p')); content.innerHTML = paras.slice(0,2).map(p=>p.outerHTML).join('') + `<p class="dim">Preview — unlock to read full chapter.</p>`; }
    }).catch(()=> content.innerHTML = '<p class="small">Failed to load chapter.</p>');
  });
  setWatermark();
}

function unlockAndShow(bookId, chId, price){
  if(!confirm(`Unlock chapter ${chId} for ${price} coins?`)) return;
  if(!spendCoins(price)){ openBuyModal(); return; }
  markUnlocked(bookId, chId);
  // reload the chapter from book.json to get filename
  fetch(`/books/${bookId}/book.json`).then(r=>r.json()).then(book=>{
    const ch = book.chapters.find(c=>c.id===chId); if(!ch) return;
    fetch(`/books/${bookId}/${ch.file}`).then(r=>r.text()).then(html=>{
      const parser = new DOMParser(); const doc = parser.parseFromString(html,'text/html'); const body = doc.querySelector('body')||doc;
      const sec = document.getElementById('ch'+chId); if(!sec) return;
      sec.querySelector('.content').innerHTML = body.innerHTML; attachNext(sec.querySelector('.content'), chId);
      document.getElementById('coinBadge2') && (document.getElementById('coinBadge2').textContent = getCoins());
      sec.scrollIntoView({behavior:'smooth', block:'start'});
    });
  });
}
window.unlockAndShow = unlockAndShow;

function attachNext(contentEl, currId){
  if(contentEl.querySelector('.next-footer')) return;
  const footer = document.createElement('div'); footer.className='next-footer'; footer.style.textAlign='right';
  footer.innerHTML = `<button class="btn" onclick="goNext(${currId})">Next →</button>`; contentEl.appendChild(footer);
}

function goNext(currId){
  const next = currId + 1; const sec = document.getElementById('ch'+next);
  if(!sec) { alert('No next chapter'); return; }
  const bookId = location.pathname.split('/').slice(-2,-1)[0];
  const unlocked = getUnlocked(bookId);
  if(FREE_CHAPTERS.has(next) || unlocked.has(next)){ sec.scrollIntoView({behavior:'smooth'}); return; }
  unlockAndShow(bookId, next, DEFAULT_PRICE);
}

function setWatermark(){
  const user = localStorage.getItem('fenwa:user') || 'Fenwa';
  const el = document.getElementById('tati-watermark'); if(el) el.textContent = `Fenwa — ${user} — ${new Date().toLocaleString()}`;
}

document.addEventListener('DOMContentLoaded', loadBook);
