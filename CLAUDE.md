# SwipeCity — Agent Brief

> This file is standing instructions for how to work on SwipeCity. It is NOT a status log.
> Current state lives in git history and in PROGRESS.md. Read those for "what's done."

## Who I am, how to work with me
- I'm the product owner. I have strong product/UX judgment but I'm **not a developer**.
- Explain every change in terms of **user-facing behavior first**. Technical detail only if I ask, or if I need it to make a decision.
- Before doing anything non-trivial, tell me **what could break** and **what's hard to undo**.
- When you finish a change, show me: (1) what a user will now experience differently, (2) how to see it myself, (3) anything I now need to test.
- Default to the **simplest version that tests the idea**. Don't gold-plate. If you're tempted to build something elaborate, propose the minimal version first and let me choose.

## What SwipeCity is
A Tinder-style local marketplace. Users swipe through nearby items, chat with sellers, and manage their own listings. Buyer mode and seller mode. The core loop that has to feel great: **swipe → match/interest → chat → transact.**

**Target user:** Facebook Marketplace buyers — people comfortable buying secondhand/local online who are frustrated with how clunky and sloppy Marketplace feels.

**Thesis:** Marketplace's interface is bad. If we combine the addictive, highly interactive feel of dating-app swiping (Tinder) with local commerce, browsing becomes something people *want* to do. The interface is our wedge against an incumbent that wins on inventory but loses on experience.

**What this means for how we build:**
- The swipe experience is our hook — it must feel noticeably better and more fun than scrolling Marketplace. Polish here is core, not cosmetic.
- BUT addictiveness has to funnel into transactions, not just engagement. Swiping that produces zero purchases kills the marketplace (sellers leave). Always weight the loop toward swipe → **chat → transact**, not swiping for its own sake.
- Our weakness vs. Marketplace is **liquidity** (they already have the buyers and sellers). A beautiful interface over empty inventory still fails. Favor anything that helps inventory feel dense and local. Be skeptical of features that add engagement but not transactions or supply.

> [Still open / to decide: launch city and starting category. The interface advantage only shows up where inventory is dense enough that swiping surfaces real items. Pick one city + one category to start.]

## How to reason about improvements (do this when I ask "what should we work on")
1. State the **user problem**, not the feature. ("Sellers lose buyers because chat is slow to load" — not "add a loading spinner.")
2. Rank by **impact on the core loop** above. Things that make swipe→chat→transact smoother beat everything else.
3. For each item give: the user problem, the simplest fix, the effort (small/medium/large), and what could break.
4. Flag anything that touches money, trust, or first-run experience as **high stakes** — those make or break a marketplace.
5. Present the ranked list and **stop**. Let me pick before you build.

## Architecture (so you don't have to rediscover it each session)
- **One codebase**: React web app in `apps/web/src/`. Main entry: `apps/web/src/App.js`.
- **Capacitor** wraps the web app into native iOS (`/ios`) and Android (`/android`) shells. Most work happens in `apps/web/src/` — the native shells rarely change.
- **Firebase** is the backend: Auth (email passwordless), Firestore (data + chat), Storage (images), FCM (push).
- Build + push to mobile: `npm run build:web && npx cap sync`, then `npx cap open ios` / `npx cap open android`.

## Guardrails — flag and WAIT for my explicit go-ahead before touching:
- **Firebase security rules** (`firestore.rules`, `storage.rules`) — a mistake here can expose user data or lock everyone out.
- **`.env` / any credentials / API keys** — never print these, never commit them, never change them silently.
- **Deployment scripts** (`deploy.sh`) and anything that submits to the App Store / Play Store.
- **Anything that regenerates the native iOS/Android shells** — this is where a non-dev most easily ends up with a broken build. Warn me, explain why it's needed, and walk me through it.
- **Data seeding / clearing** in any environment that isn't obviously throwaway dev data.

## Standing permissions — do these WITHOUT asking
When I give you a goal or a list, work it end to end and report at the end. You don't need my go-ahead for:
- Code changes in `apps/web/src/` and `functions/src/` (writing code only; deploying is a guardrail above).
- Running builds, tests, `npx cap sync` (sync only — not regenerating the native shells), and the local web server.
- Committing to `main` with clear messages, and pushing to GitHub (`origin`). No force-push, no rewriting history.
- Using the test accounts in `scripts/test-accounts.local.json` on the live Firebase: sign in, post/delete test listings, send interests and messages. Delete any test listings you create. Never touch other users' data.
- Driving the app in Chrome (two users = `localhost` vs `127.0.0.1`, which keep separate storage) to verify changes on real screens.
- Fixing bugs you find along the way, if they are small and clearly bugs. Anything that changes how the product behaves in a way I haven't decided goes in your report as a question.

**Definition of done for a change:** web build passes; `node apps/web/src/__tests__/launch.regression.test.js` passes; the other tests in `apps/web/src/__tests__/` pass; for anything touching listings, interests or chat, `node scripts/live-e2e.js` passes; UI changes checked in Chrome when practical. Then commit.

**Still stop and ask** for everything under Guardrails, App Store/TestFlight actions, spending money (including Claude API credits beyond small tests), deleting real data, and product decisions with real trade-offs.

## Known open issue (move resolved items out of here)
- iOS *seller-mode* chat messages don't sync to Android. Buyer mode and same-device work fine. Edge case, not blocking, but relevant if we touch chat sync.

## Things to verify, don't assume
- The README and old notes claim "production ready." Treat that as unverified. When it matters, check the actual code or ask me to test, rather than trusting a doc that says "✅ complete."
