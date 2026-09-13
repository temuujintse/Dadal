# Firebase Deployment Guide — Family Habit

Canonical Firestore rules file: **`FIRESTORE_RULES.txt`** (project root)
Indexes file: **`firestore.indexes.json`** (empty — no composite indexes required)
Config: **`firebase.json`** points CLI to both files.

> Do NOT rename `FIRESTORE_RULES.txt` to `firestore.rules`. `firebase.json` already maps it.

---

## 0. Prerequisites

```bash
node -v   # >= 18
npm -v
firebase --version || npm i -g firebase-tools
```

This repo already has `firebase@12.x` (client SDK) and `@firebase/rules-unit-testing@5.x` (devDep).

---

## 1. Firebase CLI login

```bash
firebase login
# Opens browser — sign in with the Google account that owns the Firebase project.
firebase login --reauth   # if session expired
```

Verify:

```bash
firebase projects:list
```

---

## 2. Select the real Firebase project

Do NOT invent a project ID. Use the one from **Firebase Console → Project Settings → General → Project ID**.

```bash
# Option A — interactive
firebase use --add
# → Select your project from the list
# → Alias: production (or default)

# Option B — direct
firebase use YOUR_PROJECT_ID

# Verify
firebase use
cat .firebaserc   # created by `use --add`, gitignored? check .gitignore
```

If `.firebaserc` does not exist, `firebase use --add` will create it. Do NOT commit a fake ID.

---

## 3. Emulator verification (local, required before deploy)

Requires Java 21+ (`java -version`).

```bash
# From project root
npm install   # ensures @firebase/rules-unit-testing is present
firebase emulators:exec --only firestore "node firestore-rules.test.mjs"
# Expected: 22/22 ✓  (see firestore-rules.test.mjs header)
```

If you changed `FIRESTORE_RULES.txt`, re-run until 22/22.

---

## 4. Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
# Deploys FIRESTORE_RULES.txt as configured in firebase.json
```

Console verification:

1. Firebase Console → Firestore Database → Rules
2. Confirm file content matches local `FIRESTORE_RULES.txt`
3. Check “Last deployed” timestamp

**Why this file?** `firebase.json` contains:
```json
{ "firestore": { "rules": "FIRESTORE_RULES.txt", "indexes": "firestore.indexes.json" } }
```

Do NOT paste rules manually and forget CLI — CLI is the source of truth for CI.

---

## 5. Deploy Firestore Indexes

Current app uses only:
- 7 bare `collection` listeners (no index)
- 1 `where('dateKey','>=',cutoff)` single-field (auto-indexed)

No composite indexes required. The committed `firestore.indexes.json` is:

```json
{ "indexes": [], "fieldOverrides": [] }
```

Deploy (no-op but keeps Console in sync):

```bash
firebase deploy --only firestore:indexes
```

If you later add `orderBy` + `where` on different fields, run:

```bash
firebase firestore:indexes > firestore.indexes.json
# commit the updated file
```

---

## 6. Console verification checklist

- [ ] **Firestore Database** exists, mode = Production, region chosen (e.g., `us-central`)
- [ ] **Rules** tab shows the canonical rules (check `allow list: if false` for `inviteCodes`)
- [ ] **Indexes** tab shows 0 composite indexes (or matches `firestore.indexes.json`)
- [ ] **Authentication → Sign-in method**: Email/Password, Anonymous, Google, Apple enabled as needed
- [ ] **Authentication → Settings → Authorized domains** includes your web domain + `localhost` for dev
- [ ] **Project Settings → General → Your apps**: iOS bundle `com.temu.familyhabit`, Android package `com.temu.familyhabit`, Web app exists

---

## 7. Rollback

Firestore keeps rule history in Console → Rules → History → Rollback.

CLI rollback to previous deployed version:

```bash
firebase firestore:rules:history   # list versions (if available via Console)
# Or redeploy previous git commit:
git checkout HEAD~1 -- FIRESTORE_RULES.txt
firebase deploy --only firestore:rules
```

For indexes: restore previous `firestore.indexes.json` from git and redeploy.

---

## 8. Common issues

| Symptom | Cause | Fix |
|---|---|---|
| `firebase deploy` → “No project active” | `firebase use` not set | `firebase use --add` |
| Rules deploy succeeds but app still denied | Emulator passed but live DB is different project | Verify `firebase use` project ID matches `EXPO_PUBLIC_FIREBASE_PROJECT_ID` |
| `java` not found for emulator | Java 21+ missing | `brew install openjdk@21` |
| `PERMISSION_DENIED` after deploy | New restrictive rules | Check `firebase-debug.log`, re-run emulator tests |

---

## 9. What NOT to deploy

- Never put `serviceAccountKey.json`, `*.p8`, `.env` into `firebase deploy`
- Never put `EXPO_PUBLIC_*` secrets into `firebase.json` — they are client-bundled, not secrets (see `firebaseConfig.js` comments)
