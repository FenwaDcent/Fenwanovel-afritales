// Theme: load + toggle + persist
(function initTheme(){
  const saved = localStorage.getItem("theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if(saved === "light"){ document.documentElement.classList.add("light"); }
  else if(saved === "dark"){ document.documentElement.classList.remove("light"); }
  else { // no saved: follow system
    if(!prefersDark){ document.documentElement.classList.add("light"); }
  }
})();
document.addEventListener("DOMContentLoaded", ()=>{
  const btn = document.getElementById("themeToggle");
  if(btn){
    btn.addEventListener("click", ()=>{
      const isLight = document.documentElement.classList.toggle("light");
      localStorage.setItem("theme", isLight ? "light" : "dark");
      btn.textContent = isLight ? "☀️" : "🌙";
    });
    // set icon
    btn.textContent = document.documentElement.classList.contains("light") ? "☀️" : "🌙";
  }
  const year = document.getElementById("year");
  if(year) year.textContent = new Date().getFullYear();
  const coin = document.getElementById("coinCount");
  if(coin){ coin.textContent = localStorage.getItem("coins") || "85"; }
});

// Simple chapter reader (book pages use this)
function readChapterInto(containerId, title, text){
  const el = document.getElementById(containerId);
  if(!el) return alert("Reader not found.");
  el.innerHTML = `<h3 style="margin:.2rem 0 1rem">${title}</h3>${text}`;
  window.scrollTo({top: el.offsetTop - 80, behavior: "smooth"});
}
