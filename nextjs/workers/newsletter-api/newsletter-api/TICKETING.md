# Ticketing (slice 1)

A paid Stripe Checkout Session becomes one ticket: a KV record, a QR code, and a confirmation email.

## Flow

1. `POST /api/checkout` creates the session (unchanged).
2. Stripe calls `POST /api/stripe/webhook` with `checkout.session.completed`. The signature is verified (HMAC-SHA256, 5 minute tolerance, any `v1` entry), then `ensureTicket` writes the ticket and `sendTicketEmail` mails it.
3. The success page calls `GET /api/ticket?session_id=cs_...`. The Worker reads the session back from Stripe, requires `payment_status=paid`, creates the ticket if the webhook has not yet, and returns `ticket_id`, `checkin_url` and `qr_svg`. It never returns the buyer's email or phone.

## Idempotency

`ticket id = HMAC-SHA256(TICKET_SECRET, session id)`, 128 bits. The webhook, a Stripe retry, and the success-page lookup all derive the same id, so there is only ever one ticket per session. The email is sent once: the ticket records `email_sent_at`, and Resend gets the idempotency key `ci-ticket-email-<id>`.

Webhook answers: 400 bad signature, 200 for other event types, unpaid sessions and sessions without `metadata.class_date` (so other Stripe products on the account are ignored), 500 on KV or Resend 5xx/429 (Stripe retries), 200 with `email: "failed"` and `email_error` on the ticket for a permanent Resend 4xx (such as an invalid address).

## KV (binding `TICKETS`)

| key | value |
| --- | --- |
| `tkt:<ticketId>` | ticket JSON: id, session_id, name, email, phone, event_date, kind, amount, currency, created_at, checked_in_at, email_sent_at, email_id, email_error |
| `date:<YYYY-MM-DD>:<ticketId>` | `1`. Index: list a date's attendees with the prefix `date:<date>:` |

## Setup

| name | where | notes |
| --- | --- | --- |
| `TICKETS` | `wrangler.jsonc` `kv_namespaces` | `wrangler kv namespace create TICKETS`, paste the id over the placeholder. Dev and tests use a local store. |
| `STRIPE_WEBHOOK_SECRET` | `wrangler secret put` / `.dev.vars` | Dev: `whsec_` from `stripe listen`. Prod: signing secret of the live endpoint. |
| `TICKET_SECRET` | `wrangler secret put` / `.dev.vars` | `openssl rand -hex 32`. Keep it: changing it orphans issued QR codes. |
| `CHECKIN_BASE_URL` | optional var | Defaults to `https://miamicontactimprov.com/checkin/`. |

`STRIPE_SECRET_KEY` and `RESEND_API_KEY` already exist. Test and live Stripe keys need separate webhook endpoints, each with its own `whsec_`.

## Try it locally

```
npm run dev                                  # wrangler dev on :8787
stripe listen --events checkout.session.completed --forward-to localhost:8787/api/stripe/webhook
stripe trigger checkout.session.completed --add checkout_session:metadata[class_date]=2026-11-20 \
  --add checkout_session:metadata[kind]=class
```

The trigger fixture's buyer is `stripe@example.com`, which Resend rejects, so no mail is sent for it. To see the email, replay a real event with the buyer's address changed and re-signed with the `stripe listen --print-secret` value.

## Not in slice 1

Check-in scanner page (`/checkin/<id>`, marks `checked_in_at`), 24 hour reminders, host attendee list view, replacing the Luma buy buttons.

## Memberships and Black Friday (slices A-min and B)

Monthly $40 = 4 class credits per billing month, unused roll over, 8 banked at most. Yearly $260 = one class per week. Classes only, not jams or workshops. Source: the V1 decisions of 2026-11-21. Code: `src/membership.ts`, `src/membership-email.ts`, `src/bf.ts`.

Stripe (live account): product `prod_VfS5ul2lp1plef` "Miami CI Membership"; prices `ci-member-monthly-40` (`price_1Ue7AyGR8ZpP3RhohOxjhayc`) and `ci-member-yearly-260` (`price_1Ue7AyGR8ZpP3Rhovol4O08u`); Customer Portal configuration `bpc_1Ue7B6GR8ZpP3RhozQD3cU8Z` (cancel at period end, card and invoices, no plan switching), set as the `CI_PORTAL_CONFIG_ID` var.

Before deploy: add `invoice.paid` and `customer.subscription.deleted` to the enabled events of the live webhook endpoint (it has only the two checkout events). The handler ignores them harmlessly until then, but no credits are granted either.

| route | auth | what |
| --- | --- | --- |
| `POST /api/membership/checkout` | public, rate limited | `{plan: monthly or yearly, email?, utm_*}` -> Stripe Checkout URL (subscription mode, no promotion codes) |
| `GET /api/membership/session?session_id=` | public | confirms the session with Stripe; returns plan, `bf`, `manage_url` |
| `POST /api/membership/portal` | public | `{member_id}` (the unguessable id in the emailed manage link) -> Customer Portal URL |
| `GET /api/membership/members?email=&status=` | admin Bearer | host list: plan, status, credits left, friend passes, manage link |
| `POST /api/membership/checkin` | admin Bearer | `{member_id or email, date}` burns a credit (monthly) or the weekly slot (yearly); idempotent per date. Stub until the scanner page exists |
| `POST /api/ci/bf-run` | admin Bearer | BF email for past attendees. Dry run by default; `{confirm:"draft", dry_run:false}` queues attendees and creates one Resend broadcast draft. It cannot send |

Webhook: `checkout.session.completed` with `mode=subscription` creates the member and sends the welcome email; `invoice.paid` grants credits (only for `subscription_create` and `subscription_cycle`, capped at 8 banked, replay-safe by invoice id); `customer.subscription.deleted` marks the member canceled. Objects of other products on the shared account are ignored.

Black Friday: a membership paid between 2026-11-27 00:00 and 2026-12-01 23:59:59 America/New_York (judged on the payment event time) gets 3 friend passes, one per month for three months, listed in the member record and named in the welcome email. Redemption is by reply to that email; the host marks it in KV for now.

KV keys (binding `TICKETS`, same namespace as tickets):

| key | value |
| --- | --- |
| `mem:<memberId>` | profile: email, name, phone, stripe_customer, stripe_subscription, plan, status (active or canceled), created_at, canceled_at, bf `{campaign, purchased_at}` or null, friend_passes `[{n, available_from, redeemed_at, redeemed_by}]`, utm, email_sent_at, email_id, email_error |
| `memcr:<memberId>` | ledger: plan, credits `[{id, source_invoice, granted_at, used_at, used_for}]`, invoices (replay guard), period_start, period_end |
| `mememail:<sha256(normalized email)>` | memberId |
| `memci:<memberId>:<YYYY-MM-DD>` | credit id (or `weekly`): one check-in per class date |
| `memwk:<memberId>:<ISO week>` | class date: yearly, one class per week |
| `bfq:<sha256(normalized email)>` | BF queue `{status: drafted, segment, campaign, created_at}` |
| `bfdraft:bf-2026` | the Resend broadcast id of the draft |

`memberId` = first 128 bits of HMAC-SHA256(`TICKET_SECRET`, `ci-member:<stripe customer id>`). Profile and ledger are separate keys because KV has no compare-and-set and the checkout and invoice events arrive together; each key has one writer family.
