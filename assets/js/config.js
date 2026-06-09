export const APP_CONFIG = Object.freeze({
  firebase: Object.freeze({
    apiKey: "",
    authDomain: "",
    projectId: "",
    appId: ""
  }),
  functionsBaseUrl: ""
});

export function isFirebaseConfigured() {
  const { apiKey, authDomain, projectId, appId } = APP_CONFIG.firebase;
  return [apiKey, authDomain, projectId, appId].every(
    (value) => typeof value === "string" && value.trim().length > 0
  );
}

export function isBackendConfigured() {
  return /^https:\/\//i.test(APP_CONFIG.functionsBaseUrl.trim());
}
