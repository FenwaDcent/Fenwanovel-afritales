# Fenwanovels AfriTales - repaired baseline

This repository replaces the conflicting scripts in the original project with one consistent static frontend and an optional secure Firebase backend.

## What works immediately

The homepage, responsive navigation, theme control, book metadata, cover image, reader, chapter navigation, login and registration screens, store screen, and custom 404 page all use valid relative paths. The four current chapters are marked as free and load from the public repository.

## Why payments and paid chapters require a backend

A browser must never decide whether a payment succeeded, add coins to a wallet, or reveal premium content. Local storage can be edited by any visitor. Files committed to a public GitHub repository can also be opened directly, even when the interface displays a lock. The supplied Firebase Functions therefore initialise and verify Paystack payments, maintain an idempotent wallet ledger, deduct coins transactionally, and return protected chapter content only after checking an entitlement.

Do not commit the Paystack secret key or future paid chapter HTML to this public repository.

## 1. Configure Firebase Authentication

Create or open a Firebase project, register a web app, and enable Email/Password under Authentication. Copy the web configuration into `assets/js/config.js`. These browser configuration values identify the Firebase project; they are not the Paystack secret key.

Set `functionsBaseUrl` to:

```text
https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net
```

## 2. Install and deploy the backend

Install the Firebase CLI and log in. Copy `.firebaserc.example` to `.firebaserc`, then replace the project ID.

```bash
cd functions
npm install
cd ..
firebase functions:secrets:set PAYSTACK_SECRET_KEY
firebase deploy --only functions,firestore:rules
```

Set the allowed web origin and public callback address when prompted by Firebase parameters. The defaults target `https://fenwanovel.online`. For a staging domain, use a comma-separated `ALLOWED_ORIGINS` value.

Add the deployed `paystackWebhook` URL to the Paystack dashboard. The function checks the `x-paystack-signature` HMAC before processing an event. Keep both the webhook and `verifyPayment` endpoint because the latter gives the returning reader immediate confirmation, while the ledger prevents duplicate credit.

## 3. Publish protected chapters

Free chapters may remain as HTML files in the book directory. A paid chapter must not have a public `source` file. Mark it in `book.json` like this:

```json
{
  "id": "chapter-5",
  "number": 5,
  "title": "Chapter title",
  "access": "paid",
  "cost": 20
}
```

Add the matching cost to `BOOK_CATALOGUE` in `functions/index.js`. Store the trusted chapter HTML in Firestore at:

```text
chapters/testimony-the-irony-of-destiny__chapter-5
```

The document needs `published: true` and an `html` string. Restrict administrative publishing to a separate trusted process. The public Firestore rules deny direct chapter reads.

## 4. Test before production

Run the static checks:

```bash
python scripts/check_project.py
```

Run the site through a web server, not by double-clicking the HTML files:

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`. Use Firebase emulators and Paystack test mode before live deployment. Test registration, login, payment cancellation, successful payment, duplicate callback, duplicate webhook, insufficient coins, chapter unlock, mobile navigation, direct chapter URLs, and sign-out.

## Important deployment note

GitHub Pages can host the free static frontend, but Firebase Hosting is the cleaner production option because `firebase.json` can add security headers and deploy the frontend and backend from one project. The existing `CNAME` is retained for the current custom domain.
