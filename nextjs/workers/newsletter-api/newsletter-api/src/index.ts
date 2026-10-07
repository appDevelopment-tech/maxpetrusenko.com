/**
 * Newsletter Subscription API
 *
 * Stores subscribers in KV, mirrors them into the Resend audience, and sends a
 * welcome email to people who arrive from the Contact Improv Miami site.
 *
 * /api/list and /api/get/* read other people's email addresses, so they require
 * `Authorization: Bearer <ADMIN_TOKEN>`. /api/subscribe stays public.
 */

import { handleCheckout } from './checkout';
import { createSingleUseCode, promoCodeStatus, randomCodeSuffix } from './stripe';
import { sendSms, type TwilioEnv } from './sms';
import { confirmationBody, confirmationLink, plainPage, verifyConfirmation } from './resubscribe';

interface SubscriptionRequest {
	email: string;
	consent: boolean;
	source?: string;
	// Optional: a form that only ever asked for an email keeps working with this
	// unset. Present only on the Miami Contact Improv forms as of 2026-09-28.
	phone?: string;
	// Honeypot. A real form never fills this field; a submission that does is
	// answered as if it worked and never stored.
	company?: string;
	// The acquisition fields a page sends with a signup. All optional: a form on an
	// older page posts an email, a consent flag and a source, and that has to keep
	// working exactly as before.
	offer?: string;
	campaign?: string;
	landing_page?: string;
	referrer?: string;
	utm_source?: string;
	utm_medium?: string;
	utm_content?: string;
}

interface SubscriptionResponse {
	ok: boolean;
	error?: string;
}

interface KVNamespace {
	get(key: string): Promise<string | null>;
	put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
	list(): Promise<{ keys: Array<{ name: string }> }>;
}

interface ExecutionContext {
	waitUntil(promise: Promise<unknown>): void;
}

interface ExportedHandler<TEnv> {
	fetch(request: Request, env: TEnv, ctx: ExecutionContext): Promise<Response>;
}

export interface Env {
	EMAIL_SUBS: KVNamespace;
	ADMIN_TOKEN?: string;
	RESEND_API_KEY?: string;
	RESEND_AUDIENCE_ID?: string;
	// Id of the 10%-off, duration=once Stripe coupon. Each first CI signup gets a
	// unique single-use promotion code on it, created with STRIPE_SECRET_KEY.
	CI_ONE_EVENT_COUPON_ID?: string;
	// Meta Conversions API. Until both are set the events endpoint logs what it
	// would have sent and answers 202, so the wiring can be tested before the ad
	// account exists.
	META_PIXEL_ID?: string;
	META_CAPI_TOKEN?: string;
	META_TEST_EVENT_CODE?: string;
	// Stripe secret key, used by /api/checkout and by the single-use promotion codes.
	STRIPE_SECRET_KEY?: string;
	// Twilio REST credentials for texting the code to a phone number left on the form.
	TWILIO_ACCOUNT_SID?: string;
	TWILIO_AUTH_TOKEN?: string;
	// A sending number (+1...) or a Messaging Service SID (MG...).
	TWILIO_FROM?: string;
	// Signs the resubscribe confirmation links.
	CI_CONFIRM_SECRET?: string;
	// Cloudflare rate limit binding (wrangler.jsonc `ratelimits`): 10 per IP per 60s.
	SUBSCRIBE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

const RESEND_API = 'https://api.resend.com';

// Subscribers from the Contact Improv Miami site join the same list as everyone
// else, but they get a welcome email carrying the series discount code.
const CI_SOURCE_PREFIX = 'miamicontactimprov';
const CI_FROM = 'Contact Improv Miami <hello@miamicontactimprov.com>';
const CI_SUBJECT = 'Your 10% off one event';
const CI_SERIES_LINK = 'https://miamicontactimprov.com/fundamentals';

// Meta Conversions API. The version is pinned here alone; bump it in one place when
// Meta retires it rather than having it drift through the code.
const META_GRAPH_API = 'https://graph.facebook.com';
const META_GRAPH_VERSION = 'v23.0';

// The three events the ad test is scored on. Lead is what a signup is worth,
// CompleteRegistration is a paid place in the series, and Attend is a body in the
// room, which is the only number that decides spend. Attend is a custom event name:
// Meta has no standard one for it, and it reads the same in Events Manager.
const META_EVENTS = ['Lead', 'CompleteRegistration', 'Attend'] as const;
type MetaEventName = (typeof META_EVENTS)[number];

function isValidEmail(email: string): boolean {
	const trimmed = email.trim().toLowerCase();
	return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed);
}

