(function(){
  const root = document.documentElement;
  const keyTheme = 'fenwanovels:theme';
  const keyCoins = 'fenwanovels:coins';
  const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  const saved = localStorage.getItem(keyTheme);
  if(saved === 'light' || (!saved && prefersLight)) root.classList.add('light');

  function setTheme(next){
    if(next === 'light') root.classList.add('light'); else root.classList.remove('light');
    localStorage.setItem(keyTheme, next);
    document.getElementById('themeText')?.textContent = next === 'light' ? '☀️ Light' : '🌙 Dark';
  }

  window.toggleTheme = function(){
    const isLight = root.classList.contains('light');
    setTheme(isLight ? 'dark' : 'light');
  };

  // coins (persisted)
  let coins = parseInt(localStorage.getItem(keyCoins) || '85', 10);
  function renderCoins(){ document.querySelectorAll('.coin-amount').forEach(n => n.textContent = coins); }
  window.addEventListener('DOMContentLoaded', renderCoins);

  // init theme label
  window.addEventListener('DOMContentLoaded', ()=>{
    const isLight = root.classList.contains('light');
    document.getElementById('themeText')?.textContent = isLight ? '☀️ Light' : '🌙 Dark';
  });
})();
