/**
 * CORS and rate limiting for the public /api/* routes.
 *
 * CORS: the checkout routes answer only the Contact Improv Miami site. The
 * subscribe route also answers maxpetrusenko.com, whose footer forms post to it.
 * EXTRA_ORIGINS (comma separated) adds origins for local dev or a preview host.
 * A request from any other origin gets no Access-Control-Allow-Origin header,
 * so the browser blocks it. CORS is a browser rule, not an auth layer: the rate
 * limit below is what slows a script down.
 */

import type { Env } from './index';

export const SITE_ORIGINS = ['https://miamicontactimprov.com', 'https://www.miamicontactimprov.com'];
export const SUBSCRIBE_ORIGINS = [...SITE_ORIGINS, 'https://maxpetrusenko.com', 'https://www.maxpetrusenko.com'];

export function originsFor(pathname: string, env: Env): string[] {
	const base = pathname === '/api/subscribe' ? SUBSCRIBE_ORIGINS : SITE_ORIGINS;
	const extra = (env.EXTRA_ORIGINS ?? '')
		.split(',')
		.map((o) => o.trim())
		.filter(Boolean);
	return [...base, ...extra];
}

export function corsHeaders(request: Request, allowed: string[]): Record<string, string> {
	const headers: Record<string, string> = {
		'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		Vary: 'Origin',
	};
	const origin = request.headers.get('Origin');
	if (origin && allowed.includes(origin)) headers['Access-Control-Allow-Origin'] = origin;
	return headers;
}

// Cloudflare's rate limiting binding (wrangler.jsonc "ratelimits": 10 requests
// per 60 s per key). Keyed on the client IP Cloudflare puts in
// CF-Connecting-IP. No binding (older config) or no IP header (tests, local
// curl without one) means no limit rather than one shared bucket for everyone.
export interface RateLimiter {
	limit(options: { key: string }): Promise<{ success: boolean }>;
}

export async function isRateLimited(request: Request, env: Env): Promise<boolean> {
	if (!env.API_LIMITER) return false;
	const ip = request.headers.get('CF-Connecting-IP');
	if (!ip) return false;
	const { success } = await env.API_LIMITER.limit({ key: ip });
	return !success;
}
