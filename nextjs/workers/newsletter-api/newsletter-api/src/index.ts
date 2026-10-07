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
import { addContact, lookupContact, resendCode, startSignup, verifyCode } from './ci';
import {
	CI_SOURCE_PREFIX, INTERNAL_KEY_PREFIXES, MAX_TAG, MAX_TEXT, attribution, cleanName, isValidEmail, isValidPhone, normalizeEmail, sha256Hex, splitName, text,
	type SubscriptionRequest,
} from './common';
export { cleanName, normalizeEmail, splitName };

interface SubscriptionResponse {
	ok: boolean;
	error?: string;
	step?: string;
	channel?: string;
}

interface KVNamespace {
	get(key: string): Promise<string | null>;
	put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
	delete(key: string): Promise<void>;
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
	// Twilio credentials, used only for Twilio Verify one-time codes.
	TWILIO_ACCOUNT_SID?: string;
	TWILIO_AUTH_TOKEN?: string;
	// Twilio Verify service (VA...) that sends and checks the text one-time code.
	TWILIO_VERIFY_SID?: string;
	// Keys the hash of an emailed one-time code (HMAC-SHA256); never leaves the Worker.
	CI_CONFIRM_SECRET?: string;
	// Cloudflare rate limit binding (wrangler.jsonc `ratelimits`): 10 per IP per 60s.
	SUBSCRIBE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
	// Second binding for /api/verify, keyed on sha256(normalized email): 5 per 60s.
	VERIFY_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}


// Subscribers from the Contact Improv Miami site join the same list as everyone
// else, but they get a welcome email carrying the series discount code.

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

		// POST /api/subscribe: Miami CI sources go through verify-first signup (see ci.ts);
		// every other site keeps the plain subscribe. POST /api/verify and /api/resend-code
		// are the other two steps of that flow.
		const ciRoutes = ['/api/subscribe', '/api/verify', '/api/resend-code'];
		if (ciRoutes.includes(url.pathname) && request.method === 'POST') {
			// 10 requests per IP per 60 seconds across all three. A limiter outage must
			// not block signups.
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
				if (url.pathname === '/api/verify') {
					const body = (await request.json()) as { email?: unknown; code?: unknown };
					// A second limit per address, on top of the per-IP one, so a botnet
					// cannot spread guesses at one mailbox across many IPs.
					if (env.VERIFY_LIMITER && typeof body.email === 'string') {
						try {
							const key = await sha256Hex(normalizeEmail(body.email));
							const { success } = await env.VERIFY_LIMITER.limit({ key });
							if (!success) {
								return Response.json(
									{ ok: false, error: 'Too many requests. Try again in a minute.' } as SubscriptionResponse,
									{ status: 429, headers: { ...corsHeaders, 'Retry-After': '60' } },
								);
							}
						} catch (error) {
							console.error('[Verify rate limit error]', String(error));
						}
					}
					return await verifyCode(env, corsHeaders, body);
				}
				if (url.pathname === '/api/resend-code') {
					return await resendCode(env, corsHeaders, ((await request.json()) as { email?: unknown }).email);
				}
				const body = await request.json() as SubscriptionRequest;
				const email = body.email?.trim().toLowerCase();
				const consent = Boolean(body.consent);
				const source = (body.source || 'unknown').slice(0, 64);
				const phone = text(body.phone, 32);
				const name = cleanName(body.name);

				// Honeypot: a real submission never fills this field. Answer as if it
				// worked and never touch KV or Resend for it.
				if (text(body.company, MAX_TAG)) {
					return Response.json({ ok: true } as SubscriptionResponse, { status: 200, headers: corsHeaders });
				}
				if (!email || !isValidEmail(email)) {
					return Response.json({ ok: false, error: 'Invalid email' } as SubscriptionResponse, { status: 400, headers: corsHeaders });
				}
				if (!consent) {
					return Response.json({ ok: false, error: 'Consent required' } as SubscriptionResponse, { status: 400, headers: corsHeaders });
				}
				if (!isValidPhone(phone)) {
					return Response.json({ ok: false, error: 'Invalid phone' } as SubscriptionResponse, { status: 400, headers: corsHeaders });
				}

				if (source.startsWith(CI_SOURCE_PREFIX)) {
					return await startSignup(env, corsHeaders, { email, consent, source, rawPhone: phone, name, body });
				}

				// Plain subscribe for the other sites: store, mirror into Resend, no code.
				const extras = attribution(body);
				await env.EMAIL_SUBS.put(email, JSON.stringify({
					email, consent, source,
					...(phone ? { phone } : {}),
					...(name ? { name } : {}),
					...extras,
					ts: Date.now(),
				}));
				console.log('[Subscription saved]', { email, source, offer: extras.offer });
				if (env.RESEND_API_KEY && env.RESEND_AUDIENCE_ID) {
					ctx.waitUntil(addContact(env, email, name, false).then(() => undefined));
				} else {
					console.error('[Resend sync skipped] RESEND_API_KEY or RESEND_AUDIENCE_ID is not set');
				}
				return Response.json({ ok: true } as SubscriptionResponse, { status: 200, headers: corsHeaders });
			} catch (error) {
				console.error('[Subscription error]', error);
				return Response.json(
					{ ok: false, error: 'Subscription failed' } as SubscriptionResponse,
					{ status: 500, headers: corsHeaders }
				);
			}
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
			const keys = list.keys.map((k) => k.name).filter((k) => !INTERNAL_KEY_PREFIXES.some((p) => k.startsWith(p)));
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
