/**
 * Miami CI signup: verify first, code after.
 *
 *   POST /api/subscribe   step 1: validates, sends a one-time code, replies {step:"verify"}
 *   POST /api/verify      step 2: checks the code, subscribes, mints the 10% code
 *   POST /api/resend-code        a fresh code, throttled
 *
 * The promo code is minted only after a successful verification, once per normalized
 * email. A code sent to an email proves the address and counts as consent to be back
 * on the list. A code sent by text (Twilio Verify) proves a phone, not the mailbox, so
 * it never reverses an opt-out: step 1 sends anyone whose contact is unsubscribed a
 * code by email instead.
 */

import type { Env } from './index';
import { CI_FROM, RESEND_API, attribution, normalizeEmail, resendPost, sha256Hex, splitName, type SubscriptionRequest } from './common';
import {
	LOCK_SECONDS, MAX_ATTEMPTS, OTP_TTL_SECONDS, constantTimeEqual, deletePending, generateCode, hashOtp,
	isLocked, lock, readPending, spendPhoneSend, spendSend, writePending, type Pending,
} from './otp';
import { checkVerification, startVerification, toE164, verifyConfigured } from './sms';
import { createSingleUseCode, promoCodeStatus, randomCodeSuffix } from './stripe';
import { codeEmailHtml, codeEmailText, type CodeEmail } from './email';

const CI_SUBJECT = 'Your 10% off one event';
const WELCOME_PREFIX = 'ci10:';

type Json = Record<string, unknown>;
const reply = (cors: Record<string, string>, body: Json, status = 200, extra: Record<string, string> = {}) =>
	Response.json(body, { status, headers: { ...cors, ...extra } });

// ---------------------------------------------------------------- Resend contact

type ContactResult = 'created' | 'existing' | 'unsubscribed' | 'failed';

// Audience-scoped endpoints on purpose: Resend lists Audiences as deprecated in favour
// of Segments but its docs do not show how a new contact joins a segment.
export async function lookupContact(env: Env, email: string): Promise<'missing' | 'subscribed' | 'unsubscribed' | 'failed'> {
	try {
		const response = await fetch(`${RESEND_API}/audiences/${env.RESEND_AUDIENCE_ID}/contacts/${encodeURIComponent(email)}`, {
			headers: { Authorization: `Bearer ${env.RESEND_API_KEY}` },
		});
		if (response.status === 404) return 'missing';
		if (!response.ok) {
			console.error('[Resend lookup failed]', response.status);
			return 'failed';
		}
		const contact = (await response.json().catch(() => null)) as { unsubscribed?: boolean } | null;
		return contact?.unsubscribed ? 'unsubscribed' : 'subscribed';
	} catch (error) {
		console.error('[Resend lookup error]', String(error));
		return 'failed';
	}
}

// Called only after a verification. `emailVerified` is what lets an opt-out be reversed.
export async function addContact(env: Env, email: string, name: string, emailVerified: boolean): Promise<ContactResult> {
	const state = await lookupContact(env, email);
	if (state === 'failed') return 'failed';
	try {
		if (state === 'subscribed') return 'existing';
		if (state === 'unsubscribed') {
			if (!emailVerified) return 'unsubscribed';
			const response = await fetch(`${RESEND_API}/audiences/${env.RESEND_AUDIENCE_ID}/contacts/${encodeURIComponent(email)}`, {
				method: 'PATCH',
				headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
				body: JSON.stringify({ unsubscribed: false }),
			});
			if (!response.ok) {
				console.error('[Resend resubscribe failed]', response.status);
				return 'failed';
			}
			return 'existing';
		}
		const { first, last } = splitName(name);
		const response = await resendPost(env, `/audiences/${env.RESEND_AUDIENCE_ID}/contacts`, {
			email,
			unsubscribed: false,
			...(first ? { first_name: first, ...(last ? { last_name: last } : {}) } : {}),
		});
		if (!response.ok) {
			console.error('[Resend contact failed]', response.status);
			return 'failed';
		}
		return 'created';
	} catch (error) {
		console.error('[Resend contact error]', String(error));
		return 'failed';
	}
}

// ---------------------------------------------------------------- promo code

interface WelcomeState {
	attempt?: number;
	pending_code?: string;
	promo_code?: string;
	welcome_sent_at?: number;
	// Who the code was minted for: 'email' (a verified mailbox) or sha256 of the verified
	// phone. A phone verify only ever sees the code if its phone matches.
	mint_via?: string;
}

async function readState(env: Env, key: string): Promise<WelcomeState> {
	try {
		return JSON.parse((await env.EMAIL_SUBS.get(key)) ?? '{}') as WelcomeState;
	} catch {
		return {};
	}
}

