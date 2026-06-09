import { isBackendConfigured } from "./config.js";
import { callApi, callPublicApi, ApiError } from "./api.js";
import { getCurrentUser, ConfigurationError } from "./firebase-client.js";
import { formatNaira, setBusy, setStatus } from "./ui.js";

const packsElement = document.getElementById("coin-packs");
const balanceElement = document.getElementById("wallet-balance");
const statusElement = document.getElementById("store-status");

function renderPacks(packs) {
  packsElement.innerHTML = "";
  packs.forEach((pack) => {
    const article = document.createElement("article");
    article.className = "coin-pack";

    const coins = document.createElement("strong");
    coins.textContent = `${pack.coins} coins`;
    const price = document.createElement("span");
    price.textContent = formatNaira(pack.amountNgn);
    const button = document.createElement("button");
    button.className = "button primary full-width";
    button.type = "button";
    button.textContent = "Buy securely";
    button.addEventListener("click", () => beginPayment(pack, button));

    article.append(coins, price, button);
    packsElement.append(article);
  });
  packsElement.setAttribute("aria-busy", "false");
}

async function loadPacks() {
  if (!isBackendConfigured()) {
    packsElement.innerHTML = '<p class="status" data-type="warning">Coin packs will appear after the secure backend URL is configured.</p>';
    packsElement.setAttribute("aria-busy", "false");
    return;
  }
  try {
    const data = await callPublicApi("catalogue", { method: "GET" });
    const packs = Array.isArray(data.packs) ? data.packs : [];
    if (!packs.length) throw new ApiError("No coin packs are available.");
    renderPacks(packs);
  } catch (error) {
    packsElement.innerHTML = "";
    const message = document.createElement("p");
    message.className = "status";
    setStatus(message, error.message, "error");
    packsElement.append(message);
    packsElement.setAttribute("aria-busy", "false");
  }
}

async function loadWallet() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      balanceElement.textContent = "0";
      setStatus(statusElement, "Log in before buying or using coins.", "info");
      return;
    }
    if (!isBackendConfigured()) {
      balanceElement.textContent = "-";
      setStatus(statusElement, "Payments are safely disabled until the backend URL is configured.", "warning");
      return;
    }
    const data = await callApi("wallet", { method: "GET" });
    balanceElement.textContent = String(data.balance || 0);
  } catch (error) {
    const message = error instanceof ConfigurationError
      ? "Firebase or the backend is not configured. Follow README.md before enabling payments."
      : error.message;
    setStatus(statusElement, message, "error");
  }
}

async function beginPayment(pack, button) {
  setBusy(button, true, "Opening Paystack...");
  setStatus(statusElement, "", "info");
  try {
    const result = await callApi("initializePayment", {
      body: { packId: pack.id }
    });
    if (!result.authorizationUrl) throw new ApiError("The server did not return a payment link.");
    window.location.assign(result.authorizationUrl);
  } catch (error) {
    if (error.status === 401) {
      const login = new URL("login.html", document.baseURI);
      login.searchParams.set("next", window.location.href);
      window.location.assign(login.href);
      return;
    }
    setStatus(statusElement, error.message, "error");
    setBusy(button, false);
  }
}

async function handlePaymentReturn() {
  const reference = new URLSearchParams(window.location.search).get("reference");
  if (!reference) return;
  setStatus(statusElement, "Confirming your payment...", "info");
  try {
    const result = await callApi("verifyPayment", { body: { reference } });
    balanceElement.textContent = String(result.balance || 0);
    setStatus(statusElement, "Payment confirmed. Your wallet has been updated.", "success");
    const cleanUrl = new URL(window.location.href);
    cleanUrl.searchParams.delete("reference");
    cleanUrl.searchParams.delete("trxref");
    window.history.replaceState({}, "", cleanUrl);
  } catch (error) {
    setStatus(statusElement, error.message, "error");
  }
}

await loadPacks();
await loadWallet();
await handlePaymentReturn();
