# Household Ledger — setup guide

A small budget tracker: sign-in screen, shared real-time ledger, running balance.
It's a static site (`index.html` + `styles.css` + `app.js`) hosted free on GitHub
Pages, backed by Firebase for login and storage. Nobody can create their own
account — you add each of the 2–5 people by hand in the Firebase console, so
access stays limited to who you choose.

Total cost: **$0** at this scale (Firebase's free "Spark" plan covers it).

---

## 1. Create the Firebase project

1. Go to https://console.firebase.google.com and click **Add project**.
2. Name it anything (e.g. "household-ledger"). Google Analytics is optional — you can turn it off.
3. Once created, click the **web icon (`</>`)** on the project overview page to register a web app. Give it a nickname; you don't need Firebase Hosting for this.
4. Firebase will show you a `firebaseConfig` object with keys like `apiKey`, `authDomain`, etc. **Keep this tab open** — you'll paste these into the code in step 4.

## 2. Turn on Email/Password sign-in

1. In the left sidebar: **Build → Authentication → Get started**.
2. Under **Sign-in method**, enable **Email/Password**.
3. Go to the **Users** tab and click **Add user** for each of the 2–5 people who should have access. Set an email and a temporary password for each — you'll share these with them directly (they can't sign themselves up).

## 3. Create the database

1. Left sidebar: **Build → Firestore Database → Create database**.
2. Choose a location close to you, and start in **production mode** (the rules file in step 5 handles security — don't leave it in test mode long-term).

## 4. Add your config to the code

Open `firebase-config.js` in this project and replace the placeholder values with the real ones from step 1:

```js
const firebaseConfig = {
  apiKey: "your-real-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

This value is a public client identifier, not a secret — it's fine to commit it to GitHub. What actually protects your data is Authentication (step 2) plus the security rules below.

## 5. Deploy the security rules

This restricts the database so only people who are signed in (i.e. the accounts you created in step 2) can read or write anything.

Easiest way — paste manually:
1. Firestore Database → **Rules** tab.
2. Delete what's there and paste in the contents of `firestore.rules` from this project.
3. Click **Publish**.

(If you'd rather lock it to specific email addresses instead of "anyone with an account," see the commented-out stricter version at the bottom of `firestore.rules`.)

## 6. Push the code to GitHub

From inside this project folder:

```bash
git init
git add .
git commit -m "Household ledger"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

(Create the empty repo on GitHub first at https://github.com/new — don't add a README there, since you already have one.)

## 7. Turn on GitHub Pages

1. In your GitHub repo: **Settings → Pages**.
2. Under **Source**, choose **Deploy from a branch**, branch `main`, folder `/ (root)**. Save.
3. GitHub will give you a URL like `https://YOUR_USERNAME.github.io/YOUR_REPO/`. It can take a minute or two to go live.

## 8. Authorize that domain in Firebase

Firebase blocks sign-in from domains it doesn't recognize, so:

1. Firebase console → **Authentication → Settings → Authorized domains**.
2. Click **Add domain** and add `YOUR_USERNAME.github.io` (just the domain, no path).

## 9. Try it

Open your GitHub Pages URL, sign in with one of the accounts from step 2, and add an entry. Open it in a second browser (or have another household member sign in) — entries sync in real time.

---

## How access control works here

- There's no public sign-up button — the only way to get an account is for you to create one in the Firebase console (step 2).
- Firestore's rules (step 5) reject any read or write from someone who isn't signed in, so even if someone found your GitHub Pages URL, they'd see only the login screen.
- Every entry is tagged with who added it, so the register shows the full household's activity, not separate private ledgers.

## Extending it later

- **Editing entries**: currently you can add and remove but not edit — removing and re-adding is the workaround for now.
- **Monthly views**: the category filter is there; a month/date-range filter would be a natural next addition in `app.js`.
- **Custom domain**: GitHub Pages supports a custom domain under Settings → Pages if you'd rather not use the `github.io` address — remember to add that domain to Firebase's authorized domains too.
