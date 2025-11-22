/* assets/js/global.js
   Site-wide logic: theme toggle, coin store, buy modal, Paystack scaffold
   Safe and corrected — ready to upload.
*/

// ---------- Config ----------
const LS_COINS = "fenwa:coins";
const LS_UNLOCK_PREFIX = "fenwa:unlocked:"; // per-book if needed (unused here but handy)
const STARTER_COINS = 85;
const DEFAULT_CHAPTER_PRICE = 30;
// Paste your Paystack public key here to enable real checkout. Keep empty for demo mode.
const PAYSTACK_PUBLIC_KEY = ""; // e.g. "pk_test_XXXXXXXXXXXX"

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
  const raw = localStorage.getItem(LS_COINS);
  if(raw == null) return STARTER_COINS;
  const v = parseInt(raw, 10);
  return Number.isNaN(v) ? 0 : v;
}
function updateCoinDisplays(n){
  document.querySelectorAll('.coin-amount, #coinBadge, #coinBadge2').forEach(el => {
    if(el) el.textContent = n;
  });
}
function setCoins(n){
  const v = Number(n) || 0;
  localStorage.setItem(LS_COINS, String(v));
  updateCoinDisplays(v);
}
function addCoins(n){
  const amount = Number(n) || 0;
  setCoins(getCoins() + amount);
  // small UX feedback
  try { alert('✅ Added ' + amount + ' TatiCoin'); } catch(e){}
}
function spendCoins(n){
  const price = Number(n) || 0;
  const bal = getCoins();
  if(bal < price) return false;
  setCoins(bal - price);
  return true;
}
window.getCoins = getCoins;
window.setCoins = setCoins;
window.addCoins = addCoins;
window.spendCoins = spendCoins;

// ---------- Buy modal (open / close safe) ----------
function openBuyModal(){
  const m = document.getElementById('buyModal');
  if(m){
    m.hidden = false;
    m.style.display = 'flex';
    // prevent background scrolling
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }
}
function closeBuyModal(){
  const m = document.getElementById('buyModal');
  if(m){
    m.hidden = true;
    m.style.display = 'none';
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }
}
window.openBuyModal = openBuyModal;
window.closeBuyModal = closeBuyModal;

// ---------- Payment / Demo ----------
function buyCoins(packCoins, label, amountKobo = 0){
  // Demo fallback when PAYSTACK_PUBLIC_KEY not set
  if(!PAYSTACK_PUBLIC_KEY){
    if(confirm(`Demo mode — add ${packCoins} coins locally?`)){
      addCoins(packCoins);
      closeBuyModal();
    }
    return;
  }

  // If Paystack script not loaded, fallback to demo (safe)
  if(typeof PaystackPop === 'undefined'){
    alert('Payment library not loaded. Demo fallback will add coins locally.');
    addCoins(packCoins);
    closeBuyModal();
    return;
  }

  // Paystack inline checkout
  const handler = PaystackPop.setup({
    key: PAYSTACK_PUBLIC_KEY,
    email: localStorage.getItem('fenwa:user-email') || 'buyer@example.com',
    amount: amountKobo,
    currency: 'NGN',
    ref: 'FENWA_' + Date.now(),
    callback: function(response){
      // On success, credit coins locally. In production verify on server.
      addCoins(packCoins);
      alert('✅ Payment successful! Ref: ' + response.reference);
      closeBuyModal();
    },
    onClose: function(){
      // user closed checkout
    }
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
  if(!amount) return alert('❌ Invalid or used voucher.');
  addCoins(amount);
  if(document.getElementById('voucherInput')) document.getElementById('voucherInput').value = '';
  closeBuyModal();
}
window.redeemVoucher = redeemVoucher;

// ---------- Init (DOM ready) ----------
document.addEventListener('DOMContentLoaded', () => {
  // ensure starter coins exist
  if(!localStorage.getItem(LS_COINS)) localStorage.setItem(LS_COINS, String(STARTER_COINS));
  setCoins(getCoins());

  // init theme
  initTheme();

  // header buttons (if present)
  document.getElementById('buyBtn')?.addEventListener('click', openBuyModal);
  document.getElementById('buyBtn2')?.addEventListener('click', openBuyModal);

  // modal wiring (safe references)
  const modal = document.getElementById('buyModal');
  const closeBtn = document.getElementById('closeBuyModalBtn');
  const packs = modal ? Array.from(modal.querySelectorAll('.pack')) : [];
  const redeemBtn = document.getElementById('redeemBtn');

  if(modal){ modal.hidden = true; modal.style.display = 'none'; }

  if(closeBtn) closeBtn.addEventListener('click', closeBuyModal);

  // click outside modal to close
  if(modal){
    modal.addEventListener('click', (e) => {
      if(e.target === modal) closeBuyModal();
    });
  }

  // ESC key to close modal
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape') closeBuyModal();
  });

  // packs: attach click handlers
  packs.forEach(btn => {
    btn.addEventListener('click', function(){
      const coins = Number(this.dataset.coins || 0);
      const kobo = Number(this.dataset.kobo || 0);
      // if no Paystack key -> demo
      if(!PAYSTACK_PUBLIC_KEY){ 
        if(confirm(`Demo mode — add ${coins} coins locally?`)){
          addCoins(coins);
          closeBuyModal();
        }
        return;
      }
      // otherwise call buyCoins to open Paystack
      buyCoins(coins, `${coins} Coins`, kobo);
    });
  });

  // redeem button handler fallback (if present)
  if(redeemBtn){
    redeemBtn.addEventListener('click', () => {
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
