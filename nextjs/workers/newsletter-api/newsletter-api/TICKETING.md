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

Monthly $40 = 4 class credits per billing month; unused credits do not carry over. Yearly $260 = one class per week. Classes only, not jams or workshops. Source: the V1 decisions of 2026-11-21. Code: `src/membership.ts`, `src/membership-email.ts`, `src/bf.ts`.

Stripe (live account): product `prod_VfS5ul2lp1plef` "Miami CI Membership"; prices `ci-member-monthly-40` (`price_1Ue7AyGR8ZpP3RhohOxjhayc`) and `ci-member-yearly-260` (`price_1Ue7AyGR8ZpP3Rhovol4O08u`); Customer Portal configuration `bpc_1Ue7B6GR8ZpP3RhozQD3cU8Z` (cancel at period end, card and invoices, no plan switching), set as the `CI_PORTAL_CONFIG_ID` var.

Before deploy: enable these events on the live webhook endpoint (it has only the two checkout events): `checkout.session.async_payment_succeeded` (already on), `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`, `charge.refunded`, `charge.dispute.created`. The handler ignores them harmlessly until then, but no credits are granted and no suspension happens either.

| route | auth | what |
| --- | --- | --- |
| `POST /api/membership/checkout` | public, rate limited | `{plan: monthly or yearly, email?, utm_*}` -> Stripe Checkout URL (subscription mode, no promotion codes) |
| `GET /api/membership/session?session_id=` | public | confirms the session with Stripe; returns plan, `bf`, `manage_url` |
| `POST /api/membership/portal` | public | `{member_id}` (the unguessable id in the emailed manage link) -> Customer Portal URL |
| `GET /api/membership/members?email=&status=&limit=&cursor=` | admin Bearer | host list (default 25, max 50 per page, `next_cursor`): plan, status, credits left, friend passes, duplicate subscriptions. No manage link (it is the member's secret) |
| `POST /api/membership/checkin` | admin Bearer | `{member_id or email, date}` burns a credit (monthly) or the weekly slot (yearly); idempotent per date. Stub until the scanner page exists |
| `POST /api/ci/bf-run` | admin Bearer | BF email for past attendees. Dry run by default; `{confirm:"draft", dry_run:false}` creates one Resend broadcast draft and, only after that succeeds, queues the attendees. It cannot send. Every response says `audience:"all"`: the draft targets the whole Resend audience, not just the attendees, and `truncated` says whether the ticket scan hit its cap |

Webhook: `checkout.session.completed` or `async_payment_succeeded` with `mode=subscription` creates the member (or, for a known customer, reactivates and updates subscription and plan) and sends the welcome email once per session; `invoice.paid` on `subscription_create` and `subscription_cycle` with `amount_paid > 0` grants exactly 4 credits for that invoice's period and expires the previous period's unused credits (no rollover, no cap logic), replay-safe by invoice id; `customer.subscription.updated` syncs the plan and suspends on `past_due`/`unpaid` (restores on `active` when the reason was payment); `customer.subscription.deleted` marks canceled; `charge.refunded` (full refunds) and `charge.dispute.created` on a membership payment suspend until a human restores them. Only an `active` member can check in; yearly also needs a paid period that has not ended. Objects of other products on the shared account are ignored. A second paid subscription while one is running is kept out of access and shown as `duplicate_subscriptions` for a manual refund; Checkout cannot prevent it when no email was sent with the request.

Black Friday: a membership paid between 2026-11-27 00:00 and 2026-12-01 23:59:59 America/New_York (judged on the payment event time) gets 3 friend passes, one per month for three months, listed in the member record and named in the welcome email. Redemption is by reply to that email; the host marks it in KV for now.

KV keys (binding `TICKETS`, same namespace as tickets). One writer family per key, because KV has no compare-and-set:

| key | writer | value |
| --- | --- | --- |
| `mem:<memberId>` | checkout.completed, subscription.updated/deleted, charge events | profile: email, name, phone, stripe_customer, stripe_subscription, plan, status (active, suspended, canceled), suspended_reason, created_at, canceled_at, bf, friend_passes `[{n, available_from, redeemed_at, redeemed_by}]`, utm, sessions (replay guard), extra_subscriptions |
| `memcr:<memberId>` | invoice.paid | ledger: plan, invoices (replay guard), period_start, period_end, credit_invoice (the granting invoice whose credits are current), credit_period_start |
| `memcredit:<memberId>:<invoiceId>.<n>` | invoice.paid | one credit, written once, never modified; the invoice id in the key tags it with its period |
| `memburn:<memberId>:<creditId>` | check-in | the class date that spent the credit (the claim) |
| `memci:<memberId>:<YYYY-MM-DD>` | check-in | credit id or `weekly`: one check-in per class date |
| `memwk:<memberId>:<ISO week>` | check-in | class date: yearly, one class per week |
| `mememail:<sha256(normalized email)>` | checkout.completed | memberId |
| `mememailst:<memberId>` | welcome email | sent_sessions, latest_session, sent_at, email_id, error |
| `mempay:<charge or payment intent id>` | invoice.paid | memberId, so refunds and disputes find the member |
| `bfq:<sha256(normalized email)>` | bf-run (after the draft exists) | `{status: drafted, segment, campaign, created_at}` |
| `bfdraft:bf-2026` | bf-run | the Resend broadcast id of the draft |

`memberId` = first 128 bits of HMAC-SHA256(`TICKET_SECRET`, `ci-member:<stripe customer id>`) (version `v1`; setting `CI_MEMBER_ID_VERSION` to another value salts the input and orphans old ids, so leave it unset). It is the secret in the emailed manage link: the site strips `?m=` from the address bar before analytics loads, and logs carry only 8 hex chars of its hash.

No rollover: only credits whose invoice is the ledger's `credit_invoice` count, show as remaining or can be spent. A granting invoice writes its 4 credit keys first and then moves `credit_invoice` in the ledger, which expires the previous period's unused credits in one write; no credit key is deleted, so history stays. An invoice whose period starts before `credit_period_start` (delivered late) grants nothing. A ledger written before this change has no `credit_invoice`; all its credits count until the next granting invoice.

Spending a credit: the oldest current-period credit with no `memburn` key is claimed by writing `memburn` = date and reading it back; if the value is not ours the next credit is tried. A second scan of the same date writes `memci` and reads it back, releasing its claim if it lost. Without compare-and-set, two scans landing inside one KV propagation window (about a second) can both read back their own write. That residual window is accepted: the host scans one member at a time at the door, and the worst case is one extra credit spent, visible in `memburn`.
