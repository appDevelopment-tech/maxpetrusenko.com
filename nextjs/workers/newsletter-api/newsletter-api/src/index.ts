/**
 * Newsletter Subscription API
 *
 * Stores subscribers in KV, mirrors them into the Resend audience, and sends a
 * welcome email to people who arrive from the Contact Improv Miami site.
 *
 * /api/list and /api/get/* read other people's email addresses, so they require
 * `Authorization: Bearer <ADMIN_TOKEN>`. /api/subscribe stays public.
 */

interface SubscriptionRequest {
	email: string;
	consent: boolean;
	source?: string;
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
	put(key: string, value: string): Promise<void>;
	list(): Promise<{ keys: Array<{ name: string }> }>;
}

interface ExecutionContext {
	waitUntil(promise: Promise<unknown>): void;
}

interface ExportedHandler<TEnv> {
	fetch(request: Request, env: TEnv, ctx: ExecutionContext): Promise<Response>;
}

interface Env {
	EMAIL_SUBS: KVNamespace;
	ADMIN_TOKEN?: string;
	RESEND_API_KEY?: string;
	RESEND_AUDIENCE_ID?: string;
	CI_NEWSLETTER_COUPON?: string;
}

const RESEND_API = 'https://api.resend.com';

// Subscribers from the Contact Improv Miami site join the same list as everyone
// else, but they get a welcome email carrying the series discount code.
const CI_SOURCE_PREFIX = 'miamicontactimprov';
const CI_FROM = 'Contact Improv Miami <hello@miamicontactimprov.com>';
const CI_SUBJECT = 'Your 10% code for the Fundamentals series';
const CI_SERIES_LINK = 'https://miamicontactimprov.com/fundamentals';

function isValidEmail(email: string): boolean {
	const trimmed = email.trim().toLowerCase();
	return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(trimmed);
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

async function upsertResendContact(env: Env, email: string): Promise<void> {
	const response = await resendPost(env, `/audiences/${env.RESEND_AUDIENCE_ID}/contacts`, {
		email,
		unsubscribed: false,
	});
	if (!response.ok) {
		console.error('[Resend contact failed]', response.status, await response.text());
	}
}

function welcomeBody(code: string): string {
	return `Thanks for signing up.

The Fundamentals series is eight Friday evenings at Inner Motion in Hallandale Beach, 7:00 to 9:00 PM, starting October 2. Come to one class or all eight. No partner and no experience needed, just clothes you can roll in.

Your 10% code is ${code}. Enter it at checkout on the booking page and the price drops.

Dates, the venue and what we cover: ${CI_SERIES_LINK}

If $20 is the reason you are not coming this week, reply to this and we will sort it out.

One email a month after this one. Reply if you want off the list.

Max`;
}

async function sendWelcome(env: Env, email: string): Promise<void> {
	const code = env.CI_NEWSLETTER_COUPON;
	if (!code) {
		console.error('[Welcome email skipped] CI_NEWSLETTER_COUPON is not set');
		return;
	}
	const response = await resendPost(env, '/emails', {
		from: CI_FROM,
		to: [email],
		subject: CI_SUBJECT,
		text: welcomeBody(code),
	});
	const payload = (await response.json().catch(() => null)) as { id?: string } | null;
	if (!response.ok) {
		console.error('[Welcome email failed]', response.status, JSON.stringify(payload));
		return;
	}
	console.log('[Welcome email sent]', payload?.id ?? 'no id');
}

function sourceOf(record: string | null): string {
	if (!record) return '';
	try {
		return String((JSON.parse(record) as { source?: string }).source ?? '');
	} catch {
		return '';
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
			try {
				const body = await request.json() as SubscriptionRequest;
				const email = body.email?.trim().toLowerCase();
				const consent = Boolean(body.consent);
				const source = (body.source || 'unknown').slice(0, 64);

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

				const previous = sourceOf(await env.EMAIL_SUBS.get(email));

				// Store in KV. The attribution fields are sanitised once and used for
				// both the record and the log line.
				const extras = attribution(body);
				await env.EMAIL_SUBS.put(email, JSON.stringify({
					email,
					consent,
					source,
					...extras,
					ts: Date.now(),
				}));

				console.log('[Subscription saved]', { email, source, offer: extras.offer });

				// One welcome per person, on their first contact-improv signup.
				const wantsWelcome = source.startsWith(CI_SOURCE_PREFIX)
					&& !previous.startsWith(CI_SOURCE_PREFIX);

				if (env.RESEND_API_KEY && env.RESEND_AUDIENCE_ID) {
					ctx.waitUntil((async () => {
						await upsertResendContact(env, email);
						if (wantsWelcome) {
							await sendWelcome(env, email);
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

		// GET /api/list - List all subscriptions (admin endpoint)
		if (url.pathname === '/api/list' && request.method === 'GET') {
			if (!isAdmin(request, env)) {
				return Response.json(
					{ ok: false, error: 'Unauthorized' },
					{ status: 401, headers: corsHeaders }
				);
			}
			const list = await env.EMAIL_SUBS.list();
			const keys = list.keys.map((k) => k.name);
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
