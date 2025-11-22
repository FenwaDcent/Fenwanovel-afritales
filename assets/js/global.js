/* assets/js/global.js
   Site-wide logic: theme toggle, coin store, buy modal, Paystack scaffold.
   - Safe demo fallback when Paystack is not available.
   - DO NOT put your Paystack SECRET key here.
*/

const LS_COINS = "fenwa:coins";
const LS_UNLOCK_PREFIX = "fenwa:unlocked:";
const STARTER_COINS = 85;
const DEFAULT_CHAPTER_PRICE = 30;

// Put only your Paystack PUBLIC key here. This is safe in frontend.
const PAYSTACK_PUBLIC_KEY = "pk_test_6101933f805191dca00fe2184fc954cec3b8ec10";

// Theme management
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

// Coins
function getCoins(){ return parseInt(localStorage.getItem(LS_COINS) || String(STARTER_COINS),10) || 0; }
function setCoins(n){
  localStorage.setItem(LS_COINS, String(n));
  document.querySelectorAll('.coin-amount, #coinBadge, #coinBadge2').forEach(el => { if(el) el.textContent = n; });
}
function addCoins(n){ setCoins(getCoins() + Number(n)); alert(`✅ Added ${n} coins`); }
function spendCoins(n){ const bal = getCoins(); if(bal < n) return false; setCoins(bal - n); return true; }
window.getCoins = getCoins; window.setCoins = setCoins; window.addCoins = addCoins; window.spendCoins = spendCoins;

// Buy modal open/close
function openBuyModal(){ const m = document.getElementById('buyModal'); if(m){ m.hidden = false; m.style.display='flex'; document.body.style.overflow='hidden'; } }
function closeBuyModal(){ const m = document.getElementById('buyModal'); if(m){ m.hidden = true; m.style.display='none'; document.body.style.overflow=''; } }
window.openBuyModal = openBuyModal; window.closeBuyModal = closeBuyModal;

// BuyCoins - uses Paystack inline if key present & PaystackPop loaded, otherwise demo fallback
function buyCoins(packCoins, label, amountKobo=0){
  // If no public key configured, fallback to demo mode
  if(!PAYSTACK_PUBLIC_KEY){
    if(confirm(`Demo mode — add ${packCoins} coins locally?`)){ addCoins(packCoins); closeBuyModal(); }
    return;
  }

  // If Paystack inline script not available, fallback to demo
  if(typeof PaystackPop === 'undefined'){
    if(confirm('Payment library not loaded (Paystack). Add coins in demo mode?')){
      addCoins(packCoins);
      closeBuyModal();
    } else {
      alert('Please ensure Paystack inline script is loaded on the page.');
    }
    return;
  }

  // Create Paystack handler (test mode)
  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: localStorage.getItem('fenwa:user-email') || 'buyer@example.com',
    amount: amountKobo,
    currency: 'NGN',
    ref: 'FENWA_' + Date.now(),
    callback: function(response){
      // On success add coins (server should verify using secret key in production)
      addCoins(packCoins);
      alert('Payment successful. Ref: ' + response.reference);
      closeBuyModal();
    },
    onClose: function(){}
  });
  handler.openIframe();
}
window.buyCoins = buyCoins;

// Vouchers (demo)
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

// DOM ready: modal + theme + starter coin logic
document.addEventListener('DOMContentLoaded', () => {
  if(!localStorage.getItem(LS_COINS)) localStorage.setItem(LS_COINS, String(STARTER_COINS));
  setCoins(getCoins());
  initTheme();

  document.getElementById('buyBtn')?.addEventListener('click', openBuyModal);
  document.getElementById('buyBtn2')?.addEventListener('click', openBuyModal);

  const modal = document.getElementById('buyModal');
  const closeBtn = document.getElementById('closeBuyModalBtn');
  const packs = modal ? Array.from(modal.querySelectorAll('.pack')) : [];
  const redeemBtn = document.getElementById('redeemBtn');

  if(modal){ modal.hidden = true; modal.style.display = 'none'; }

  if (closeBtn) closeBtn.addEventListener('click', () => { closeBuyModal(); });
  if (modal){
    modal.addEventListener('click', (e) => { if (e.target === modal) closeBuyModal(); });
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeBuyModal(); });

  packs.forEach(btn => {
    btn.addEventListener('click', function(){
      const coins = Number(this.dataset.coins || 0);
      const kobo = Number(this.dataset.kobo || 0);
      // If no public key, demo; otherwise call buyCoins
      if(!PAYSTACK_PUBLIC_KEY){
        if(confirm(`Demo mode — add ${coins} coins locally?`)){ addCoins(coins); closeBuyModal(); }
        return;
      }
      buyCoins(coins, `${coins} Coins`, kobo);
    });
  });

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
