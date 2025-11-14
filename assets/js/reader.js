/* assets/js/reader.js
   Loads books/{bookId}/book.json, shows preview for locked chapters, unlocks with coins.
*/

const LS_UNLOCK = 'fenwa:unlocked'; // list of unlocked chapters per book stored as JSON {bookId:[1,2,3]}
const DEFAULT_PRICE = 30;
const FREE_CHAPTERS = new Set([1,2,3,4,5,6]); // 10% free you can adjust

function getUnlockedList(bookId){
  try {
    const data = JSON.parse(localStorage.getItem(LS_UNLOCK) || '{}');
    return new Set((data[bookId] || []).map(Number));
  } catch { return new Set(); }
}
function saveUnlockedList(bookId, setObj){
  const data = JSON.parse(localStorage.getItem(LS_UNLOCK) || '{}');
  data[bookId] = Array.from(setObj);
  localStorage.setItem(LS_UNLOCK, JSON.stringify(data));
}
function markChapterUnlocked(bookId, chId){
  const s = getUnlockedList(bookId);
  s.add(Number(chId));
  saveUnlockedList(bookId, s);
}

// helper to load JSON
function fetchJSON(path){
  return fetch(path, {cache: 'no-store'}).then(r => { if(!r.ok) throw new Error('load error'); return r.json(); });
}

// read current book
function loadBook(){
  const parts = location.pathname.split('/');
  const bookId = parts[parts.length - 2]; // .../books/<bookId>/book.html
  const jsonPath = `/books/${bookId}/book.json`;
  fetchJSON(jsonPath)
    .then(book => {
      document.getElementById('bookTitle').textContent = `${book.title} — ${book.author}`;
      renderChapters(book, bookId);
    })
    .catch(err => { console.error(err); document.getElementById('bookTitle').textContent = 'Failed to load book'; });
  // coin badge
  document.getElementById('coinBadge2').textContent = getCoins();
}

function renderChapters(book, bookId){
  const container = document.getElementById('chapters');
  container.innerHTML = '';
  const unlocked = getUnlockedList(bookId);

  book.chapters.forEach(ch => {
    const sec = document.createElement('section');
    sec.className = 'chapter';
    sec.id = `ch${ch.id}`;
    sec.dataset.ch = ch.id;

    const h = document.createElement('h2');
    h.textContent = `Chapter ${ch.id} — ${ch.title || ''}`;
    sec.appendChild(h);

    const contentDiv = document.createElement('div');
    contentDiv.className = 'content';
    contentDiv.innerHTML = '<p class="small">Loading preview…</p>';
    sec.appendChild(contentDiv);

    // Locked CTA
    const isFree = FREE_CHAPTERS.has(ch.id);
    const isUnlocked = unlocked.has(ch.id);
    if(!isFree && !isUnlocked){
      const cta = document.createElement('div');
      cta.style.marginTop = '8px';
      cta.innerHTML = `<div class="small">Locked — unlock to read full chapter</div>
        <div style="margin-top:6px"><button class="btn" onclick="unlockAndShow('${book.id}', ${ch.id}, ${DEFAULT_PRICE})">Unlock (${DEFAULT_PRICE} Coins)</button></div>`;
      sec.appendChild(cta);
    }

    container.appendChild(sec);

    // load the chapter file and show preview or full content
    fetch(`/books/${book.id}/${ch.file}`).then(r=>r.text()).then(html=>{
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      const body = doc.querySelector('body') || doc;
      if(isFree || isUnlocked) {
        contentDiv.innerHTML = body.innerHTML;
        appendNextButton(contentDiv, ch.id);
      } else {
        const paras = Array.from(body.querySelectorAll('p'));
        contentDiv.innerHTML = paras.slice(0,2).map(p=>p.outerHTML).join('\n') + `<p class="dim">Preview — unlock to read full chapter.</p>`;
      }
    }).catch(e=>{
      contentDiv.innerHTML = '<p class="small">Failed to load chapter content.</p>';
    });
  });
}

// unlock flow
function unlockAndShow(bookId, chId, price){
  if(!confirm(`Unlock chapter ${chId} for ${price} coins?`)) return;
  if(!spendCoins(price)){ openBuyModal(); return; }
  markChapterUnlocked(bookId, chId);
  // reload this chapter content and show full
  const sec = document.getElementById(`ch${chId}`);
  const chapterFile = `${location.pathname.split('/').slice(0,-1).join('/')}/${'chapter-' + chId + '.html'}`; // fallback
  // better: read book.json then fetch file (but simpler: find file element in DOM)
  // We'll re-fetch the book.json to get exact filename
  fetch(`/books/${bookId}/book.json`).then(r=>r.json()).then(book=>{
    const ch = book.chapters.find(c=>c.id===chId);
    if(!ch) return;
    return fetch(`/books/${bookId}/${ch.file}`).then(r=>r.text()).then(html=>{
      const parser = new DOMParser();
      const doc = parser.parseFromString(html,'text/html');
      const body = doc.querySelector('body') || doc;
      sec.querySelector('.content').innerHTML = body.innerHTML;
      appendNextButton(sec.querySelector('.content'), chId);
      // update coin badge
      document.getElementById('coinBadge2').textContent = getCoins();
    });
  }).catch(err => console.error(err));
}
window.unlockAndShow = unlockAndShow;

function appendNextButton(contentEl, currId){
  if(contentEl.querySelector('.next-footer')) return;
  const div = document.createElement('div');
  div.className = 'next-footer';
  div.style.textAlign = 'right';
  div.innerHTML = `<button class="btn" onclick="goToNext(${currId})">Next →</button>`;
  contentEl.appendChild(div);
}

function goToNext(currId){
  const next = currId + 1;
  const el = document.getElementById('ch' + next);
  if(!el) { alert('No next chapter'); return; }
  const bookId = location.pathname.split('/').slice(-2,-1)[0];
  const unlocked = getUnlockedList(bookId);
  if(FREE_CHAPTERS.has(next) || unlocked.has(next)){
    // ensure it's revealed (if not already)
    if(!unlocked.has(next)) markChapterUnlocked(bookId, next);
    el.scrollIntoView({behavior:'smooth'});
    return;
  }
  // otherwise prompt unlock
  unlockAndShow(bookId, next, DEFAULT_PRICE);
}

document.addEventListener('DOMContentLoaded', loadBook);
