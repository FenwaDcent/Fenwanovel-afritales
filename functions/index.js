"use strict";

const crypto = require("node:crypto");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const { logger } = require("firebase-functions");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

initializeApp();
const db = getFirestore();

const PAYSTACK_SECRET_KEY = defineSecret("PAYSTACK_SECRET_KEY");
const ALLOWED_ORIGINS = defineString("ALLOWED_ORIGINS", {
  default: "https://fenwanovel.online"
});
const PUBLIC_SITE_URL = defineString("PUBLIC_SITE_URL", {
  default: "https://fenwanovel.online"
});

const COIN_PACKS = Object.freeze({
  "coins-50": Object.freeze({ coins: 50, amountKobo: 50000 }),
  "coins-150": Object.freeze({ coins: 150, amountKobo: 120000 }),
  "coins-300": Object.freeze({ coins: 300, amountKobo: 200000 })
});

const BOOK_CATALOGUE = Object.freeze({
  "testimony-the-irony-of-destiny": Object.freeze({
    chapters: Object.freeze({
      "chapter-1": Object.freeze({ cost: 0, access: "free" }),
      "chapter-2": Object.freeze({ cost: 0, access: "free" }),
      "chapter-3": Object.freeze({ cost: 0, access: "free" }),
      "chapter-4": Object.freeze({ cost: 0, access: "free" })
    })
  })
});

function allowedOrigin(origin) {
  if (!origin) return true;
  const allowed = ALLOWED_ORIGINS.value()
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return allowed.includes(origin);
}

function prepareRequest(req, res, methods) {
  const origin = req.get("origin") || "";
  if (!allowedOrigin(origin)) {
    res.status(403).json({ error: "Origin is not allowed.", code: "ORIGIN_DENIED" });
    return false;
  }
  if (origin) res.set("Access-Control-Allow-Origin", origin);
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
  res.set("Access-Control-Allow-Methods", `${methods.join(", ")}, OPTIONS`);
  res.set("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return false;
  }
  if (!methods.includes(req.method)) {
    res.status(405).json({ error: "Method not allowed.", code: "METHOD_NOT_ALLOWED" });
    return false;
  }
  return true;
}

async function authenticatedUser(req) {
  const header = req.get("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error("Authentication is required.");
    error.status = 401;
    error.code = "AUTH_REQUIRED";
    throw error;
  }
  try {
    return await getAuth().verifyIdToken(match[1], true);
  } catch {
    const error = new Error("The sign-in session is invalid or expired.");
    error.status = 401;
    error.code = "INVALID_TOKEN";
    throw error;
  }
}

function sendError(res, error) {
  const status = Number.isInteger(error.status) ? error.status : 500;
  if (status >= 500) logger.error(error);
  res.status(status).json({
    error: status >= 500 ? "The server could not complete the request." : error.message,
    code: error.code || "SERVER_ERROR"
  });
}

