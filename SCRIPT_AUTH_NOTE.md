# Security Note: Unauthenticated Script Removed

The `add-guide-article.js` script requires **authenticated Firebase Admin SDK** to work with the security rules in place.

## Why the script won't work as-is

Firestore security rules enforce admin-only write access:

```javascript
match /resources/{itemId} {
  allow read: if true;
  allow create, update, delete: if isAdmin();  // Requires auth.token.email == "ahrah0365@gmail.com"
}
```

The current Node.js script uses the **client SDK** which cannot bypass these rules, even with the API key. It will fail with permission denied.

## Options for initial data seeding

### Option 1: Use the Web Admin UI (RECOMMENDED)
1. Deploy the site
2. Log in as admin (`ahrah0365@gmail.com`)
3. Use Resources → Add Resource → Article
4. Copy content from `ADMIN_GUIDE_FOR_ARTICLE.md`

**Advantages:**
- No authentication complexity
- Same workflow as future articles
- Validates the admin UI works correctly

### Option 2: Firebase Admin SDK (for automated scripts)
If you need to automate initial data seeding, use the **Firebase Admin SDK** with a service account:

```javascript
import * as admin from 'firebase-admin';
import serviceAccount from './service-account-key.json';

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
// Now you can write directly, bypassing client rules
```

**Important:** 
- Service account keys must NEVER be committed to the repository
- Only use for one-time setup or CI/CD pipelines
- Not recommended for this use case

### Option 3: Temporarily relax rules (NOT RECOMMENDED)
You could temporarily allow unauthenticated writes, seed data, then restore strict rules. This is dangerous and should be avoided.

## Recommendation

**Use the web admin UI.** It's simpler, safer, and validates your production workflow.

The `add-guide-article.js` file has been kept for reference but will not work without proper authentication. Follow `ADMIN_WORKFLOW.md` for the correct procedure.
