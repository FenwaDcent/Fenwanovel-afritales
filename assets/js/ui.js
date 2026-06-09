import { getFirebaseServices, ConfigurationError } from "./firebase-client.js";

const THEME_KEY = "fenwanovels-theme";

function preferredTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "light" || saved === "dark") return saved;
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.textContent = theme === "dark" ? "Light theme" : "Dark theme";
    button.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
  });
}

function setupTheme() {
  applyTheme(preferredTheme());
  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    });
  });
}

function setupNavigation() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    const open = toggle.getAttribute("aria-expanded") === "true";
    toggle.setAttribute("aria-expanded", String(!open));
    nav.classList.toggle("is-open", !open);
  });
}

async function setupAuthNavigation() {
  const authLinks = document.querySelectorAll("[data-auth-link]");
  const signOutButtons = document.querySelectorAll("[data-sign-out]");
  if (!authLinks.length && !signOutButtons.length) return;

  try {
    const { auth, authApi } = await getFirebaseServices();
    authApi.onAuthStateChanged(auth, (user) => {
      authLinks.forEach((link) => {
        link.textContent = user ? (user.displayName || "Account") : "Log in";
        link.href = user ? "store.html" : "login.html";
      });
      signOutButtons.forEach((button) => {
        button.hidden = !user;
      });
    });

    signOutButtons.forEach((button) => {
      button.addEventListener("click", async () => {
        await authApi.signOut(auth);
        window.location.assign(new URL("index.html", document.baseURI).href);
      });
    });
  } catch (error) {
    if (!(error instanceof ConfigurationError)) console.error(error);
    signOutButtons.forEach((button) => { button.hidden = true; });
  }
}

function initialise() {
  setupTheme();
  setupNavigation();
  setupAuthNavigation();
  document.querySelectorAll("[data-current-year]").forEach((element) => {
    element.textContent = String(new Date().getFullYear());
  });
}

initialise();

export function setStatus(element, message, type = "info") {
  if (!element) return;
  element.textContent = message;
  element.dataset.type = type;
}

export function setBusy(button, busy, busyLabel = "Working...") {
  if (!button) return;
  if (busy) {
    button.dataset.originalLabel = button.textContent;
    button.textContent = busyLabel;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalLabel || button.textContent;
    button.disabled = false;
  }
}

export function formatNaira(amount) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0
  }).format(amount);
}