async function paystackRequest(path, options = {}) {
  const response = await fetch(`https://api.paystack.co${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY.value()}`,
      "Content-Type": "application/json"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json();
  if (!response.ok || !payload.status) {
    const error = new Error(payload.message || "Paystack rejected the request.");
    error.status = 502;
    error.code = "PAYSTACK_ERROR";
    throw error;
  }
  return payload.data;
}

async function creditVerifiedPayment(reference, verifiedData) {
  const paymentRef = db.doc(`payments/${reference}`);
  return db.runTransaction(async (transaction) => {
    const paymentSnapshot = await transaction.get(paymentRef);
    if (!paymentSnapshot.exists) {
      const error = new Error("The payment reference is unknown.");
      error.status = 404;
      error.code = "PAYMENT_NOT_FOUND";
      throw error;
    }

    const payment = paymentSnapshot.data();
    if (payment.status === "credited") {
      const walletSnapshot = await transaction.get(db.doc(`wallets/${payment.uid}`));
      return { balance: walletSnapshot.exists ? walletSnapshot.data().balance || 0 : 0, alreadyCredited: true };
    }

    if (
      verifiedData.status !== "success" ||
      verifiedData.reference !== reference ||
      verifiedData.currency !== "NGN" ||
      verifiedData.amount !== payment.amountKobo
    ) {
      const error = new Error("Payment verification did not match the expected transaction.");
      error.status = 409;
      error.code = "PAYMENT_MISMATCH";
      throw error;
    }

    const walletRef = db.doc(`wallets/${payment.uid}`);
    const walletSnapshot = await transaction.get(walletRef);
    const currentBalance = walletSnapshot.exists ? Number(walletSnapshot.data().balance || 0) : 0;
    const newBalance = currentBalance + payment.coins;

    transaction.set(walletRef, {
      balance: newBalance,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    transaction.set(db.doc(`wallets/${payment.uid}/ledger/${reference}`), {
      type: "purchase",
      amount: payment.coins,
      balanceAfter: newBalance,
      paymentReference: reference,
      createdAt: FieldValue.serverTimestamp()
    });
    transaction.update(paymentRef, {
      status: "credited",
      creditedAt: FieldValue.serverTimestamp(),
      paystackTransactionId: String(verifiedData.id || "")
    });
    return { balance: newBalance, alreadyCredited: false };
  });
}

exports.catalogue = onRequest(
  { region: "us-central1", timeoutSeconds: 15 },
  async (req, res) => {
    if (!prepareRequest(req, res, ["GET"])) return;
    const packs = Object.entries(COIN_PACKS).map(([id, pack]) => ({
      id,
      coins: pack.coins,
      amountNgn: pack.amountKobo / 100
    }));
    res.status(200).json({ packs });
  }
);

exports.initializePayment = onRequest(
  { region: "us-central1", secrets: [PAYSTACK_SECRET_KEY], timeoutSeconds: 30 },
  async (req, res) => {
    if (!prepareRequest(req, res, ["POST"])) return;
    try {
      const user = await authenticatedUser(req);
      const pack = COIN_PACKS[req.body && req.body.packId];
      if (!pack) {
        const error = new Error("Select a valid coin pack.");
        error.status = 400;
        error.code = "INVALID_PACK";
        throw error;
      }
      if (!user.email) {
        const error = new Error("The account needs an email address.");
        error.status = 400;
        error.code = "EMAIL_REQUIRED";
        throw error;
      }

      const reference = `fenwa_${Date.now()}_${crypto.randomBytes(8).toString("hex")}`;
      await db.doc(`payments/${reference}`).set({
        uid: user.uid,
        email: user.email,
        packId: req.body.packId,
        coins: pack.coins,
        amountKobo: pack.amountKobo,
        currency: "NGN",
        status: "pending",
        createdAt: FieldValue.serverTimestamp()
      });

      const callbackUrl = `${PUBLIC_SITE_URL.value().replace(/\/$/, "")}/store.html`;
      const data = await paystackRequest("/transaction/initialize", {
        method: "POST",
        body: {
          email: user.email,
          amount: pack.amountKobo,
          currency: "NGN",
          reference,
          callback_url: callbackUrl,
          metadata: { uid: user.uid, packId: req.body.packId }
        }
      });
      res.status(200).json({ authorizationUrl: data.authorization_url, reference });
    } catch (error) {
      sendError(res, error);
    }
  }
);

exports.verifyPayment = onRequest(
  { region: "us-central1", secrets: [PAYSTACK_SECRET_KEY], timeoutSeconds: 30 },
  async (req, res) => {
    if (!prepareRequest(req, res, ["POST"])) return;
    try {
      const user = await authenticatedUser(req);
      const reference = String((req.body && req.body.reference) || "").trim();
      if (!/^[A-Za-z0-9_.=-]{8,100}$/.test(reference)) {
        const error = new Error("The payment reference is invalid.");
        error.status = 400;
        error.code = "INVALID_REFERENCE";
        throw error;
      }
      const paymentSnapshot = await db.doc(`payments/${reference}`).get();
      if (!paymentSnapshot.exists || paymentSnapshot.data().uid !== user.uid) {
        const error = new Error("The payment does not belong to this account.");
        error.status = 403;
        error.code = "PAYMENT_FORBIDDEN";
        throw error;
      }
      const verified = await paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`);
      const result = await creditVerifiedPayment(reference, verified);
      res.status(200).json(result);
    } catch (error) {
      sendError(res, error);
    }
  }
);

exports.paystackWebhook = onRequest(
  { region: "us-central1", secrets: [PAYSTACK_SECRET_KEY], timeoutSeconds: 30 },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }
    try {
      const supplied = req.get("x-paystack-signature") || "";
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(req.body || {}));
      const expected = crypto
        .createHmac("sha512", PAYSTACK_SECRET_KEY.value())
        .update(rawBody)
        .digest("hex");
      const valid = supplied.length === expected.length && crypto.timingSafeEqual(
        Buffer.from(supplied, "utf8"),
        Buffer.from(expected, "utf8")
      );
      if (!valid) {
        res.status(401).send("Invalid signature");
        return;
      }

      const event = req.body;
      if (event && event.event === "charge.success" && event.data && event.data.reference) {
        await creditVerifiedPayment(String(event.data.reference), event.data);
      }
      res.status(200).send("OK");
    } catch (error) {
      logger.error("Webhook processing failed", error);
      res.status(500).send("Webhook processing failed");
    }
  }
);

exports.wallet = onRequest(
  { region: "us-central1", timeoutSeconds: 15 },
  async (req, res) => {
    if (!prepareRequest(req, res, ["GET"])) return;
    try {
      const user = await authenticatedUser(req);
      const snapshot = await db.doc(`wallets/${user.uid}`).get();
      res.status(200).json({ balance: snapshot.exists ? snapshot.data().balance || 0 : 0 });
    } catch (error) {
      sendError(res, error);
    }
  }
);

exports.unlockChapter = onRequest(
  { region: "us-central1", timeoutSeconds: 20 },
  async (req, res) => {
    if (!prepareRequest(req, res, ["POST"])) return;
    try {
      const user = await authenticatedUser(req);
      const bookSlug = String((req.body && req.body.bookSlug) || "");
      const chapterId = String((req.body && req.body.chapterId) || "");
      const chapter = BOOK_CATALOGUE[bookSlug] && BOOK_CATALOGUE[bookSlug].chapters[chapterId];
      if (!chapter) {
        const error = new Error("The chapter does not exist.");
        error.status = 404;
        error.code = "CHAPTER_NOT_FOUND";
        throw error;
      }
      if (chapter.access === "free" || chapter.cost === 0) {
        res.status(200).json({ unlocked: true, cost: 0 });
        return;
      }

      const walletRef = db.doc(`wallets/${user.uid}`);
      const entitlementRef = db.doc(`entitlements/${user.uid}/chapters/${bookSlug}__${chapterId}`);
      const ledgerRef = db.doc(`wallets/${user.uid}/ledger/unlock_${bookSlug}__${chapterId}`);
      const result = await db.runTransaction(async (transaction) => {
        const [walletSnapshot, entitlementSnapshot] = await Promise.all([
          transaction.get(walletRef),
          transaction.get(entitlementRef)
        ]);
        if (entitlementSnapshot.exists) {
          return { unlocked: true, balance: walletSnapshot.exists ? walletSnapshot.data().balance || 0 : 0 };
        }
        const balance = walletSnapshot.exists ? Number(walletSnapshot.data().balance || 0) : 0;
        if (balance < chapter.cost) {
          const error = new Error("Your wallet does not contain enough coins.");
          error.status = 402;
          error.code = "INSUFFICIENT_COINS";
          throw error;
        }
        const newBalance = balance - chapter.cost;
        transaction.set(walletRef, { balance: newBalance, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
        transaction.set(entitlementRef, { bookSlug, chapterId, cost: chapter.cost, unlockedAt: FieldValue.serverTimestamp() });
        transaction.set(ledgerRef, { type: "chapter_unlock", amount: -chapter.cost, balanceAfter: newBalance, bookSlug, chapterId, createdAt: FieldValue.serverTimestamp() });
        return { unlocked: true, balance: newBalance };
      });
      res.status(200).json(result);
    } catch (error) {
      sendError(res, error);
    }
  }
);

exports.getChapter = onRequest(
  { region: "us-central1", timeoutSeconds: 15 },
  async (req, res) => {
    if (!prepareRequest(req, res, ["POST"])) return;
    try {
      const user = await authenticatedUser(req);
      const bookSlug = String((req.body && req.body.bookSlug) || "");
      const chapterId = String((req.body && req.body.chapterId) || "");
      const chapter = BOOK_CATALOGUE[bookSlug] && BOOK_CATALOGUE[bookSlug].chapters[chapterId];
      if (!chapter) {
        const error = new Error("The chapter does not exist.");
        error.status = 404;
        error.code = "CHAPTER_NOT_FOUND";
        throw error;
      }
      if (chapter.access !== "free") {
        const entitlement = await db.doc(`entitlements/${user.uid}/chapters/${bookSlug}__${chapterId}`).get();
        if (!entitlement.exists) {
          const error = new Error("Unlock this chapter before reading it.");
          error.status = 403;
          error.code = "CHAPTER_LOCKED";
          throw error;
        }
      }
      const content = await db.doc(`chapters/${bookSlug}__${chapterId}`).get();
      if (!content.exists || content.data().published !== true) {
        const error = new Error("The protected chapter content is unavailable.");
        error.status = 404;
        error.code = "CONTENT_NOT_FOUND";
        throw error;
      }
      res.status(200).json({ html: content.data().html });
    } catch (error) {
      sendError(res, error);
    }
  }
);
