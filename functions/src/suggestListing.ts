import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Anthropic from '@anthropic-ai/sdk';

// Photo -> listing draft. The app sends 1-3 downscaled JPEGs; Claude returns a
// title, category, condition, description and a local resale price range that
// pre-fill the Add Item form (the seller reviews and edits before posting).
//
// The API key lives in Secret Manager (`firebase functions:secrets:set
// ANTHROPIC_API_KEY`), never in the app bundle.

const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');

const DAILY_LIMIT = 25; // per user; keeps one account from draining the credits
const MAX_IMAGES = 3;
const MAX_IMAGE_B64_CHARS = 1_500_000; // ~1.1MB JPEG

const CATEGORIES = ['sneakers', 'vintage', 'electronics', 'home', 'books', 'fitness', 'other'];
const CONDITIONS = ['new', 'like-new', 'good', 'fair'];

const SYSTEM_PROMPT = `You write listings for SwipeCity, a local secondhand marketplace (like Facebook Marketplace) in the US.

From the seller's photos, draft a listing a buyer would trust:
- title: what it is, with brand/model only if visible or clearly recognizable. Max 60 characters, no emoji, no hype words.
- category: the closest of the allowed values; "other" if none fit.
- condition: judge only from what's visible. If wear can't be seen, prefer "good" over "like-new". Use "new" only if it appears unused or in original packaging.
- description: 2-4 short, plain sentences. Describe what's visible (color, size cues, included pieces, visible wear). Never invent specs, sizes, or history you can't see; the seller will add those.
- price_low / price_high / price_suggested: realistic local used-item asking prices in whole US dollars, based on typical secondhand resale, not retail.
- not_sellable_reason: null normally. If the photos don't show a sellable item, or show something that can't be sold on a general marketplace (weapons, drugs, alcohol, tobacco/vapes, prescription items, live animals, recalled products), give a short reason and leave the other fields as best-effort.`;

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    category: { type: 'string', enum: CATEGORIES },
    condition: { type: 'string', enum: CONDITIONS },
    description: { type: 'string' },
    price_low: { type: 'integer' },
    price_high: { type: 'integer' },
    price_suggested: { type: 'integer' },
    not_sellable_reason: { type: ['string', 'null'] },
  },
  required: ['title', 'category', 'condition', 'description', 'price_low', 'price_high', 'price_suggested', 'not_sellable_reason'],
  additionalProperties: false,
};

// Count today's calls for this user; throws when over the limit.
async function checkDailyLimit(uid: string) {
  const day = new Date().toISOString().slice(0, 10);
  const ref = admin.firestore().doc(`ai_usage/${uid}_${day}`);
  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const count = (snap.exists ? snap.data()?.count : 0) || 0;
    if (count >= DAILY_LIMIT) {
      throw new HttpsError('resource-exhausted', 'Daily auto-fill limit reached. Try again tomorrow.');
    }
    tx.set(ref, { uid, day, count: count + 1 }, { merge: true });
  });
}

export const suggestListing = onCall(
  { secrets: [ANTHROPIC_API_KEY], timeoutSeconds: 60, memory: '512MiB' },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Sign in to use auto-fill.');

    const images: unknown = request.data?.images;
    if (!Array.isArray(images) || images.length === 0) {
      throw new HttpsError('invalid-argument', 'Add a photo first.');
    }
    const photos = images.slice(0, MAX_IMAGES).map((img) => {
      if (typeof img !== 'string' || img.length > MAX_IMAGE_B64_CHARS) {
        throw new HttpsError('invalid-argument', 'Photo is too large.');
      }
      return img.replace(/^data:image\/\w+;base64,/, '');
    });

    await checkDailyLimit(uid);

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    let response;
    try {
      response = await client.beta.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 4000,
        output_config: {
          effort: 'low',
          format: { type: 'json_schema', schema: OUTPUT_SCHEMA },
        },
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            ...photos.map((data) => ({
              type: 'image' as const,
              source: { type: 'base64' as const, media_type: 'image/jpeg' as const, data },
            })),
            { type: 'text' as const, text: 'Draft the listing for this item.' },
          ],
        }],
      });
    } catch (error) {
      if (error instanceof Anthropic.RateLimitError) {
        throw new HttpsError('unavailable', 'Auto-fill is busy. Try again in a minute.');
      }
      if (error instanceof Anthropic.APIError) {
        console.error(`Anthropic API error ${error.status}:`, error.message);
      } else {
        console.error('suggestListing failed:', error);
      }
      throw new HttpsError('internal', "Auto-fill isn't available right now.");
    }

    if (response.stop_reason === 'refusal') {
      throw new HttpsError('failed-precondition', "We couldn't auto-fill this one. Please fill it in yourself.");
    }

    const text = response.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');
    let draft;
    try {
      draft = JSON.parse(text);
    } catch {
      console.error('suggestListing: unparseable output', response.stop_reason);
      throw new HttpsError('internal', "Auto-fill couldn't read that photo. Try another angle.");
    }

    console.log('suggestListing', { uid, images: photos.length, usage: response.usage });
    return draft;
  }
);
