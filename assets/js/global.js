/* assets/js/global.js
   Site-wide logic: theme toggle, coin store, buy modal, Paystack scaffold
*/

// ---------- Config ----------
const LS_COINS = "fenwa:coins";
const LS_UNLOCK_PREFIX = "fenwa:unlocked:"; // per-book if needed
const STARTER_COINS = 85;
const DEFAULT_CHAPTER_PRICE = 30;
const PAYSTACK_PUBLIC_KEY = ""; // paste your Paystack public key here to enable real checkout

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
function getCoins(){ return parseInt(localStorage.getItem(LS_COINS) || String(STARTER_COINS),10) || 0; }
function setCoins(n){
  localStorage.setItem(LS_COINS, String(n));
  // update all coin indicators
  document.querySelectorAll('.coin-amount, #coinBadge, #coinBadge2').forEach(el => { if(el) el.textContent = n; });
}
function addCoins(n){ setCoins(getCoins() + Number(n)); alert(`✅ Added ${n} coins`); }
function spendCoins(n){ const bal = getCoins(); if(bal < n) return false; setCoins(bal - n); return true; }
window.getCoins = getCoins; window.setCoins = setCoins; window.addCoins = addCoins; window.spendCoins = spendCoins;

// ---------- Buy modal (simple open/close - safe) ----------
function openBuyModal(){ const m = document.getElementById('buyModal'); if(m){ m.hidden = false; m.style.display='flex'; document.body.style.overflow='hidden'; } }
function closeBuyModal(){ const m = document.getElementById('buyModal'); if(m){ m.hidden = true; m.style.display='none'; document.body.style.overflow=''; } }
window.openBuyModal = openBuyModal; window.closeBuyModal = closeBuyModal;

// ---------- Payment / Demo ----------
function buyCoins(packCoins, label, amountKobo=0){
  // Demo fallback if no public key set
  if(const PAYSTACK_PUBLIC_KEY = "pk_test_6101933f805191dca00fe4...";){
    if(confirm(`Demo mode — add ${packCoins} coins locally?`)){ addCoins(packCoins); closeBuyModal(); }
    return;
  }
  // If you add a Paystack key, this will attempt inline checkout.
  if(typeof PaystackPop === 'undefined'){
    alert('Payment library not loaded (Paystack inline). Demo will add coins instead.');
    addCoins(packCoins); closeBuyModal(); return;
  }
  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: localStorage.getItem('fenwa:user-email') || 'buyer@example.com',
    amount: amountKobo,
    currency: 'NGN',
    ref: 'FENWA_' + Date.now(),
    callback: function(response){
      addCoins(packCoins);
      alert('Payment successful. Ref: ' + response.reference);
      closeBuyModal();
    },
    onClose: function(){}
  });
  handler.openIframe();
}
window.buyCoins = buyCoins;

// ---------- Vouchers (demo) ----------
const VOUCHERS = { "FENWA100":100, "WELCOME50":50, "BLESSED150":150 };
function redeemVoucher(code){
  const c = (code || document.getElementById('voucherInput')?.value || '').trim().toUpperCase();
  if(!c) return alert('Enter voucher code.');
  const amount = VOUCHERS[c];
  if(!amount) return alert('Invalid or used voucher.');
  addCoins(amount);
  if(document.getElementById('voucherInput')) document.getElementById('voucherInput').value = '';
}
window.redeemVoucher = redeemVoucher;

// ---------- DOM READY: install modal listeners safely ----------
document.addEventListener('DOMContentLoaded', () => {
  // give starter coins if none exist
  if(!localStorage.getItem(LS_COINS)) localStorage.setItem(LS_COINS, String(STARTER_COINS));
  setCoins(getCoins());

  // theme init
  initTheme();

  // button hooks
  document.getElementById('buyBtn')?.addEventListener('click', openBuyModal);
  document.getElementById('buyBtn2')?.addEventListener('click', openBuyModal); // reader header buy button (if present)

  // modal safe wiring
  const modal = document.getElementById('buyModal');
  const closeBtn = document.getElementById('closeBuyModalBtn');
  const packs = modal ? Array.from(modal.querySelectorAll('.pack')) : [];
  const redeemBtn = document.getElementById('redeemBtn');

  if(modal){ modal.hidden = true; modal.style.display = 'none'; }

  // close button
  if (closeBtn) closeBtn.addEventListener('click', () => { closeBuyModal(); });

  // click outside to close
  if (modal){
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeBuyModal();
    });
  }

  // ESC to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeBuyModal();
  });

  // packs: data-coins and data-kobo attributes used
  packs.forEach(btn => {
    btn.addEventListener('click', function(){
      const coins = Number(this.dataset.coins || 0);
      const kobo = Number(this.dataset.kobo || 0);
      if(!PAYSTACK_PUBLIC_KEY){
        if(confirm(`Demo mode — add ${coins} coins locally?`)){ addCoins(coins); closeBuyModal(); }
        return;
      }
      buyCoins(coins, `${coins} Coins`, kobo);
    });
  });

  // redeem button
  if(redeemBtn){
    redeemBtn.addEventListener('click', function(){
      const code = (document.getElementById('voucherInput')?.value || '').trim().toUpperCase();
      if(!code) return alert('Enter voucher code.');
      const demo = { FENWA100:100, WELCOME50:50, BLESSED150:150 };
      const amount = demo[code];
      if(!amount) return alert('Invalid voucher code.');
      addCoins(amount);
      alert(`🎉 Voucher applied: +${amount} coins`);
      document.getElementById('voucherInput').value = '';
      closeBuyModal();
    });
  }
});