type CodeResult = { status: 'ok'; code: string; state: WelcomeState; stateKey: string; existing: boolean } | { status: 'used' } | { status: 'error' };

// One code per normalized email, ever. An existing code is returned only while Stripe
// says it is unused and unexpired; otherwise the person has used their code.
export async function ensureCode(env: Env, email: string): Promise<CodeResult> {
	if (!env.CI_ONE_EVENT_COUPON_ID || !env.STRIPE_SECRET_KEY) {
		console.error('[Code skipped] CI_ONE_EVENT_COUPON_ID or STRIPE_SECRET_KEY is not set');
		return { status: 'error' };
	}
	const hash = await sha256Hex(normalizeEmail(email));
	const stateKey = `${WELCOME_PREFIX}${hash}`;
	const state = await readState(env, stateKey);
	const now = Math.floor(Date.now() / 1000);

	if (state.promo_code) {
		const status = await promoCodeStatus(env.STRIPE_SECRET_KEY, state.promo_code, now);
		return status === 'usable' ? { status: 'ok', code: state.promo_code, state, stateKey, existing: true } : { status: 'used' };
	}
	// Saved before Stripe is called, so a retry after a lost response replays the same
	// idempotent request instead of minting a second code.
	const attempt = state.attempt ?? 1;
	const code = state.pending_code ?? `CI10-${randomCodeSuffix()}`;
	try {
		await env.EMAIL_SUBS.put(stateKey, JSON.stringify({ ...state, attempt, pending_code: code }));
	} catch (error) {
		console.error('[Code skipped] could not save state', String(error));
		return { status: 'error' };
	}
	const result = await createSingleUseCode(env.STRIPE_SECRET_KEY, env.CI_ONE_EVENT_COUPON_ID, {
		code,
		idempotencyKey: `ci10-${hash}-${attempt}`,
		nowSeconds: now,
	});
	if (!result.ok) {
		if (result.definite) {
			try {
				const fresh = await readState(env, stateKey);
				if (!fresh.promo_code) {
					await env.EMAIL_SUBS.put(stateKey, JSON.stringify({ ...fresh, attempt: attempt + 1, pending_code: undefined }));
				}
			} catch (error) {
				console.error('[Code state update failed]', String(error));
			}
		}
		return { status: 'error' };
	}
	const next: WelcomeState = { ...state, promo_code: result.code, attempt };
	delete next.pending_code;
	return { status: 'ok', code: result.code, state: next, stateKey, existing: false };
}

function welcomeEmail(code: string, firstName = ''): CodeEmail {
	return {
		greeting: firstName ? `Hi ${firstName}, thanks for signing up.` : 'Thanks for signing up.',
		intro: 'Your code for 10% off one event, a class or a jam:',
		code,
		buttonLabel: 'Buy your ticket, 10% off applied',
		terms: 'The button applies the code for you. It works once and is good for 60 days.',
		details: 'Fridays 7:00 to 9:00 PM at Inner Motion in Hallandale Beach. No partner and no experience needed, just clothes you can roll in.',
		footer: 'After this we send an occasional discount, about once a month, 20% off. Reply if you want off the list.',
	};
}

export function otpBody(code: string): string {
	return `Your Miami CI code is ${code}.

It works for 10 minutes. If you did not ask for it, ignore this email and nothing happens.

Max`;
}

// ---------------------------------------------------------------- step 1

