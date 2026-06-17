# SwipeCity Cross-Device Data Layer — Implementation Plan

Produced by a multi-agent architecture pass (map → architect → 2 adversarial
reviewers → finalize). The reviewers corrected three load-bearing errors in the
first draft (chat-create rule missing, interest-update rule missing, "raw bytes"
upload impossible on the iOS HTTP layer).

## Goal (plain English)
Make listings, buyer interests, and chat messages sync across users/devices via
a Firestore REST data layer in `firebaseNative` (the web SDK is unreliable in the
iOS WebView). Two people on two phones see the same thing; the "iOS seller chat
doesn't sync" bug gets fixed.

## (A) Decisions required before coding
**Decision 1 — Listing photo storage.** Photos are base64 in the listing record
today (bloats toward the 1MB Firestore limit; current upload stores them
corrupted). The "send raw bytes" fix can't work — `nativeHttp` only sends text.
- **1A (recommended):** upload via Firebase Storage's base64 endpoint
  (`?uploadType=media` + base64 content-transfer-encoding header), store only the
  short download URL in the item doc. Smallest change that works on iOS.
- **1B:** add `@capacitor-firebase/storage` native plugin — more robust binary,
  but adds a native dep / touches the iOS shell (guardrail) and is a bigger lift.
- Non-negotiable either way: request + read a download token (first token if
  several), and swap `images` to URLs **before** saving the doc.

**Decision 2 — `firestore.rules` changes (guardrail — explicit OK needed; deploy
to a test project first).**
1. Chats: allow *create* when you're a participant (today only existing chats are
   writable → no chat can ever start). **MANDATORY.**
2. Interests: allow the *seller* to update *only* `status` (today no update rule →
   accept/reject silently fail). **MANDATORY.**
3. Items: let a seller read their own *sold* listings (optional; recommended yes).
4. Interests read rule: probably already fine — test on emulator, change only if
   it actually fails. No change requested yet.

**Decision 3 — Sorted-feed indexes.** Filter+sort needs a composite index or the
query errors. **3A (recommended):** sort newest-first in the app (no index needed,
feed is small). **3B:** create composite indexes.

**Heads-up (not a decision):** Step 6 switches chats to a shared ID scheme, so
existing local-only chats become invisible after upgrade. Pre-launch throwaway
data → recommend accept the loss, no migration.

## Cross-cutting rules (corrections from review, baked into every step)
- Use the **real signed-in uid** everywhere; assert it's present and error out if
  missing (remove the `'user123'` fallback — it gets rejected by rules).
- **snake_case** field names (`seller_id`, `buyer_id`, `status`, `participants`);
  the current interest path writes camelCase → rules check missing fields → every
  authed interest fails. Hard-map, don't copy the old object.
- Every new method (reads too) does **401 → refresh → retry-once**, not just an
  age pre-check (iOS backgrounds for hours).
- `created_at` stays an integer (ms) — the record parser doesn't do server timestamps.

## (B) Engineering steps (strictly 0 → 6, each independently testable)
- **Step 0 — Fix photo upload** (`firebaseNative.uploadFile`/`getDownloadURL`).
  Riskiest step. Test: A uploads → link renders as a real image for B.
- **Step 1 — Add backend methods** (`firebaseNative`): `runQuery` helper +
  `createItem`, `getItems`, `getMyItems`, `createInterest`, `getIncomingInterests`,
  `updateInterestStatus`, `createChatDoc`, `sendChatMessage`, `loadChatMessages`
  (limited), `loadUserChats`. Test via a temp dev button.
- **Step 2 — Rules + indexes** (`firestore.rules`). Gated on Decision 2. Test on
  emulator/test project: seller inbox read + accept/reject + new chat create succeed.
- **Step 3 — Route data layer to backend** (`dataIntegration.js`): items first,
  fallback to local on error, dedupe by ID. Test: A lists → B's feed shows it.
- **Step 4 — Wire listing creation + photos + real uid** (`App.js`). Test: A lists
  with 2 photos → B sees it with photos; reload persists.
- **Step 5 — Seller interest inbox + accept/reject** (`App.js`). Test: B interested
  → A (other device) sees it → accept → B sees accepted.
- **Step 6 — Shared syncing chat** (`App.js`): both sides compute the same
  `chat_[sortedUids]_[itemId]` id; the interest record must carry both uids + item
  id; normalize uid (never mix user.id/user.uid); stop writing message bodies into
  the user profile (the real 1MB time-bomb). Test: A↔B messages sync across devices.

**Riskiest:** Step 0 (iOS text-only transport + everything downstream assumes small
links). Second: Step 6's shared chat id (mismatched ids → silent no-sync).
