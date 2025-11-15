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
  document.querySelectorAll('.coin-amount, #coinBadge, #coinBadge2').forEach(el => { if(el) el.textContent = n; });
}
function addCoins(n){ setCoins(getCoins() + Number(n)); alert(`✅ Added ${n} coins`); }
function spendCoins(n){ const bal = getCoins(); if(bal < n) return false; setCoins(bal - n); return true; }
window.getCoins = getCoins; window.setCoins = setCoins; window.addCoins = addCoins; window.spendCoins = spendCoins;

// ---------- Buy modal ----------
function openBuyModal(){ const m = document.getElementById('buyModal'); if(m) m.hidden = false; }
function closeBuyModal(){ const m = document.getElementById('buyModal'); if(m) m.hidden = true; }
window.openBuyModal = openBuyModal; window.closeBuyModal = closeBuyModal;

// ---------- Payment / Demo ----------
function buyCoins(packCoins, label, amountKobo=0){
  if(!PAYSTACK_PUBLIC_KEY){
    if(confirm(`Demo mode — add ${packCoins} coins locally?`)){ addCoins(packCoins); closeBuyModal(); }
    return;
  }
  // Paystack inline checkout (scaffold). Server verification required in production.
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
  const amount = VOUCHERS[c]; if(!amount) return alert('Invalid or used voucher.');
  addCoins(amount); alert(`🎉 Voucher applied: +${amount} coins`); if(document.getElementById('voucherInput')) document.getElementById('voucherInput').value = '';
}
window.redeemVoucher = redeemVoucher;

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', ()=>{
  if(!localStorage.getItem(LS_COINS)) localStorage.setItem(LS_COINS, String(STARTER_COINS));
  setCoins(getCoins());
  initTheme();
  document.getElementById('buyBtn')?.addEventListener('click', openBuyModal);
  document.getElementById('buyModal')?.addEventListener('click', (e)=>{ if(e.target === e.currentTarget) closeBuyModal(); });
});

/* ===== Modal safety & handlers - paste at end of assets/js/global.js ===== */
(function(){
  // safe refs
  const modal = document.getElementById('buyModal');
  const closeBtn = document.getElementById('closeBuyModalBtn');
  const packs = modal ? modal.querySelectorAll('.pack') : [];
  const redeemBtn = document.getElementById('redeemBtn');

  // make sure modal is hidden on load
  if(modal){ modal.hidden = true; modal.style.display = 'none'; }

  function showModal(){
    if(!modal) return;
    modal.hidden = false;
    modal.style.display = 'flex';
    // prevent background scroll while modal open
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
  function hideModal(){
    if(!modal) return;
    modal.hidden = true;
    modal.style.display = 'none';
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  // attach to global functions used elsewhere
  window.openBuyModal = showModal;
  window.closeBuyModal = hideModal;

  // close button
  if(closeBtn) closeBtn.addEventListener('click', hideModal);

  // click outside to close
  if(modal){
    modal.addEventListener('click', function(e){
      if(e.target === modal) hideModal();
    });
  }

  // ESC to close
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') hideModal();
  });

  // coin packs -> demo add or paystack
  packs.forEach(btn => {
    btn.addEventListener('click', function(){
      const coins = Number(this.dataset.coins || 0);
      const kobo = Number(this.dataset.kobo || 0);
      // if PAYSTACK_PUBLIC_KEY is empty -> demo
      if(typeof PAYSTACK_PUBLIC_KEY === 'undefined' || !PAYSTACK_PUBLIC_KEY){
        if(confirm(`Demo mode — add ${coins} coins locally?`)){
          addCoins(coins);
          hideModal();
        }
        return;
      }
      // else call buyCoins(pack) function if available
      if(typeof buyCoins === 'function'){
        buyCoins(coins, `${coins} Coins`, kobo);
      } else {
        // fallback
        alert('Payment not configured. Demo fallback will add coins.');
        addCoins(coins);
        hideModal();
      }
    });
  });

  // redeem voucher
  if(redeemBtn){
    redeemBtn.addEventListener('click', function(){
      const code = (document.getElementById('voucherInput')?.value || '').trim().toUpperCase();
      if(!code) return alert('Enter voucher code.');
      // demo voucher map - keep in sync with your other code
      const demo = { FENWA100:100, WELCOME50:50, BLESSED150:150 };
      const amount = demo[code];
      if(!amount) return alert('Invalid voucher code.');
      addCoins(amount);
      alert(`🎉 Voucher applied: +${amount} coins`);
      document.getElementById('voucherInput').value = '';
      hideModal();
    });
  }

  // defensive: prevent auto-open unless function calls openBuyModal()
  // (if your old code calls openBuyModal() on load, remove that call)
  // we ensure modal stays hidden until user clicks "Buy Coins"
})();
