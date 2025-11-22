/* assets/js/global.js
   Fenwanovels — Core script
   Handles: theme, coins, modal, Paystack checkout
*/

/* -------------------------
   CONFIG
------------------------- */
const LS_COINS = "fenwa:coins";
const STARTER_COINS = 85;
const DEFAULT_CHAPTER_PRICE = 30;

// ✅ YOUR PAYSTACK PUBLIC KEY (paste it here)
const PAYSTACK_PUBLIC_KEY = "pk_test_6101933f805191dca00fe4..."; 
// Replace ONLY this key ↑ with your full Paystack test key.



/* -------------------------
   THEME SYSTEM
------------------------- */
function setTheme(theme){
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("fenwa:theme", theme);

  const t = document.getElementById("themeText");
  if(t){
    t.textContent = theme === "dark" ? "🌙 Dark" : "☀️ Light";
  }
}

function toggleTheme(){
  const cur = document.documentElement.getAttribute("data-theme") || "dark";
  setTheme(cur === "dark" ? "light" : "dark");
}

function initTheme(){
  const saved = localStorage.getItem("fenwa:theme") || "dark";
  setTheme(saved);
}

window.toggleTheme = toggleTheme;



/* -------------------------
   COINS SYSTEM
------------------------- */
function getCoins(){
  return parseInt(localStorage.getItem(LS_COINS) || String(STARTER_COINS), 10) || 0;
}

function setCoins(n){
  localStorage.setItem(LS_COINS, String(n));

  document.querySelectorAll(".coin-amount, #coinBadge, #coinBadge2").forEach(el=>{
    if(el) el.textContent = n;
  });
}

function addCoins(n){
  setCoins(getCoins() + Number(n));
  alert(`✅ Added ${n} coins`);
}

function spendCoins(n){
  const bal = getCoins();
  if(bal < n) return false;

  setCoins(bal - n);
  return true;
}

window.getCoins = getCoins;
window.setCoins = setCoins;
window.addCoins = addCoins;
window.spendCoins = spendCoins;



/* -------------------------
   MODAL SYSTEM
------------------------- */
function openBuyModal(){
  const m = document.getElementById("buyModal");
  if(!m) return;

  m.hidden = false;
  m.style.display = "flex";

  document.body.style.overflow = "hidden";
}

function closeBuyModal(){
  const m = document.getElementById("buyModal");
  if(!m) return;

  m.hidden = true;
  m.style.display = "none";

  document.body.style.overflow = "";
}

window.openBuyModal = openBuyModal;
window.closeBuyModal = closeBuyModal;



/* -------------------------
   PAYSTACK CHECKOUT
------------------------- */
function buyCoins(packCoins, label, amountKobo=0){
  // If no Paystack key is added → run demo mode
  if(!PAYSTACK_PUBLIC_KEY){
    if(confirm(`Demo mode — add ${packCoins} coins locally?`)){
      addCoins(packCoins);
      closeBuyModal();
    }
    return;
  }

  // Paystack library missing?
  if(typeof PaystackPop === "undefined"){
    alert("Paystack library not loaded. Demo mode will add coins instead.");
    addCoins(packCoins);
    closeBuyModal();
    return;
  }

  // Real Paystack payment
  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: localStorage.getItem("fenwa:user-email") || "buyer@example.com",
    amount: amountKobo,
    currency: "NGN",
    ref: "FENWA_" + Date.now(),

    callback: function (response){
      addCoins(packCoins);
      alert("Payment successful! Ref: " + response.reference);
      closeBuyModal();
    },

    onClose: function(){
      // user closed payment popup
    }
  });

  handler.openIframe();
}

window.buyCoins = buyCoins;



/* -------------------------
   VOUCHERS (DEMO)
------------------------- */
const VOUCHERS = {
  "FENWA100": 100,
  "WELCOME50": 50,
  "BLESSED150": 150
};

function redeemVoucher(){
  const input = document.getElementById("voucherInput");
  if(!input) return;

  const code = input.value.trim().toUpperCase();
  if(!code) return alert("Enter a voucher code.");

  const amount = VOUCHERS[code];
  if(!amount) return alert("Invalid voucher code.");

  addCoins(amount);
  alert(`🎉 Voucher applied: +${amount} coins`);

  input.value = "";
}

window.redeemVoucher = redeemVoucher;



/* -------------------------
   DOM READY INITIALIZATION
------------------------- */
document.addEventListener("DOMContentLoaded", ()=>{

  // Coins: give first-time users 85 coins
  if(!localStorage.getItem(LS_COINS)){
    localStorage.setItem(LS_COINS, String(STARTER_COINS));
  }
  setCoins(getCoins());

  // Theme
  initTheme();

  // Buy buttons
  document.getElementById("buyBtn")?.addEventListener("click", openBuyModal);
  document.getElementById("buyBtn2")?.addEventListener("click", openBuyModal);

  // Modal close button
  document.getElementById("closeBuyModalBtn")?.addEventListener("click", closeBuyModal);

  // Click outside to close modal
  const modal = document.getElementById("buyModal");
  if(modal){
    modal.addEventListener("click", (e)=>{
      if(e.target === modal) closeBuyModal();
    });
  }

  // Voucher button
  document.getElementById("redeemBtn")?.addEventListener("click", redeemVoucher);

  // Coin packs
  document.querySelectorAll(".pack").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const coins = Number(btn.dataset.coins || 0);
      const kobo = Number(btn.dataset.kobo || 0);

      buyCoins(coins, `${coins} Coins`, kobo);
    });
  });
});
