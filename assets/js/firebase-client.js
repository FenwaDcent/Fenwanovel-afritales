import { APP_CONFIG, isFirebaseConfigured } from "./config.js";

const SDK_VERSION = "12.14.0";
let servicesPromise;

export class ConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export async function getFirebaseServices() {
  if (!isFirebaseConfigured()) {
    throw new ConfigurationError(
      "Firebase is not configured. Add the web app values to assets/js/config.js."
    );
  }

  if (!servicesPromise) {
    servicesPromise = Promise.all([
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-auth.js`)
    ]).then(([appApi, authApi]) => {
      const app = appApi.getApps().length
        ? appApi.getApp()
        : appApi.initializeApp(APP_CONFIG.firebase);
      const auth = authApi.getAuth(app);
      return { app, auth, authApi };
    });
  }

  return servicesPromise;
}

export async function getCurrentUser() {
  const { auth, authApi } = await getFirebaseServices();
  if (auth.currentUser) return auth.currentUser;

  return new Promise((resolve, reject) => {
    const stop = authApi.onAuthStateChanged(
      auth,
      (user) => {
        stop();
        resolve(user);
      },
      (error) => {
        stop();
        reject(error);
      }
    );
  });
}

export async function requireUser(nextUrl = window.location.href) {
  const user = await getCurrentUser();
  if (user) return user;

  const login = new URL("login.html", document.baseURI);
  login.searchParams.set("next", nextUrl);
  window.location.assign(login.href);
  return null;
}

export function friendlyAuthError(error) {
  const code = error && typeof error.code === "string" ? error.code : "";
  const messages = {
    "auth/invalid-credential": "The email address or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/email-already-in-use": "An account already uses this email address.",
    "auth/weak-password": "Use a password containing at least six characters.",
    "auth/too-many-requests": "Too many attempts were made. Try again later.",
    "auth/network-request-failed": "The network request failed. Check your connection."
  };
  return messages[code] || "The request could not be completed. Please try again.";
}
