#!/usr/bin/env node
/**
 * Firestore ground-truth inspector for the SwipeCity `items` collection.
 *
 * Usage:
 *   node scripts/inspect-firestore.js <email> <password>
 *
 * Signs in with the Firebase Auth REST API using the test account you pass in,
 * then queries the `items` collection via the Firestore REST runQuery endpoint
 * (as that signed-in user). Prints every item's id/title/seller_id/status/
 * created_at and whether it belongs to the signed-in user, plus a summary.
 *
 * It reads apiKey + projectId from apps/web/src/services/firebaseNative.js's
 * FIREBASE_CONFIG (no secrets hardcoded here). The password is taken ONLY from
 * argv and is never logged.
 *
 * Requires Node 18+ (uses the global fetch).
 */

const fs = require('fs');
const path = require('path');

function readFirebaseConfig() {
  const configPath = path.resolve(__dirname, '../apps/web/src/services/firebaseNative.js');
  let src;
  try {
    src = fs.readFileSync(configPath, 'utf8');
  } catch (e) {
    throw new Error('Could not read firebaseNative.js at ' + configPath + ': ' + e.message);
  }
  const grab = (key) => {
    const m = src.match(new RegExp(key + '\\s*:\\s*["\']([^"\']+)["\']'));
    return m ? m[1] : null;
  };
  const apiKey = grab('apiKey');
  const projectId = grab('projectId');
  if (!apiKey || !projectId) {
    throw new Error('Could not extract apiKey/projectId from FIREBASE_CONFIG');
  }
  return { apiKey, projectId };
}

async function signIn(apiKey, email, password) {
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error('Sign-in failed: ' + (data?.error?.message || res.status));
  }
  return { idToken: data.idToken, localId: data.localId, email: data.email };
}

// Minimal Firestore value -> JS conversion for the fields we print.
function fieldVal(field) {
  if (!field) return undefined;
  if (field.stringValue !== undefined) return field.stringValue;
  if (field.integerValue !== undefined) return parseInt(field.integerValue, 10);
  if (field.doubleValue !== undefined) return field.doubleValue;
  if (field.booleanValue !== undefined) return field.booleanValue;
  if (field.nullValue !== undefined) return null;
  if (field.timestampValue !== undefined) return field.timestampValue;
  return JSON.stringify(field);
}

async function queryItems(projectId, apiKey, idToken) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      structuredQuery: { from: [{ collectionId: 'items' }], limit: 1000 },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error('runQuery failed: ' + (data?.error?.message || res.status));
  }
  const rows = Array.isArray(data) ? data : [];
  return rows
    .filter((r) => r && r.document)
    .map((r) => {
      const fields = r.document.fields || {};
      return {
        id: r.document.name.split('/').pop(),
        title: fieldVal(fields.title),
        seller_id: fieldVal(fields.seller_id),
        status: fieldVal(fields.status),
        created_at: fieldVal(fields.created_at),
      };
    });
}

(async () => {
  const [, , email, password] = process.argv;
  if (!email || !password) {
    console.error('Usage: node scripts/inspect-firestore.js <email> <password>');
    process.exit(1);
  }
  if (typeof fetch !== 'function') {
    console.error('This script requires Node 18+ (global fetch not available).');
    process.exit(1);
  }

  try {
    const { apiKey, projectId } = readFirebaseConfig();
    console.log(`Project: ${projectId}`);
    console.log(`Signing in as: ${email}`);

    const { idToken, localId } = await signIn(apiKey, email, password);
    console.log(`Signed in. uid (localId): ${localId}\n`);

    const items = await queryItems(projectId, apiKey, idToken);
    console.log(`items collection: ${items.length} total document(s)\n`);

    let mine = 0;
    items.forEach((it, i) => {
      const isMine = it.seller_id === localId;
      if (isMine) mine++;
      const created =
        typeof it.created_at === 'number'
          ? new Date(it.created_at).toISOString()
          : it.created_at;
      console.log(`#${i + 1} ${it.id}`);
      console.log(`    title:      ${it.title}`);
      console.log(`    seller_id:  ${it.seller_id}`);
      console.log(`    status:     ${it.status}`);
      console.log(`    created_at: ${it.created_at}  (${created})`);
      console.log(`    mine:       ${isMine ? 'YES' : 'no'}`);
    });

    console.log(`\nSummary: ${items.length} total item(s), ${mine} belong to ${localId} (${email}).`);
  } catch (err) {
    console.error('\nERROR: ' + err.message);
    process.exit(1);
  }
})();
