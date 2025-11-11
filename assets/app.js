<!-- Echoes of Broken Vows -->
<article class="card">
  <img src="covers/echoes-of-broken-vows.jpg" alt="Echoes of Broken Vows cover">
 <script>
  function toggleTheme(){
    const html = document.documentElement;
    const next = html.dataset.theme === 'light' ? 'dark' : 'light';
    html.dataset.theme = next;
    localStorage.setItem('theme', next);
    document.getElementById('themeText').textContent = next === 'dark' ? '🌙 Dark' : '☀️ Light';
  }
  // on load
  (function(){
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.dataset.theme = saved;
    document.getElementById('themeText').textContent = saved === 'dark' ? '🌙 Dark' : '☀️ Light';
  })();
</script>
  <div class="card-body">
    <h3>Echoes of Broken Vows</h3>
    <p>A moving tale of love, loss, and redemption — where broken promises echo louder than silence.</p>
    <div class="meta">By Ajibade Vincent Adefenwa • Romance/Drama</div>
    <div class="actions">
      <a class="btn primary" href="reader.html?book=echoes-of-broken-vows">Read now</a>
      <a class="btn" href="mailto:vfenwa100@gmail.com">Contact</a>
    </div>
  </div>
</article>

<!-- Ṣadé & Fenwa -->
<article class="card">
  <img src="covers/sade-and-fenwa.jpg" alt="Ṣadé & Fenwa cover">
  <script>
  function toggleTheme(){
    const html = document.documentElement;
    const next = html.dataset.theme === 'light' ? 'dark' : 'light';
    html.dataset.theme = next;
    localStorage.setItem('theme', next);
    document.getElementById('themeText').textContent = next === 'dark' ? '🌙 Dark' : '☀️ Light';
  }
  // on load
  (function(){
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.dataset.theme = saved;
    document.getElementById('themeText').textContent = saved === 'dark' ? '🌙 Dark' : '☀️ Light';
  })();
</script>
  <div class="card-body">
    <h3>Ṣadé &amp; Fenwa: A Legacy of Love</h3>
    <p>120-chapter Nigerian romance about humility, legacy, and true love that stands the test.</p>
    <div class="meta">By Ajibade Vincent Adefenwa • Romance</div>
    <div class="actions">
      <a class="btn primary" href="reader.html?book=sade-and-fenwa">Read now</a>
      <a class="btn" href="mailto:vfenwa100@gmail.com">Contact</a>
    </div>
  </div>
</article>

<!-- The Anatomy of Power -->
<article class="card">
  <img src="covers/anatomy-of-power.jpg" alt="The Anatomy of Power cover">
 <script>
  function toggleTheme(){
    const html = document.documentElement;
    const next = html.dataset.theme === 'light' ? 'dark' : 'light';
    html.dataset.theme = next;
    localStorage.setItem('theme', next);
    document.getElementById('themeText').textContent = next === 'dark' ? '🌙 Dark' : '☀️ Light';
  }
  // on load
  (function(){
    const saved = localStorage.getItem('theme') || 'dark';
    document.documentElement.dataset.theme = saved;
    document.getElementById('themeText').textContent = saved === 'dark' ? '🌙 Dark' : '☀️ Light';
  })();
</script>
  <div class="card-body">
    <h3>The Anatomy of Power</h3>
    <p>A bold, political fiction about godfathers, elections, and the price of truth in Ekun State.</p>
    <div class="meta">By Ajibade Vincent Adefenwa • Political Fiction</div>
    <div class="actions">
      <a class="btn primary" href="reader.html?book=anatomy-of-power">Read now</a>
      <a class="btn" href="mailto:vfenwa100@gmail.com">Contact</a>
    </div>
  </div>
</article>

/* ======== COIN STORAGE ======== */
const LS_KEY_COINS = "fenwa:coins";
function getCoins() {
  const v = parseInt(localStorage.getItem(LS_KEY_COINS) || "0", 10);
  return isNaN(v) ? 0 : v;
}
function setCoins(v) {
  localStorage.setItem(LS_KEY_COINS, String(v));
  // update all coin displays on page
  document.querySelectorAll(".coin-amount").forEach(el => el.textContent = v);
}
function addCoins(n) { setCoins(getCoins() + n); alert(`✅ Added ${n} coins`); closeBuyCoins(); }
function spendCoins(n) {
  const bal = getCoins();
  if (bal < n) return false;
  setCoins(bal - n);
  return true;
}

/* ======== INIT COIN DISPLAY ======== */
document.addEventListener("DOMContentLoaded", () => {
  if (!localStorage.getItem(LS_KEY_COINS)) setCoins(85); // initial free coins
  else setCoins(getCoins());
});

/* ======== BUY COINS MODAL ======== */
function openBuyCoins(){ document.getElementById("buyCoinsModal").hidden = false; }
function closeBuyCoins(){ document.getElementById("buyCoinsModal").hidden = true; }
window.openBuyCoins = openBuyCoins;
window.closeBuyCoins = closeBuyCoins;
window.addCoins = addCoins;

/* ======== VOUCHERS (simple demo) ======== */
const VOUCHERS = {
  "FENWA100": 100,
  "WELCOME50": 50,
  "BLESSED150": 150
};
function redeemVoucher(){
  const input = document.getElementById("voucherInput");
  const code = (input.value || "").trim().toUpperCase();
  if (!code) return alert("Enter a voucher code.");
  const amount = VOUCHERS[code];
  if (!amount) return alert("❌ Invalid or used code.");
  addCoins(amount);
  alert(`🎉 Voucher applied: +${amount} coins`);
  input.value = "";
}
window.redeemVoucher = redeemVoucher;

/* ======== UNLOCK CHAPTERS ========
   Mark unlocked chapters in localStorage using: fenwa:unlocked:<bookId>
*/
function getUnlocked(bookId){
  try {
    return JSON.parse(localStorage.getItem(`fenwa:unlocked:${bookId}`) || "[]");
  } catch { return []; }
}
function setUnlocked(bookId, list){
  localStorage.setItem(`fenwa:unlocked:${bookId}`, JSON.stringify(list));
}
function isUnlocked(bookId, chapterId){
  return getUnlocked(bookId).includes(chapterId);
}
function unlockChapter(bookId, chapterId, price){
  if (isUnlocked(bookId, chapterId)) {
    alert("Already unlocked ✔");
    return true;
  }
  if (!spendCoins(price)) {
    alert("Not enough coins. Tap ‘Buy Coins’ to top up.");
    openBuyCoins();
    return false;
  }
  const list = getUnlocked(bookId);
  list.push(chapterId);
  setUnlocked(bookId, list);
  alert(`🔓 Chapter ${chapterId} unlocked!`);
  return true;
}
window.unlockChapter = unlockChapter;

/* ======== THEME TOGGLE (optional) ======== */
function toggleTheme(){
  const dark = document.documentElement.classList.toggle("dark");
  document.getElementById("themeText").textContent = dark ? "☀️ Light" : "🌙 Dark";
}
window.toggleTheme = toggleTheme;
