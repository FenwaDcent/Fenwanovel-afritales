// assets/js/login.js
// Handles login, registration, and Google sign-in for Fenwanovels

import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from '../../firebase.js';

// DOM elements
const modeToggleButtons = document.querySelectorAll('[data-auth-mode]');
const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');

const nameFieldWrapper = document.getElementById('name-field-wrapper');
const displayNameInput = document.getElementById('display-name');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

const submitButton = document.getElementById('auth-submit');
const googleButton = document.getElementById('google-btn');

const errorBox = document.getElementById('auth-error');
const form = document.getElementById('auth-form');

// Keep track of whether we are in "login" or "register" mode
let currentMode = 'login';

function setMode(mode) {
  currentMode = mode;

  modeToggleButtons.forEach(btn => {
    if (btn.dataset.authMode === mode) {
      btn.classList.add('btn-primary');
      btn.classList.remove('btn-outline');
    } else {
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-outline');
    }
  });

  if (mode === 'login') {
    authTitle.textContent = 'Welcome back';
    authSubtitle.textContent = 'Log in to continue your reading journey.';
    nameFieldWrapper.style.display = 'none';
    submitButton.textContent = 'Login';
  } else {
    authTitle.textContent = 'Create your account';
    authSubtitle.textContent = 'Join Fenwanovels and never drop a good story again.';
    nameFieldWrapper.style.display = 'block';
    submitButton.textContent = 'Create account';
  }

  clearError();
}

function showError(message) {
  errorBox.textContent = message;
  errorBox.style.display = 'block';
}

function clearError() {
  errorBox.textContent = '';
  errorBox.style.display = 'none';
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  googleButton.disabled = isLoading;
  submitButton.dataset.loading = isLoading ? 'true' : 'false';
}

// Map Firebase error codes to friendly messages
function humanError(error) {
  if (!error || !error.code) return 'Something went wrong. Please try again.';

  switch (error.code) {
    case 'auth/invalid-email':
      return 'That email address is not valid.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No user found with this email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'This email is already in use.';
    case 'auth/weak-password':
      return 'Password is too weak. Use at least 6 characters.';
    case 'auth/popup-closed-by-user':
      return 'Google sign-in popup was closed.';
    default:
      return error.message || 'Something went wrong. Please try again.';
  }
}

// Save basic user info locally (for navbar / wallet later)
function rememberUser(user) {
  if (!user) return;
  const data = {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null
  };
  try {
    localStorage.setItem('fenwa_user', JSON.stringify(data));
  } catch (e) {
    // ignore
  }
}

// After successful login / register
function redirectAfterAuth() {
  // If we came from a locked chapter, we might store a "redirectTo" later.
  const redirectTo = sessionStorage.getItem('fenwa_redirect_to') || 'index.html';
  sessionStorage.removeItem('fenwa_redirect_to');
  window.location.href = redirectTo;
}

// Handle form submit
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearError();
  setLoading(true);

  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Please fill in your email and password.');
    setLoading(false);
    return;
  }

  try {
    if (currentMode === 'login') {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      rememberUser(cred.user);
      redirectAfterAuth();
    } else {
      const name = displayNameInput.value.trim();
      if (!name) {
        showError('Please enter your name.');
        setLoading(false);
        return;
      }

      const cred = await createUserWithEmailAndPassword(auth, email, password);
      // update display name
      await updateProfile(cred.user, { displayName: name });
      rememberUser(cred.user);
      redirectAfterAuth();
    }
  } catch (error) {
    console.error('Auth error', error);
    showError(humanError(error));
  } finally {
    setLoading(false);
  }
});

// Handle Google sign-in
googleButton.addEventListener('click', async () => {
  clearError();
  setLoading(true);

  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    rememberUser(result.user);
    redirectAfterAuth();
  } catch (error) {
    console.error('Google sign-in error', error);
    showError(humanError(error));
  } finally {
    setLoading(false);
  }
});

// Toggle buttons
modeToggleButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const mode = btn.dataset.authMode;
    if (mode && mode !== currentMode) {
      setMode(mode);
    }
  });
});

// Initialize page in login mode by default
setMode('login');
