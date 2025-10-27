// Theme
const root = document.documentElement;
const savedTheme = localStorage.getItem("theme");
if (savedTheme) root.setAttribute("data-theme", savedTheme);
document.getElementById("themeToggle")?.addEventListener("click", () => {
  const t = root.getAttribute("data-theme") === "light" ? "" : "light";
  if (t) root.setAttribute("data-theme", t); else root.removeAttribute("data-theme");
  localStorage.setItem("theme", t);
});

// Coins (simple demo wallet)
const BALANCE_KEY = "fenwanovels_coins";
function getCoins(){ return parseInt(localStorage.getItem(BALANCE_KEY) || "120", 10); }
function setCoins(n){ localStorage.setItem(BALANCE_KEY, String(n)); updateCoinUI(); }
function updateCoinUI(){
  const el = document.getElementById("coinBalance");
  if (el) el.textContent = getCoins();
}
updateCoinUI();

// Login modal (demo)
const loginModal = document.getElementById("loginModal");
document.getElementById("loginBtn")?.addEventListener("click", ()=> loginModal.showModal());
document.getElementById("loginSubmit")?.addEventListener("click", ()=>{
  const name = document.getElementById("name")?.value?.trim();
  if (name) localStorage.setItem("fenwa_user", name);
  loginModal.close();
});

// Shelf (demo)
function addToShelf(id){
  const key = "fenwa_shelf";
  const shelf = JSON.parse(localStorage.getItem(key) || "[]");
  if (!shelf.includes(id)) shelf.push(id);
  localStorage.setItem(key, JSON.stringify(shelf));
  alert("Added to your shelf ✅");
}
window.addToShelf = addToShelf;

// Year
document.getElementById("year")?.append(new Date().getFullYear());

// Reader helpers (used by book pages)
window.Reader = {
  getCoins, setCoins,
  unlock(chId, price=30, storeKey){
    const owned = new Set(JSON.parse(localStorage.getItem(storeKey) || "[]"));
    if (owned.has(chId)) return true;
    let c = getCoins();
    if (c < price){ alert("❌ Not enough coins."); return false; }
    if (!confirm(`Unlock chapter ${chId} for ${price} coins?`)) return false;
    c -= price; setCoins(c);
    owned.add(chId);
    localStorage.setItem(storeKey, JSON.stringify([...owned]));
    alert("🔓 Chapter unlocked!");
    return true;
  },
  has(storeKey, chId){
    const owned = new Set(JSON.parse(localStorage.getItem(storeKey) || "[]"));
    return owned.has(chId);
  }
};