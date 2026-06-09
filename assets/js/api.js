import { APP_CONFIG, isBackendConfigured } from "./config.js";
import { getCurrentUser, ConfigurationError } from "./firebase-client.js";

export class ApiError extends Error {
  constructor(message, status = 0, code = "") {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

async function requestApi(endpoint, options = {}, authenticated = true) {
  if (!isBackendConfigured()) {
    throw new ConfigurationError(
      "The secure backend URL is not configured in assets/js/config.js."
    );
  }

  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  if (authenticated) {
    const user = await getCurrentUser();
    if (!user) throw new ApiError("Log in to continue.", 401, "AUTH_REQUIRED");
    headers.Authorization = `Bearer ${await user.getIdToken()}`;
  }

  const response = await fetch(`${APP_CONFIG.functionsBaseUrl.replace(/\/$/, "")}/${endpoint}`, {
    method: options.method || "POST",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    throw new ApiError(
      payload.error || "The server request failed.",
      response.status,
      payload.code || ""
    );
  }

  return payload;
}

export function callApi(endpoint, options = {}) {
  return requestApi(endpoint, options, true);
}

export function callPublicApi(endpoint, options = {}) {
  return requestApi(endpoint, options, false);
}