// Phone is optional, so an empty string is valid (nothing to check). When one is
// given it only has to look like a phone number: 7 to 15 digits once formatting
// is stripped, which is the E.164 length range and permissive enough for however
// someone chooses to type a US or international number.
function isValidPhone(phone: string): boolean {
	if (!phone) return true;
	const digits = phone.replace(/[^0-9]/g, '');
	return digits.length >= 7 && digits.length <= 15;
}

// Compares the whole token every time, so the response time does not reveal how
// much of it matched.
function tokenMatches(provided: string, expected: string): boolean {
	const a = new TextEncoder().encode(provided);
	const b = new TextEncoder().encode(expected);
	let diff = a.length ^ b.length;
	for (let i = 0; i < b.length; i++) {
		diff |= (a[i] ?? 0) ^ b[i];
	}
	return diff === 0;
}

function isAdmin(request: Request, env: Env): boolean {
	const expected = env.ADMIN_TOKEN;
	if (!expected) return false; // no token configured means no admin access
	const header = request.headers.get('Authorization') || '';
	if (!header.startsWith('Bearer ')) return false;
	return tokenMatches(header.slice('Bearer '.length).trim(), expected);
}

// Meta takes user data as SHA-256 hex of the trimmed, lowercased value, so the
// address itself never leaves the Worker in a readable form.
async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, '0'))
		.join('');
}

interface EventsRequest {
	event?: string;
	email?: string;
	event_id?: string;
	value?: number;
	currency?: string;
	event_source_url?: string;
	// Only send these when they came off the attendee's own device. A check-in
	// script running on Max's laptop would otherwise hand Meta his IP and claim it
	// was the person at the door, which costs match quality instead of buying it.
	client_ip_address?: string;
	client_user_agent?: string;
}

interface EventsResponse {
	ok: boolean;
	event?: string;
	forwarded?: boolean;
	error?: string;
}

// One event, one POST to the pixel. Meta answers with the count it accepted and a
// message that names the reason when it does not.
async function forwardToMeta(
	env: Env,
	event: MetaEventName,
	fields: { emailHash: string; eventId: string; value?: number; currency?: string; sourceUrl?: string; ip?: string; agent?: string },
): Promise<boolean> {
	const query = new URLSearchParams({ access_token: env.META_CAPI_TOKEN ?? '' });
	if (env.META_TEST_EVENT_CODE) query.set('test_event_code', env.META_TEST_EVENT_CODE);

	const userData: Record<string, string[]> = { em: [fields.emailHash] };
	if (fields.ip) userData.client_ip_address = [fields.ip];
	if (fields.agent) userData.client_user_agent = [fields.agent];

	const payload: Record<string, unknown> = {
		event_name: event,
		// Seconds, which is what the API wants, and the moment the Worker accepted
		// the event rather than the moment Meta got round to reading it.
		event_time: Math.floor(Date.now() / 1000),
		event_id: fields.eventId,
		action_source: 'website',
		user_data: userData,
	};
	if (fields.sourceUrl) payload.event_source_url = fields.sourceUrl;
	if (typeof fields.value === 'number' && Number.isFinite(fields.value)) {
		payload.custom_data = { value: fields.value, currency: fields.currency ?? 'USD' };
	}

	try {
		const response = await fetch(
			`${META_GRAPH_API}/${META_GRAPH_VERSION}/${env.META_PIXEL_ID}/events?${query.toString()}`,
			{
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ data: [payload] }),
			},
		);
		const result = (await response.json().catch(() => null)) as
			| { events_received?: number; error?: { message?: string } }
			| null;
		if (!response.ok) {
			console.error('[Meta CAPI rejected]', event, response.status, JSON.stringify(result));
			return false;
		}
		console.log('[Meta CAPI accepted]', event, result?.events_received ?? 0, fields.eventId);
		return true;
	} catch (error) {
		console.error('[Meta CAPI failed]', event, error);
		return false;
	}
}

