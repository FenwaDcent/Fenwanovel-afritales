import {
  getFirebaseServices,
  friendlyAuthError,
  ConfigurationError
} from "./firebase-client.js";
import { setBusy, setStatus } from "./ui.js";

const form = document.getElementById("auth-form");
const status = document.getElementById("auth-status");
const mode = document.body.dataset.authMode;

function safeNextUrl() {
  const requested = new URLSearchParams(window.location.search).get("next");
  if (!requested) return new URL("index.html", document.baseURI).href;

  try {
    const url = new URL(requested, window.location.href);
    return url.origin === window.location.origin
      ? url.href
      : new URL("index.html", document.baseURI).href;
  } catch {
    return new URL("index.html", document.baseURI).href;
  }
}

if (form) {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    const email = form.email.value.trim();
    const password = form.password.value;
    const name = form.name ? form.name.value.trim() : "";

    if (!form.reportValidity()) return;
    if (mode === "register" && name.length < 2) {
      setStatus(status, "Enter a display name containing at least two characters.", "error");
      return;
    }

    setBusy(button, true, mode === "register" ? "Creating account..." : "Logging in...");
    setStatus(status, "", "info");

    try {
      const { auth, authApi } = await getFirebaseServices();
      if (mode === "register") {
        const credential = await authApi.createUserWithEmailAndPassword(auth, email, password);
        await authApi.updateProfile(credential.user, { displayName: name });
      } else {
        await authApi.signInWithEmailAndPassword(auth, email, password);
      }
      window.location.assign(safeNextUrl());
    } catch (error) {
      const message = error instanceof ConfigurationError
        ? "Account services are not configured on this deployment. Complete the Firebase setup described in README.md."
        : friendlyAuthError(error);
      setStatus(status, message, "error");
    } finally {
      setBusy(button, false);
    }
  });
}