export async function startSignup(env: Env, cors: Record<string, string>, p: {
	email: string; consent: boolean; source: string; rawPhone: string; name: string; body: SubscriptionRequest;
}): Promise<Response> {
	if (!env.CI_CONFIRM_SECRET || !env.RESEND_API_KEY || !env.RESEND_AUDIENCE_ID) {
		console.error('[Signup unavailable] CI_CONFIRM_SECRET, RESEND_API_KEY or RESEND_AUDIENCE_ID is not set');
		return reply(cors, { ok: false, error: 'Signup is not available right now.' }, 503);
	}
	if (await isLocked(env.EMAIL_SUBS, p.email)) {
		return reply(cors, { ok: false, error: 'Too many tries. Try again in 15 minutes.', retry_after: LOCK_SECONDS }, 429, { 'Retry-After': String(LOCK_SECONDS) });
	}
	const budget = await spendSend(env.EMAIL_SUBS, p.email);
	if (!budget.ok) {
		return reply(cors, { ok: false, error: 'Please wait a moment before asking for another code.', retry_after: budget.retryAfter }, 429, { 'Retry-After': String(budget.retryAfter) });
	}

	// A phone code is only for people whose mailbox is not opted out (see top of file).
	const e164 = p.rawPhone ? toE164(p.rawPhone) : null;
	let channel: 'sms' | 'email' = 'email';
	// An opted-out address, a phone over its own send budget (3 an hour, 6 a day), or a
	// Twilio failure all fall back to the emailed code; the reply reports the channel that
	// actually sent.
	if (e164 && verifyConfigured(env) && (await lookupContact(env, p.email)) !== 'unsubscribed') {
		if ((await spendPhoneSend(env.EMAIL_SUBS, e164)).ok && (await startVerification(env, e164))) channel = 'sms';
	}

	const record: Pending = {
		email: p.email,
		channel,
		phone: channel === 'sms' ? (e164 as string) : '',
		rawPhone: p.rawPhone,
		name: p.name,
		source: p.source,
		consent: p.consent,
		extras: attribution(p.body),
		attempts: 0,
		expiresAt: Date.now() + OTP_TTL_SECONDS * 1000,
	};
	if (channel === 'email') {
		const code = generateCode();
		record.codeHash = await hashOtp(env.CI_CONFIRM_SECRET, p.email, code);
		const sent = await sendOtpEmail(env, p.email, code);
		if (!sent) return reply(cors, { ok: false, error: 'That did not go through. Try again.' }, 502);
	}
	await writePending(env.EMAIL_SUBS, record);
	return reply(cors, { ok: true, step: 'verify', channel });
}

async function sendOtpEmail(env: Env, email: string, code: string): Promise<boolean> {
	try {
		const response = await resendPost(env, '/emails', { from: CI_FROM, to: [email], subject: `Your Miami CI code: ${code}`, text: otpBody(code) });
		if (!response.ok) console.error('[OTP email failed]', response.status);
		return response.ok;
	} catch (error) {
		console.error('[OTP email error]', String(error));
		return false;
	}
}

// ---------------------------------------------------------------- resend

export async function resendCode(env: Env, cors: Record<string, string>, emailRaw: unknown): Promise<Response> {
	const email = typeof emailRaw === 'string' ? emailRaw.trim().toLowerCase() : '';
	if (!email || !env.CI_CONFIRM_SECRET) return reply(cors, { ok: false, error: 'Invalid email' }, 400);
	if (await isLocked(env.EMAIL_SUBS, email)) {
		return reply(cors, { ok: false, error: 'Too many tries. Try again in 15 minutes.', retry_after: LOCK_SECONDS }, 429, { 'Retry-After': String(LOCK_SECONDS) });
	}
	const pending = await readPending(env.EMAIL_SUBS, email);
	if (!pending) return reply(cors, { ok: false, error: 'That code expired. Start again.', expired: true }, 400);
	const budget = await spendSend(env.EMAIL_SUBS, email);
	if (!budget.ok) {
		return reply(cors, { ok: false, error: 'Please wait a moment before asking for another code.', retry_after: budget.retryAfter }, 429, { 'Retry-After': String(budget.retryAfter) });
	}
	if (pending.channel === 'sms') {
		const phoneBudget = await spendPhoneSend(env.EMAIL_SUBS, pending.phone);
		if (!phoneBudget.ok) {
			return reply(cors, { ok: false, error: 'Please wait a while before asking for another text.', retry_after: phoneBudget.retryAfter }, 429, { 'Retry-After': String(phoneBudget.retryAfter) });
		}
		if (!(await startVerification(env, pending.phone))) return reply(cors, { ok: false, error: 'That did not go through. Try again.' }, 502);
	} else {
		const code = generateCode();
		pending.codeHash = await hashOtp(env.CI_CONFIRM_SECRET, email, code);
		if (!(await sendOtpEmail(env, email, code))) return reply(cors, { ok: false, error: 'That did not go through. Try again.' }, 502);
	}
	pending.expiresAt = Date.now() + OTP_TTL_SECONDS * 1000;
	await writePending(env.EMAIL_SUBS, pending);
	return reply(cors, { ok: true, step: 'verify', channel: pending.channel });
}

// ---------------------------------------------------------------- step 2

