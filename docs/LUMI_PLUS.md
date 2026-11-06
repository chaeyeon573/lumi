# Lumi+ — what exists and what payments still need

Owner decisions (2026-11-06): extras = advanced People filters (spoken language, interests, communities),
folders + private notes for saved people, higher group / meetup limits. US$2.99 / month. Safety, basic people
finding, meetups and the timetable stay free. **Screens first — no payment account yet.**

## Built

| Piece | Where |
|---|---|
| Price, free vs Lumi+ limits, which filters are extras, refusal sentences | `packages/core/src/lib/plus.ts` (the only place) |
| Entitlement `user.plus` `{ since, until?, source }` — server-only, owner-only | types · `lib/selfupdate.ts` strips it · `lib/privacy.ts` `OWNER_ONLY_KEYS` |
| Flag `LUMI_PLUS` (server env, default off) | `server/plus.ts` `plusEnabled()` — read on every call |
| Gating (flag on): limits in `orgs.create` / `activities.create`, `POST /api/plus/people-match`, `/api/saved-people/*` | engine (`ctx.plusEnabled`), `server/plus.ts`, `server/savedpeople.ts` |
| S087 `/settings/plus`, S088 `/settings/plus/checkout`, lock + "Lumi+" on gated controls | `src/pages/settings/PlusPages.tsx`, `src/components/plus/PlusLock.tsx`, `src/hooks/usePlus.ts` |
| Admin grant / revoke for testing | `POST /api/admin/users/:id/plus` with `x-admin-key: ADMIN_KEY`, body `{ "on": true, "until"?: "2026-12-31" }` |

Flag off (how it deploys now): nothing is gated, everyone keeps today's features and limits (10 groups, no meetup
cap); S087 shows the benefits and price with a disabled **Coming soon**. Flag on: free = 10 groups / 5 upcoming
hosted meetups, Lumi+ = 30 / 20; advanced filters and folders/notes need Lumi+. **Continue Securely** always answers
"Payments aren't open yet. Nothing was charged." until a provider is wired.

## To take payments

`server/plus.ts` `paymentProviders()` returns the providers that are ready, and `startCheckout()` is the one place
a checkout begins. Lumi+ must be granted only by the provider's **confirmed** event, never by the checkout call.

- **Web — Stripe.** Account + a monthly US$2.99 Price. `startCheckout` creates a Checkout Session
  (`mode: subscription`, `client_reference_id` = user id) and returns `{ status: 'redirect', url }`. A webhook
  route verifies the Stripe signature (`STRIPE_WEBHOOK_SECRET`) and sets / clears `user.plus` (`source: 'stripe'`,
  `until` = current period end) on `checkout.session.completed`, `customer.subscription.updated/deleted`.
  Add a "Manage subscription" link (Stripe customer portal).
- **iPhone app — Apple In-App Purchase.** App Store Review Guideline 3.1.1: digital subscriptions bought inside
  the iOS app must use IAP (no Stripe link or button to an outside payment page in the app). Needs an
  auto-renewable subscription product in App Store Connect, StoreKit in the native shell (a bridge call from
  `src/lib/native.ts`; `startCheckout` returns `{ status: 'native', provider: 'apple_iap', productId }`), and a
  server endpoint that verifies the signed transaction and receives App Store Server Notifications V2 to set /
  clear `user.plus` (`source: 'apple'`). Also "Restore Purchases" and the auto-renew disclosure on S088.
- **Before opening:** real refund / cancellation terms in `/terms` §7 (Lumi+), privacy policy entry for the payment
  provider, `LEGAL_NAME`, and Apple's paid-apps agreement + tax/banking in App Store Connect.
