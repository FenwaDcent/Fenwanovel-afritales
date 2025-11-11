/* ===========================
   THEME
=========================== */
function applySavedTheme() {
  const saved = localStorage.getItem("fenwa:theme") || "dark";
  document.documentElement.dataset.theme = saved;
  const t = document.getElementById("themeText");
  if (t) t.textContent = saved === "dark" ? "🌙 Dark" : "☀️ Light";
}
function toggleTheme() {
  const html = document.documentElement;
  const next = html.dataset.theme === "light" ? "dark" : "light";
  html.dataset.theme = next;
  localStorage.setItem("fenwa:theme", next);
  const t = document.getElementById("themeText");
  if (t) t.textContent = next === "dark" ? "🌙 Dark" : "☀️ Light";
}
window.toggleTheme = toggleTheme;

/* ===========================
   COINS (localStorage)
=========================== */
const LS_KEY_COINS = "fenwa:coins";

function getCoins() {
  const v = parseInt(localStorage.getItem(LS_KEY_COINS) || "0", 10);
  return Number.isNaN(v) ? 0 : v;
}
function updateCoinBadges(v) {
  document.querySelectorAll(".coin-amount").forEach(el => (el.textContent = v));
}
function setCoins(v) {
  localStorage.setItem(LS_KEY_COINS, String(v));
  updateCoinBadges(v);
}
function addCoins(n) {
  const v = getCoins() + n;
  setCoins(v);
  alert(`✅ Added ${n} coins`);
  closeBuyCoins();
}
function spendCoins(n) {
  const bal = getCoins();
  if (bal < n) return false;
  setCoins(bal - n);
  return true;
}

/* ===========================
   BUY COINS MODAL
=========================== */
function openBuyCoins() {
  const m = document.getElementById("buyCoinsModal");
  if (m) m.hidden = false;
}
function closeBuyCoins() {
  const m = document.getElementById("buyCoinsModal");
  if (m) m.hidden = true;
}
window.openBuyCoins = openBuyCoins;
window.closeBuyCoins = closeBuyCoins;

/* ===========================
   VOUCHERS (simple demo)
=========================== */
const VOUCHERS = {
  FENWA100: 100,
  WELCOME50: 50,
  BLESSED150: 150
};
function redeemVoucher() {
  const input = document.getElementById("voucherInput");
  const code = (input?.value || "").trim().toUpperCase();
  if (!code) return alert("Enter a voucher code.");
  const amount = VOUCHERS[code];
  if (!amount) return alert("❌ Invalid or used code.");
  addCoins(amount);
  alert(`🎉 Voucher applied: +${amount} coins`);
  if (input) input.value = "";
}
window.redeemVoucher = redeemVoucher;

/* ===========================
   UNLOCKED CHAPTERS
   key: fenwa:unlocked:<bookId>  -> [chapterIds...]
=========================== */
function getUnlocked(bookId) {
  try {
    return JSON.parse(localStorage.getItem(`fenwa:unlocked:${bookId}`) || "[]");
  } catch {
    return [];
  }
}
function setUnlocked(bookId, list) {
  localStorage.setItem(`fenwa:unlocked:${bookId}`, JSON.stringify(list));
}
function isUnlocked(bookId, chapterId) {
  return getUnlocked(bookId).includes(chapterId);
}
function unlockChapter(bookId, chapterId, price) {
  if (isUnlocked(bookId, chapterId)) {
    alert("✔ Already unlocked");
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

/* ===========================
   PAYSTACK CHECKOUT
   Requires: <script src="https://js.paystack.co/v1/inline.js"></script>
=========================== */
function getCurrentUserEmail() {
  // If you later add login, store email in localStorage as fenwa:user:email
  return localStorage.getItem("fenwa:user:email") || null;
}
function buyCoinsPaystack(pack) {
  // pack = {label:'50 Coins', coins:50, amountKobo:50000}
  if (typeof PaystackPop === "undefined") {
    alert("Payment library not loaded yet. Please try again.");
    return;
  }
  const handler = PaystackPop.setup({
    key: "pk_test_xxxxxx", // TODO: replace with your Paystack Public Key
    email: getCurrentUserEmail() || "reader@example.com",
    amount: pack.amountKobo, // in kobo
    currency: "NGN",
    ref: "FENWA_" + Date.now(),
    callback: function (res) {
      addCoins(pack.coins);
      alert("✅ Payment successful! Ref: " + res.reference);
      closeBuyCoins();
    },
    onClose: function () {
      // user closed
    }
  });
  handler.openIframe();
}
window.buyCoinsPaystack = buyCoinsPaystack;

/* ===========================
   INIT ON LOAD
=========================== */
document.addEventListener("DOMContentLoaded", () => {
  // Theme
  applySavedTheme();

  // Coins: give initial 85 if first time
  if (!localStorage.getItem(LS_KEY_COINS)) setCoins(85);
  else updateCoinBadges(getCoins());
});
