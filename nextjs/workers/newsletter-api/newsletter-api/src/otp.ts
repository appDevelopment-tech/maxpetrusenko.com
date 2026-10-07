/**
 * One-time codes for the signup flow. Only a keyed hash of an email code is stored,
 * with a 10 minute TTL, 5 tries, then a 15 minute lock. Sends (the first one and every
 * resend) are spaced 30 seconds apart and capped at 4 an hour per contact, which is
 * the first send plus 3 resends.
 */

import { sha256Hex } from './common';

export const OTP_TTL_SECONDS = 600;
export const MAX_ATTEMPTS = 5;
export const LOCK_SECONDS = 900;
export const RESEND_GAP_MS = 30_000;
export const MAX_SENDS_PER_HOUR = 4;

interface Store {
	get(key: string): Promise<string | null>;
	put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
	delete(key: string): Promise<void>;
}

// Six digits from crypto, rejection sampled so every code is equally likely.
export function generateCode(): string {
	let n = 1_000_000;
	const limit = 4_294_967_296 - (4_294_967_296 % 1_000_000);
	while (n >= 1_000_000) {
		const v = crypto.getRandomValues(new Uint32Array(1))[0];
		if (v < limit) n = v % 1_000_000;
	}
	return String(n).padStart(6, '0');
}

export async function hashOtp(secret: string, email: string, code: string): Promise<string> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${email.trim().toLowerCase()}\n${code}`));
	return Array.from(new Uint8Array(mac)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function constantTimeEqual(a: string, b: string): boolean {
	const x = new TextEncoder().encode(a);
	const y = new TextEncoder().encode(b);
	let diff = x.length ^ y.length;
	for (let i = 0; i < y.length; i++) diff |= (x[i] ?? 0) ^ y[i];
	return diff === 0;
}

export interface Pending {
	email: string;
	channel: 'sms' | 'email';
	phone: string; // E.164 for the sms channel, otherwise ''
	name: string;
	source: string;
	consent: boolean;
	extras: Record<string, string>;
	rawPhone: string;
	codeHash?: string; // email channel only; Twilio owns the sms code
	attempts: number;
	expiresAt: number; // epoch ms
}

export const keyFor = async (prefix: string, email: string) => `${prefix}:${await sha256Hex(email.trim().toLowerCase())}`;

export async function readPending(kv: Store, email: string): Promise<Pending | null> {
	try {
		const raw = await kv.get(await keyFor('otp', email));
		if (!raw) return null;
		const rec = JSON.parse(raw) as Pending;
		return rec.expiresAt > Date.now() ? rec : null;
	} catch {
		return null;
	}
}

export async function writePending(kv: Store, rec: Pending): Promise<void> {
	const ttl = Math.max(60, Math.ceil((rec.expiresAt - Date.now()) / 1000));
	await kv.put(await keyFor('otp', rec.email), JSON.stringify(rec), { expirationTtl: ttl });
}

export async function deletePending(kv: Store, email: string): Promise<void> {
	await kv.delete(await keyFor('otp', email));
}

export async function isLocked(kv: Store, email: string): Promise<boolean> {
	return Boolean(await kv.get(await keyFor('lock', email)));
}

export async function lock(kv: Store, email: string): Promise<void> {
	await kv.put(await keyFor('lock', email), String(Date.now()), { expirationTtl: LOCK_SECONDS });
	await deletePending(kv, email);
}

export type Budget = { ok: true } | { ok: false; retryAfter: number };

// Spends one send from the contact's hourly budget, or says how long to wait.
export async function spendSend(kv: Store, email: string, now = Date.now()): Promise<Budget> {
	const key = await keyFor('rs', email);
	let sends: number[] = [];
	try {
		sends = (JSON.parse((await kv.get(key)) ?? '[]') as number[]).filter((t) => now - t < 3_600_000);
	} catch {}
	const last = sends[sends.length - 1];
	if (last !== undefined && now - last < RESEND_GAP_MS) {
		return { ok: false, retryAfter: Math.ceil((RESEND_GAP_MS - (now - last)) / 1000) };
	}
	if (sends.length >= MAX_SENDS_PER_HOUR) {
		return { ok: false, retryAfter: Math.ceil((sends[0] + 3_600_000 - now) / 1000) };
	}
	sends.push(now);
	await kv.put(key, JSON.stringify(sends), { expirationTtl: 3600 });
	return { ok: true };
}

// Per phone number, so one number cannot be used to flood a stranger with Verify texts
// whatever emails it is paired with: 3 an hour and 6 a day. The key hashes the E.164
// number, so it never collides with the per-email `rs:` keys.
export async function spendPhoneSend(kv: Store, e164: string, now = Date.now()): Promise<Budget> {
	const key = `rs:${await sha256Hex(e164)}`;
	let sends: number[] = [];
	try {
		sends = (JSON.parse((await kv.get(key)) ?? '[]') as number[]).filter((t) => now - t < 86_400_000);
	} catch {}
	const lastHour = sends.filter((t) => now - t < 3_600_000);
	if (lastHour.length >= 3) return { ok: false, retryAfter: Math.ceil((lastHour[0] + 3_600_000 - now) / 1000) };
	if (sends.length >= 6) return { ok: false, retryAfter: Math.ceil((sends[0] + 86_400_000 - now) / 1000) };
	sends.push(now);
	await kv.put(key, JSON.stringify(sends), { expirationTtl: 86_400 });
	return { ok: true };
}