async function resendPost(env: Env, path: string, body: unknown): Promise<Response> {
	return fetch(`${RESEND_API}${path}`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${env.RESEND_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(body),
	});
}

type ContactResult = 'created' | 'existing' | 'unsubscribed' | 'failed';

// Looks the contact up and creates it only on a 404. An unsubscribed contact is never
// flipped here: the public form cannot override an opt-out, so the caller sends a
// signed confirmation link instead (see resubscribe.ts).
// Audience-scoped endpoints on purpose: Resend now lists Audiences as deprecated in
// favour of Segments, but its docs do not show how a new contact is attached to a
// segment, and this Worker's RESEND_AUDIENCE_ID is the audience the list lives in.
async function upsertResendContact(env: Env, email: string, kvUnsubscribed: boolean): Promise<ContactResult> {
	const path = `/audiences/${env.RESEND_AUDIENCE_ID}/contacts/${encodeURIComponent(email)}`;
	let lookup: Response;
	try {
		lookup = await fetch(`${RESEND_API}${path}`, { headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` } });
	} catch (error) {
		console.error('[Resend lookup error]', String(error));
		return 'failed';
	}
	if (lookup.ok) {
		const contact = (await lookup.json().catch(() => null)) as { unsubscribed?: boolean } | null;
		return contact?.unsubscribed || kvUnsubscribed ? 'unsubscribed' : 'existing';
	}
	if (lookup.status !== 404) {
		console.error('[Resend lookup failed]', lookup.status);
		return 'failed';
	}
	try {
		const response = await resendPost(env, `/audiences/${env.RESEND_AUDIENCE_ID}/contacts`, { email, unsubscribed: false });
		if (!response.ok) {
			console.error('[Resend contact failed]', response.status, await response.text());
			return 'failed';
		}
	} catch (error) {
		console.error('[Resend create error]', String(error));
		return 'failed';
	}
	return 'created';
}

// One confirmation email per address per 24 hours. The mark is written first so a
// double submit cannot send two.
async function sendConfirmation(env: Env, email: string, origin: string): Promise<void> {
	if (!env.CI_CONFIRM_SECRET) {
		console.error('[Confirmation skipped] CI_CONFIRM_SECRET is not set');
		return;
	}
	const key = `ci-confirm:${await sha256Hex(normalizeEmail(email))}`;
	try {
		if (await env.EMAIL_SUBS.get(key)) return;
		await env.EMAIL_SUBS.put(key, String(Date.now()), { expirationTtl: 24 * 60 * 60 });
	} catch (error) {
		console.error('[Confirmation skipped] KV unavailable', String(error));
		return;
	}
	const link = await confirmationLink(origin, env.CI_CONFIRM_SECRET, email, Math.floor(Date.now() / 1000));
	try {
		const response = await resendPost(env, '/emails', {
			from: CI_FROM,
			to: [email],
			subject: 'Confirm you want emails again',
			text: confirmationBody(link),
		});
		if (!response.ok) console.error('[Confirmation email failed]', response.status);
	} catch (error) {
		console.error('[Confirmation email error]', String(error));
	}
}

// GET /api/ci/resubscribe: the only place an opt-out is reversed, and only with a
// valid, unexpired signature. Re-sends the same unused code (email, and SMS if the
// one-per-number rule allows it).
async function handleResubscribe(request: Request, env: Env): Promise<Response> {
	const params = new URL(request.url).searchParams;
	const page = (status: number, message: string) =>
		new Response(plainPage('Contact Improv Miami', message), { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
	if (!env.CI_CONFIRM_SECRET) return page(503, 'This link is not available right now.');
	const verdict = await verifyConfirmation(env.CI_CONFIRM_SECRET, params, Math.floor(Date.now() / 1000));
	if (verdict === 'expired') return page(410, 'This link expired. Sign up again on the site to get a new one.');
	if (verdict !== 'ok') return page(400, 'This link is not valid.');
	const email = (params.get('e') ?? '').trim().toLowerCase();
	try {
		const response = await fetch(`${RESEND_API}/audiences/${env.RESEND_AUDIENCE_ID}/contacts/${encodeURIComponent(email)}`, {
			method: 'PATCH',
			headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ unsubscribed: false }),
		});
		if (!response.ok) {
			console.error('[Resend resubscribe failed]', response.status);
			return page(502, 'That did not go through. Try the link again in a minute.');
		}
	} catch (error) {
		console.error('[Resend resubscribe error]', String(error));
		return page(502, 'That did not go through. Try the link again in a minute.');
	}
	let phone = '';
	try {
		phone = String(JSON.parse((await env.EMAIL_SUBS.get(email)) ?? '{}').phone ?? '');
	} catch {}
	await sendWelcome(env, email, phone, true);
	return new Response(null, { status: 302, headers: { Location: 'https://miamicontactimprov.com/?resubscribed=1' } });
}

function welcomeBody(code: string): string {
	return `Thanks for signing up.

Your code is ${code}. It takes 10% off one event, a class or a jam. It works once and is good for 60 days. Enter it at checkout.

Fridays 7:00 to 9:00 PM at Inner Motion in Hallandale Beach. No partner and no experience needed, just clothes you can roll in.

Dates, the venue and what we cover: ${CI_SERIES_LINK}

After this we send an occasional discount, about once a month, 20% off. Reply if you want off the list.

Max`;
}

// Lowercase, drop a +tag, and for Gmail drop dots, so one person with several aliases
// of the same mailbox gets one code.
export function normalizeEmail(email: string): string {
	const lowered = email.trim().toLowerCase();
	const at = lowered.lastIndexOf('@');
	if (at < 1) return lowered;
	let local = lowered.slice(0, at).split('+')[0];
	let domain = lowered.slice(at + 1);
	if (domain === 'gmail.com' || domain === 'googlemail.com') {
		local = local.replace(/\./g, '');
		domain = 'gmail.com';
	}
	return `${local}@${domain}`;
}

// Welcome state lives under the normalized address, apart from the subscriber record,
// so aliases share it. It decides whether to send, not the signup source: a failed
// Stripe or Resend call leaves welcome_sent_at empty and the next signup retries.
interface WelcomeState {
	attempt?: number;
	pending_code?: string;
	promo_code?: string;
	welcome_sent_at?: number;
	sms_sent_at?: number;
}

const WELCOME_PREFIX = 'ci10:';

async function readWelcomeState(env: Env, key: string): Promise<WelcomeState> {
	try {
		return JSON.parse((await env.EMAIL_SUBS.get(key)) ?? '{}') as WelcomeState;
	} catch {
		return {};
	}
}

// One 10% code per normalized email, ever. `resend` is a resubscriber: they get the
// same code again, but only while Stripe says it is unused and unexpired. Email and SMS
// are independent: one failing never blocks the other, and each retries on a later
// signup until it has gone out once.
async function sendWelcome(env: Env, email: string, phone: string, resend: boolean): Promise<void> {
	if (!env.CI_ONE_EVENT_COUPON_ID || !env.STRIPE_SECRET_KEY) {
		console.error('[Welcome skipped] CI_ONE_EVENT_COUPON_ID or STRIPE_SECRET_KEY is not set');
		return;
	}
	const normalized = normalizeEmail(email);
	const hash = await sha256Hex(normalized);
	const stateKey = `${WELCOME_PREFIX}${hash}`;
	const state = await readWelcomeState(env, stateKey);
	const wantSms = Boolean(phone) && (resend || !state.sms_sent_at);
	const wantEmail = resend || !state.welcome_sent_at;
	if (!wantEmail && !wantSms) return;

	if (!state.promo_code) {
		// The code and attempt are saved before Stripe is called (the one write that
		// cannot wait for the end), so a retry after a lost response replays the same
		// idempotent request instead of minting a second code.
		const attempt = state.attempt ?? 1;
		const code = state.pending_code ?? `CI10-${randomCodeSuffix()}`;
		try {
			await env.EMAIL_SUBS.put(stateKey, JSON.stringify({ ...state, attempt, pending_code: code }));
		} catch (error) {
			console.error('[Welcome skipped] could not save state', String(error));
			return;
		}
		const result = await createSingleUseCode(env.STRIPE_SECRET_KEY, env.CI_ONE_EVENT_COUPON_ID, {
			code,
			idempotencyKey: `ci10-${hash}-${attempt}`,
			nowSeconds: Math.floor(Date.now() / 1000),
		});
		if (!result.ok) {
			if (result.definite) {
				// Re-read first: a concurrent signup may have finished minting, and its
				// code must not be wiped by moving to a new attempt.
				try {
					const fresh = await readWelcomeState(env, stateKey);
					if (!fresh.promo_code) {
						await env.EMAIL_SUBS.put(stateKey, JSON.stringify({ ...fresh, attempt: attempt + 1, pending_code: undefined }));
					}
				} catch (error) {
					console.error('[Welcome state update failed]', String(error));
				}
			}
			console.error('[Welcome skipped] could not create a promotion code');
			return;
		}
		state.promo_code = result.code;
		delete state.pending_code;
		state.attempt = attempt;
	} else if (resend) {
		const status = await promoCodeStatus(env.STRIPE_SECRET_KEY, state.promo_code, Math.floor(Date.now() / 1000));
		if (status !== 'usable') {
			console.log('[Resubscribe] existing code is used, expired or unverifiable; nothing re-sent');
			return;
		}
	}
	const code = state.promo_code as string;

	if (wantEmail) {
		try {
			const response = await resendPost(env, '/emails', {
				from: CI_FROM,
				to: [email],
				subject: CI_SUBJECT,
				text: welcomeBody(code),
			});
			const payload = (await response.json().catch(() => null)) as { id?: string } | null;
			if (response.ok) {
				state.welcome_sent_at = Date.now();
				console.log('[Welcome email sent]', payload?.id ?? 'no id');
			} else {
				console.error('[Welcome email failed]', response.status, JSON.stringify(payload));
			}
		} catch (error) {
			console.error('[Welcome email error]', String(error));
		}
	}
	if (wantSms && (await sendSms(env as TwilioEnv, phone, code))) {
		state.sms_sent_at = Date.now();
	}
	// The single final write for this person's state.
	try {
		await env.EMAIL_SUBS.put(stateKey, JSON.stringify(state));
	} catch (error) {
		console.error('[Welcome state write failed]', String(error));
	}
}

// A signup carries where it came from: the offer that was on screen, the campaign and
// referrer that brought the reader in, the page they were reading. Each one is text
// that arrived over the wire, so each is trimmed, cut to a length a KV record can
// carry, and dropped when it is empty rather than stored as a blank key. Anything not
// named below is ignored: the record is built from this list, not from the request.
const MAX_TEXT = 200;
const MAX_TAG = 80;

function text(value: unknown, max: number): string {
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function attribution(body: SubscriptionRequest): Record<string, string> {
	const fields: Array<[string, string]> = [
		['offer', text(body.offer, MAX_TEXT)],
		['campaign', text(body.campaign, MAX_TAG)],
		['landing_page', text(body.landing_page, MAX_TEXT)],
		['referrer', text(body.referrer, MAX_TEXT)],
		['utm_source', text(body.utm_source, MAX_TAG)],
		['utm_medium', text(body.utm_medium, MAX_TAG)],
		['utm_content', text(body.utm_content, MAX_TAG)],
	];
	const kept: Record<string, string> = {};
	for (const [key, value] of fields) {
		if (value) kept[key] = value;
	}
	return kept;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// CORS headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		};

		// Handle CORS preflight
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		// POST /api/subscribe - Email subscription endpoint
		if (url.pathname === '/api/subscribe' && request.method === 'POST') {
			// 10 requests per IP per 60 seconds. A limiter outage must not block signups.
			if (env.SUBSCRIBE_LIMITER) {
				try {
					const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
					const { success } = await env.SUBSCRIBE_LIMITER.limit({ key: ip });
					if (!success) {
						return Response.json(
							{ ok: false, error: 'Too many requests. Try again in a minute.' } as SubscriptionResponse,
							{ status: 429, headers: { ...corsHeaders, 'Retry-After': '60' } },
						);
					}
				} catch (error) {
					console.error('[Rate limit error]', String(error));
				}
			}
			try {
				const body = await request.json() as SubscriptionRequest;
				const email = body.email?.trim().toLowerCase();
				const consent = Boolean(body.consent);
				const source = (body.source || 'unknown').slice(0, 64);
				const phone = text(body.phone, 32);

				// Honeypot: a real submission never fills this field. Answer as if it
				// worked, so a bot filling it learns nothing, and never touch KV or
				// Resend for it.
				if (text(body.company, MAX_TAG)) {
					return Response.json(
						{ ok: true } as SubscriptionResponse,
						{ status: 200, headers: corsHeaders }
					);
				}

				// Validation
				if (!email || !isValidEmail(email)) {
					return Response.json(
						{ ok: false, error: 'Invalid email' } as SubscriptionResponse,
						{ status: 400, headers: corsHeaders }
					);
				}

				if (!consent) {
					return Response.json(
						{ ok: false, error: 'Consent required' } as SubscriptionResponse,
						{ status: 400, headers: corsHeaders }
					);
				}

				if (!isValidPhone(phone)) {
					return Response.json(
						{ ok: false, error: 'Invalid phone' } as SubscriptionResponse,
						{ status: 400, headers: corsHeaders }
					);
				}

				const previousRecord = await env.EMAIL_SUBS.get(email);
				let kvUnsubscribed = false;
				try {
					kvUnsubscribed = Boolean(JSON.parse(previousRecord ?? '{}').unsubscribed);
				} catch {}

				// Store in KV. The attribution fields are sanitised once and used for
				// both the record and the log line. Phone is stored only when given:
				// consent covers texting a number the reader actually left, and an empty
				// key is not evidence anyone agreed to anything.
				const extras = attribution(body);
				await env.EMAIL_SUBS.put(email, JSON.stringify({
					email,
					consent,
					source,
					...(phone ? { phone } : {}),
					...extras,
					ts: Date.now(),
				}));

				console.log('[Subscription saved]', { email, source, offer: extras.offer });

				// sendWelcome decides from the stored welcome state whether this person
				// already has their code, so only the source gates it here.
				const wantsWelcome = source.startsWith(CI_SOURCE_PREFIX);

				if (env.RESEND_API_KEY && env.RESEND_AUDIENCE_ID) {
					ctx.waitUntil((async () => {
						const contact = await upsertResendContact(env, email, kvUnsubscribed);
						if (!wantsWelcome || contact === 'failed') return;
						if (contact === 'unsubscribed') {
							await sendConfirmation(env, email, url.origin);
						} else {
							await sendWelcome(env, email, phone, false);
						}
					})());
				} else {
					console.error('[Resend sync skipped] RESEND_API_KEY or RESEND_AUDIENCE_ID is not set');
				}

				return Response.json(
					{ ok: true } as SubscriptionResponse,
					{ status: 200, headers: corsHeaders }
				);
			} catch (error) {
				console.error('[Subscription error]', error);
				return Response.json(
					{ ok: false, error: 'Subscription failed' } as SubscriptionResponse,
					{ status: 500, headers: corsHeaders }
				);
			}
		}

		// GET /api/ci/resubscribe - signed link from the confirmation email
		if (url.pathname === '/api/ci/resubscribe' && request.method === 'GET') {
			return handleResubscribe(request, env);
		}

		// POST /api/events - Server-side conversion events for the Meta ad test.
		// The browser never talks to Meta and the site sets no cookies, so the only
		// identifier here is an address the caller already holds. Every route into
		// this endpoint is a script Max runs, which is why it wants the admin token.
		if (url.pathname === '/api/events' && request.method === 'POST') {
			if (!isAdmin(request, env)) {
				return Response.json(
					{ ok: false, error: 'Unauthorized' } as EventsResponse,
					{ status: 401, headers: corsHeaders }
				);
			}

			let body: EventsRequest;
			try {
				body = await request.json() as EventsRequest;
			} catch {
				return Response.json(
					{ ok: false, error: 'Invalid JSON' } as EventsResponse,
					{ status: 400, headers: corsHeaders }
				);
			}

			const event = (body.event ?? '').trim();
			if (!META_EVENTS.includes(event as MetaEventName)) {
				return Response.json(
					{ ok: false, error: `Unknown event, expected one of ${META_EVENTS.join(', ')}` } as EventsResponse,
					{ status: 400, headers: corsHeaders }
				);
			}

			const email = (body.email ?? '').trim().toLowerCase();
			if (!isValidEmail(email)) {
				return Response.json(
					{ ok: false, error: 'Invalid email' } as EventsResponse,
					{ status: 400, headers: corsHeaders }
				);
			}

			// Both the match key and the default event id are the hash, so no route
			// through this endpoint puts a readable address in a log or in a request
			// that leaves the Worker. An explicit event_id wins, because a caller
			// replaying a batch wants Meta to fold the retry into the event it
			// already has instead of counting one person twice.
			const emailHash = await sha256Hex(email);
			const eventId = text(body.event_id, MAX_TAG) || `${event}:${emailHash.slice(0, 32)}`;
			const value = Number.parseFloat(String(body.value ?? ''));

			// No secrets yet: say so in the log and answer 202 with forwarded false.
			// The endpoint has to be exercisable before the ad account exists, and a
			// caller whose flow must not stop because of Meta deserves a status that
			// does not read as failure.
			if (!env.META_PIXEL_ID || !env.META_CAPI_TOKEN) {
				console.log('[Meta CAPI skipped]', { event, eventId, reason: 'META_PIXEL_ID or META_CAPI_TOKEN is not set' });
				return Response.json(
					{ ok: true, event, forwarded: false } as EventsResponse,
					{ status: 202, headers: corsHeaders }
				);
			}

			const forwarded = await forwardToMeta(env, event as MetaEventName, {
				emailHash,
				eventId,
				value,
				currency: text(body.currency, 3).toUpperCase() || undefined,
				sourceUrl: text(body.event_source_url, MAX_TEXT) || undefined,
				ip: text(body.client_ip_address, 45) || undefined,
				agent: text(body.client_user_agent, MAX_TEXT) || undefined,
			});

			// 202 either way: Meta refusing one event is not the caller's failure, and
			// the log line above names the reason.
			return Response.json(
				{ ok: true, event, forwarded } as EventsResponse,
				{ status: 202, headers: corsHeaders }
			);
		}

		// POST /api/checkout - Stripe Checkout Session for a drop-in ticket (class/jam/combo)
		if (url.pathname === '/api/checkout' && request.method === 'POST') {
			return handleCheckout(request, env, corsHeaders);
		}

		// GET /api/list - List all subscriptions (admin endpoint)
		if (url.pathname === '/api/list' && request.method === 'GET') {
			if (!isAdmin(request, env)) {
				return Response.json(
					{ ok: false, error: 'Unauthorized' },
					{ status: 401, headers: corsHeaders }
				);
			}
			const list = await env.EMAIL_SUBS.list();
			const keys = list.keys.map((k) => k.name).filter((k) => !k.startsWith(WELCOME_PREFIX));
			return Response.json({ keys, count: keys.length }, { headers: corsHeaders });
		}

		// GET /api/get/:email - Get specific subscription (admin endpoint)
		if (url.pathname.startsWith('/api/get/') && request.method === 'GET') {
			if (!isAdmin(request, env)) {
				return Response.json(
					{ ok: false, error: 'Unauthorized' },
					{ status: 401, headers: corsHeaders }
				);
			}
			const email = decodeURIComponent(url.pathname.split('/').pop() ?? '');
			if (!email) {
				return Response.json(
					{ error: 'Invalid email' },
					{ status: 400, headers: corsHeaders }
				);
			}
			const value = await env.EMAIL_SUBS.get(email);
			return Response.json(
				value ? { email, data: JSON.parse(value) } : { error: 'Not found' },
				{ status: value ? 200 : 404, headers: corsHeaders }
			);
		}

		// 404 for unknown routes
		return Response.json(
			{ ok: false, error: 'Not Found' },
			{ status: 404, headers: corsHeaders }
		);
	},
} satisfies ExportedHandler<Env>;
