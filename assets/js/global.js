/* assets/js/global.js
   Site-wide logic: theme toggle, coin store, buy modal scaffold, voucher demo
*/

// ---------- Config ----------
const LS_COINS = "fenwa:coins";        // single coins key (consistent)
const LS_UNLOCK_PREFIX = "fenwa:unlocked:"; // per-book unlocked list prefix
const STARTER_COINS = 85;
const DEFAULT_CHAPTER_PRICE = 30; // change if you want

// Paystack public key (paste your key here to enable inline)
const PAYSTACK_PUBLIC_KEY = ""; // e.g. "pk_live_xxxxx" or "pk_test_xxxxx"

// ---------- Theme ----------
function setTheme(theme){
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('fenwa:theme', theme);
  const t = document.getElementById('themeText');
  if(t) t.textContent = theme === 'dark' ? '🌙 Dark' : '☀️ Light';
}
function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme') || 'dark';
  setTheme(cur === 'dark' ? 'light' : 'dark');
}
function initTheme(){
  const saved = localStorage.getItem('fenwa:theme') || 'dark';
  setTheme(saved);
}
window.toggleTheme = toggleTheme;

// ---------- Coins ----------
function getCoins(){
  return parseInt(localStorage.getItem(LS_COINS) || String(STARTER_COINS), 10) || 0;
}
function setCoins(n){
  localStorage.setItem(LS_COINS, String(n));
  document.querySelectorAll('.coin-amount').forEach(el => el.textContent = n);
  document.querySelectorAll('#coinBadge, #coinBadge2, .coin-amount').forEach(el=>{
    // keep badge elements in sync too
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

// ---------- Buy modal (simple) ----------
function openBuyModal(){ const m = document.getElementById('buyModal'); if(m) m.hidden = false; }
function closeBuyModal(){ const m = document.getElementById('buyModal'); if(m) m.hidden = true; }
window.openBuyModal = openBuyModal;
window.closeBuyModal = closeBuyModal;

// Demo buy flow: if PAYSTACK_PUBLIC_KEY is empty, this will simulate purchase
function buyCoins(packCoins, label, amountKobo=0){
  if(!PAYSTACK_PUBLIC_KEY){
    // demo flow
    if(confirm(`Demo: Add ${packCoins} coins to your balance? (${label})`)){
      addCoins(packCoins);
      closeBuyModal();
    }
    return;
  }

  // real Paystack inline (scaffold). Server verification recommended for production.
  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: localStorage.getItem('fenwa:user-email') || 'buyer@example.com',
    amount: amountKobo,
    currency: 'NGN',
    ref: 'FENWA_' + Date.now(),
    callback: function(response){
      // IMPORTANT: verify server-side in production before granting coins
      addCoins(packCoins);
      alert('Payment successful. Ref: ' + response.reference);
      closeBuyModal();
    },
    onClose: function(){ /* user closed */ }
  });
  handler.openIframe();
}
window.buyCoins = buyCoins;

// ---------- Voucher demo ----------
const VOUCHERS = { "FENWA100": 100, "WELCOME50": 50, "BLESSED150": 150 };
function redeemVoucher(code){
  const c = (code || document.getElementById('voucherInput')?.value || '').trim().toUpperCase();
  if(!c) return alert('Enter voucher code.');
  const amount = VOUCHERS[c];
  if(!amount) return alert('Invalid or used voucher.');
  addCoins(amount);
  alert(`🎉 Voucher applied: +${amount} coins`);
  if(document.getElementById('voucherInput')) document.getElementById('voucherInput').value = '';
}
window.redeemVoucher = redeemVoucher;

// ---------- Init on load ----------
document.addEventListener('DOMContentLoaded', ()=>{
  if(!localStorage.getItem(LS_COINS)) localStorage.setItem(LS_COINS, String(STARTER_COINS));
  setCoins(getCoins());
  initTheme();
  // attach buy buttons if present
  document.getElementById('buyBtn')?.addEventListener('click', openBuyModal);
  document.getElementById('buyBtn2')?.addEventListener('click', openBuyModal);
  document.getElementById('buyModal')?.addEventListener('click', e => { if(e.target === e.currentTarget) closeBuyModal(); });
});
