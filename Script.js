import { auth, onAuthStateChanged, signOut } from './firebase.js';

// Theme
const toggle = document.getElementById('themeToggle');
const saved = localStorage.getItem('theme');
if(saved) document.body.dataset.theme = saved;
toggle?.addEventListener('click', ()=>{
  document.body.dataset.theme = document.body.dataset.theme==='dark' ? 'light' : 'dark';
  localStorage.setItem('theme', document.body.dataset.theme);
});

// Auth name + logout
const welcome = document.getElementById('welcome');
const uName = document.getElementById('uName');
const loginLink = document.getElementById('loginLink');
const logoutBtn = document.getElementById('logoutBtn');

onAuthStateChanged(auth, (user)=>{
  if(user){
    if(loginLink) loginLink.hidden = true;
    if(welcome){ welcome.hidden = false; uName.textContent = user.displayName || 'Reader'; }
    if(logoutBtn){ logoutBtn.hidden = false; logoutBtn.onclick = ()=>signOut(auth); }
  }else{
    welcome?.setAttribute('hidden','');
    logoutBtn?.setAttribute('hidden','');
    loginLink?.removeAttribute('hidden');
  }
});

// Books shown on homepage
const books = [
  {
    id: "echoes-of-broken-vows",
    title: "Echoes of Broken Vows",
    author: "Ajibade Vincent Adefenwa",
    cover: "images/echoes-cover.jpg",
    blurb: "A love betrayed, a promise reborn — healing, choices, and redemption.",
    tags: ["Romance","Christian","Drama"]
  },
  {
    id: "sade-and-fenwa",
    title: "Sade & Fenwa: A Legacy of Love",
    author: "Ajibade Vincent Adefenwa",
    cover: "images/sade-fenwa-cover.jpg",
    blurb: "Humble beginnings, true love, and a legacy that outlives power.",
    tags: ["Romance","African Tales"]
  },
  {
    id: "anatomy-of-power",
    title: "Anatomy of Power",
    author: "Ajibade Vincent Adefenwa",
    cover: "images/anatomy-cover.jpg",
    blurb: "Ambition and betrayal collide in Ekun State’s high-stakes politics.",
    tags: ["Political","Drama","African"]
  }
];

const list = document.getElementById('bookList');
if(list){
  list.innerHTML = books.map(b=>`
    <article class="book">
      <img src="${b.cover}" alt="${b.title} cover">
      <div class="info">
        <h3>${b.title}</h3>
        <p class="muted">${b.author}</p>
        <p>${b.blurb}</p>
        <div class="flex">
          <button class="btn primary" data-id="${b.id}">Read Now</button>
          <div class="tags">${b.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        </div>
      </div>
    </article>
  `).join('');

  list.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-id]');
    if(!btn) return;
    const id = btn.dataset.id;
    // If not logged in, send to login with returnTo
    const user = auth.currentUser;
    if(!user){
      location.href = `login.html?returnTo=${encodeURIComponent('book.html?id='+id)}`;
    }else{
      location.href = `book.html?id=${id}`;
    }
  });
}
