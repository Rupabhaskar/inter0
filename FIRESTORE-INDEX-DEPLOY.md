# Deploy Firestore index (collection group `ids` + `uid`)

The app uses a **collection group** query to find a student by `uid` across `students/{collegeCode}/ids`. Firestore requires an index for this.

## One-time setup

1. **Log in to Firebase** (browser will open):
   ```bash
   npx firebase-tools login
   ```

2. **Confirm project** (optional; default is `interjee-mains` in `.firebaserc`):
   ```bash
   npx firebase-tools use interjee-mains
   ```

## Deploy the index

```bash
npm run deploy:firestore-indexes
```

Or directly:

```bash
npx firebase-tools deploy --only firestore:indexes
```

Wait until the CLI reports success. Index building can take a few minutes in the Firebase Console (Firestore → Indexes). When the new index shows **Enabled**, the collection group query will work and the error will go away.

## Files involved

- `firestore.indexes.json` – defines the `ids` collection group index on `uid`
- `firebase.json` – tells Firebase CLI where to find indexes
- `.firebaserc` – default project `interjee-mains`