export async function verifyCode(env: Env, cors: Record<string, string>, body: { email?: unknown; code?: unknown }): Promise<Response> {
	const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
	const submitted = typeof body.code === 'string' ? body.code.replace(/\s+/g, '') : '';
	if (!email || !/^[0-9]{6}$/.test(submitted) || !env.CI_CONFIRM_SECRET) {
		return reply(cors, { ok: false, error: 'Enter the 6 digit code.' }, 400);
	}
	if (await isLocked(env.EMAIL_SUBS, email)) {
		return reply(cors, { ok: false, error: 'Too many tries. Try again in 15 minutes.', retry_after: LOCK_SECONDS }, 429, { 'Retry-After': String(LOCK_SECONDS) });
	}
	const pending = await readPending(env.EMAIL_SUBS, email);
	if (!pending) return reply(cors, { ok: false, error: 'That code expired. Start again.', expired: true }, 400);

	let good = false;
	if (pending.channel === 'sms') {
		const result = await checkVerification(env, pending.phone, submitted);
		if (result === 'error') return reply(cors, { ok: false, error: 'That did not go through. Try again.' }, 502);
		good = result === 'approved';
	} else {
		good = constantTimeEqual(await hashOtp(env.CI_CONFIRM_SECRET, email, submitted), pending.codeHash ?? '');
	}
	if (!good) {
		pending.attempts += 1;
		if (pending.attempts >= MAX_ATTEMPTS) {
			await lock(env.EMAIL_SUBS, email);
			return reply(cors, { ok: false, error: 'Too many tries. Try again in 15 minutes.', retry_after: LOCK_SECONDS }, 429, { 'Retry-After': String(LOCK_SECONDS) });
		}
		await writePending(env.EMAIL_SUBS, pending);
		return reply(cors, { ok: false, error: 'That code is not right.', attempts_left: MAX_ATTEMPTS - pending.attempts }, 400);
	}
	await deletePending(env.EMAIL_SUBS, email);
	return finishSignup(env, cors, pending);
}

async function finishSignup(env: Env, cors: Record<string, string>, p: Pending): Promise<Response> {
	const emailHash = await sha256Hex(normalizeEmail(p.email));
	const bySms = p.channel === 'sms';
	const phoneHash = bySms ? await sha256Hex(p.phone) : '';
	const phoneKey = bySms ? `ph:${phoneHash}` : '';
	const used = () => reply(cors, { ok: true, code: null, used: true, emailed: false });

	let previous: { email_verified?: boolean; verified?: string } = {};
	try {
		previous = JSON.parse((await env.EMAIL_SUBS.get(p.email)) ?? '{}');
	} catch {}
	const emailVerified = p.channel === 'email' || Boolean(previous.email_verified) || previous.verified === 'email';

	// One code per phone, checked before anything is created: a phone that already
	// belongs to a different email proves nothing about this one.
	const owner = bySms ? await env.EMAIL_SUBS.get(phoneKey) : null;
	const phoneOk = !bySms || !owner || owner === emailHash;

	// Subscriber record is stored either way, once, after verification.
	try {
		await env.EMAIL_SUBS.put(p.email, JSON.stringify({
			email: p.email, consent: p.consent, source: p.source, verified: p.channel, email_verified: emailVerified,
			...(p.rawPhone ? { phone: p.rawPhone } : {}), ...(p.name ? { name: p.name } : {}), ...p.extras, ts: Date.now(),
		}));
	} catch (error) {
		console.error('[Subscriber write failed]', String(error));
	}
	if (!phoneOk) return used();

	// Past the owner check, this phone is the first (or the owning) phone for this email,
	// which is what lets a phone verify add the Resend contact when no emailed code ever
	// proved the mailbox. `emailVerified` below is what lets an opt-out be reversed.
	const contact = await addContact(env, p.email, p.name, p.channel === 'email');

	const result = await ensureCode(env, p.email);
	if (result.status === 'used') return used();
	if (result.status === 'error') return reply(cors, { ok: false, error: 'We could not make your code. Try again.' }, 502);

	const { code, state, stateKey } = result;
	// A text code never reveals a code that was minted for another phone or by email.
	if (bySms && result.existing && state.mint_via !== phoneHash) return used();
	if (!result.existing) state.mint_via = bySms ? phoneHash : 'email';

	// An address that did not verify a code and is opted out gets nothing by email.
	const mayEmail = contact !== 'unsubscribed';
	if (mayEmail && !state.welcome_sent_at) {
		try {
			const response = await resendPost(env, '/emails', { from: CI_FROM, to: [p.email], subject: CI_SUBJECT, text: codeEmailText(welcomeEmail(code, splitName(p.name).first)), html: codeEmailHtml(welcomeEmail(code, splitName(p.name).first)) });
			if (response.ok) state.welcome_sent_at = Date.now();
			else console.error('[Welcome email failed]', response.status);
		} catch (error) {
			console.error('[Welcome email error]', String(error));
		}
	}
	try {
		await env.EMAIL_SUBS.put(stateKey, JSON.stringify(state));
		if (phoneKey) await env.EMAIL_SUBS.put(phoneKey, emailHash);
	} catch (error) {
		console.error('[Code state write failed]', String(error));
	}
	return reply(cors, { ok: true, code, emailed: Boolean(state.welcome_sent_at) });
}
