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
