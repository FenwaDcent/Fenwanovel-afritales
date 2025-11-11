// Simple query-param helper
function getParam(name){
  return new URL(location.href).searchParams.get(name);
}
const slug = getParam('book'); // e.g. before-you-die-empty

// Theme toggle
const html = document.documentElement;
document.getElementById('toggle').onclick = ()=>{
  html.dataset.theme = html.dataset.theme === 'light' ? 'dark' : 'light';
  localStorage.setItem('theme', html.dataset.theme);
};
html.dataset.theme = localStorage.getItem('theme') || 'dark';

// Load JSON
async function boot(){
  if(!slug){ document.getElementById('content').innerHTML = "<p>No book selected.</p>"; return; }
  const res = await fetch(`books/${slug}.json`);
  const book = await res.json();

  // Header/meta
  document.title = `${book.title} — Read | Fenwanovels`;
  document.getElementById('book-title').innerHTML =
    `<div><strong>${book.title}</strong><br><small>By ${book.author}</small></div>`;
  const cover = document.getElementById('book-cover');
  cover.src = book.cover || 'covers/placeholder.jpg';
  cover.alt = `${book.title} cover`;
  document.getElementById('book-blurb').innerHTML = `<p>${book.blurb}</p>`;

  // TOC
  const toc = document.getElementById('toc');
  book.chapters.forEach((ch, i)=>{
    const a = document.createElement('a');
    a.href = `#c${i+1}`;
    a.textContent = ch.title || `Chapter ${i+1}`;
    toc.appendChild(a);
  });

  // Chapters (with pagination memory)
  const content = document.getElementById('content');
  content.innerHTML = '';
  book.chapters.forEach((ch, i)=>{
    const sec = document.createElement('section');
    sec.className = 'chapter';
    sec.id = `c${i+1}`;
    sec.innerHTML = `<h2>${ch.title || 'Chapter ' + (i+1)}</h2>${ch.html}`;
    content.appendChild(sec);
  });

  // Prev/Next buttons
  let index = 0;
  function go(n){
    index = Math.max(0, Math.min(book.chapters.length-1, n));
    location.hash = `#c${index+1}`;
    document.getElementById('c'+(index+1)).scrollIntoView({behavior:'smooth', block:'start'});
    localStorage.setItem(`pos:${slug}`, index);
  }
  document.getElementById('prev').onclick = ()=>go(index-1);
  document.getElementById('next').onclick = ()=>go(index+1);

  // Restore last position
  const saved = +localStorage.getItem(`pos:${slug}`);
  if(!isNaN(saved)) go(saved);
}
boot();
