// assets/js/login.js
// This file expects firebase.js to be loaded before it.
// It will wire up buttons/inputs on your login page and handle redirects.

(async function(){
  // Wait until firebase is loaded (simple loop)
  function waitForFirebase() {
    return new Promise(resolve => {
      const interval = setInterval(() => {
        if(window._firebase && window._firebase.auth){
          clearInterval(interval);
          resolve(window._firebase);
        }
      }, 50);
      // after 5s, give up (but still resolve so page doesn't hang)
      setTimeout(() => resolve(window._firebase), 5000);
    });
  }
  const fb = await waitForFirebase();
  if(!fb || !fb.auth){
    console.error('Firebase not available - ensure /firebase.js is included as module before this file.');
    return;
  }
  const { auth, googleProvider, signInWithPopup, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged } = fb;

  // Helper to store small user object so your reader guard sees it
  function saveFenwaUser(user){
    // store minimal info: uid + email
    if(!user) {
      localStorage.removeItem('fenwa_user');
      return;
    }
    const obj = { uid: user.uid, email: user.email || null };
    localStorage.setItem('fenwa_user', JSON.stringify(obj));
  }

  // redirect after login (if any)
  function doRedirectAfterLogin(){
    try {
      const dest = sessionStorage.getItem('fenwa_redirect_to');
      if(dest){
        sessionStorage.removeItem('fenwa_redirect_to');
        window.location.href = dest;
      } else {
        // default to homepage
        window.location.href = '/';
      }
    } catch(e){
      window.location.href = '/';
    }
  }

  // On auth state change: persist user, and redirect if we landed from reader guard
  onAuthStateChanged(auth, user => {
    if(user){
      saveFenwaUser(user);
      // if we are on login page, redirect back to the target
      if(window.location.pathname.endsWith('/login.html') || window.location.pathname === '/login'){
        doRedirectAfterLogin();
      } else {
        // not on login page: keep user stored (so reader guard will work)
        saveFenwaUser(user);
      }
    } else {
      // signed out
      saveFenwaUser(null);
    }
  });

  // DOM bindings (you may need to adjust selectors to match your login.html)
  const emailInput = document.querySelector('input[type="email"]');
  const passwordInput = document.querySelector('input[type="password"]');
  const loginBtn = document.getElementById('loginBtn') || document.querySelector('[data-login-btn]');
  const registerBtn = document.getElementById('registerBtn') || document.querySelector('[data-register-btn]');
  const googleBtn = document.getElementById('googleBtn') || document.querySelector('[data-google-btn]');

  function showMsg(msg){
    // fallback simple alert; you can wire to a UI element
    try {
      const el = document.getElementById('authMsg');
      if(el) { el.textContent = msg; return; }
    } catch(e){}
    // fallback
    if(msg) console.log(msg);
  }

  if(loginBtn){
    loginBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = (emailInput && emailInput.value || '').trim();
      const password = (passwordInput && passwordInput.value || '').trim();
      if(!email || !password){ alert('Enter email and password'); return; }
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will save user and redirect
        showMsg('Login successful. Redirecting…');
      } catch(err){
        console.error('login error', err);
        alert('Login failed: ' + (err.message || err));
      }
    });
  }

  if(registerBtn){
    registerBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      const email = (emailInput && emailInput.value || '').trim();
      const password = (passwordInput && passwordInput.value || '').trim();
      if(!email || !password){ alert('Enter email and password to create account'); return; }
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        // user created and logged in automatically
        showMsg('Account created. Redirecting…');
      } catch(err){
        console.error('register error', err);
        alert('Registration failed: ' + (err.message || err));
      }
    });
  }

  if(googleBtn){
    googleBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        const result = await signInWithPopup(auth, googleProvider);
        // onAuthStateChanged will handle saving/redirect
      } catch(err){
        console.error('google login error', err);
        alert('Google login failed: ' + (err.message || err));
      }
    });
  }

  // If the page provides a logout link/button with id=logoutBtn, wire it
  const logoutBtn = document.getElementById('logoutBtn');
  if(logoutBtn){
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await fb.signOut(auth);
        localStorage.removeItem('fenwa_user');
        window.location.href = '/';
      } catch(err){
        console.error('logout error', err);
        alert('Logout failed: ' + err.message);
      }
    });
  }

})();
