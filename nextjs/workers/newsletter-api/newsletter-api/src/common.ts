/** Shared helpers for the subscribe, verify and resend flows. */

import type { Env } from './index';

export const RESEND_API = 'https://api.resend.com';
export const CI_SOURCE_PREFIX = 'miamicontactimprov';
export const CI_FROM = 'Miami CI <hello@miamicontactimprov.com>';
// KV keys that hold flow state, not subscribers; hidden from /api/list.
export const INTERNAL_KEY_PREFIXES = ['ci10:', 'otp:', 'lock:', 'rs:', 'ph:'];
export const MAX_TEXT = 200;
export const MAX_TAG = 80;

export interface SubscriptionRequest {
	email: string;
	consent: boolean;
	source?: string;
	phone?: string;
	name?: string;
	company?: string;
	offer?: string;
	campaign?: string;
	landing_page?: string;
	referrer?: string;
	utm_source?: string;
	utm_medium?: string;
	utm_content?: string;
}

export function isValidEmail(email: string): boolean {
	return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim().toLowerCase());
}

// Phone is optional, so an empty string is valid. When given it only has to look like
// a phone number: 7 to 15 digits once formatting is stripped.
export function isValidPhone(phone: string): boolean {
	if (!phone) return true;
	const digits = phone.replace(/[^0-9]/g, '');
	return digits.length >= 7 && digits.length <= 15;
}

export async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Lowercase, drop a +tag, and for Gmail drop dots, so aliases of one mailbox are one person.
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

// A person's name from the form: control characters out, whitespace collapsed, 80 chars.
export function cleanName(value: unknown): string {
	if (typeof value !== 'string') return '';
	return value.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

// Split on the first space: "Ana Maria Lopez" is first "Ana", last "Maria Lopez".
export function splitName(name: string): { first: string; last: string } {
	const i = name.indexOf(' ');
	return i === -1 ? { first: name, last: '' } : { first: name.slice(0, i), last: name.slice(i + 1).trim() };
}

export function text(value: unknown, max: number): string {
	return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

// Acquisition fields: trimmed, length-capped, dropped when empty. The record is built
// from this list, not from the request.
export function attribution(body: SubscriptionRequest): Record<string, string> {
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
	for (const [key, value] of fields) if (value) kept[key] = value;
	return kept;
}

export async function resendPost(env: Env, path: string, body: unknown): Promise<Response> {
	return fetch(`${RESEND_API}${path}`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}
