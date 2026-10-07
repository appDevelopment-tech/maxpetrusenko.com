/**
 * Twilio SMS over REST with `fetch`, same convention as the Resend and Stripe calls.
 * Never logs the code or the full phone number.
 */

const TWILIO_API = 'https://api.twilio.com/2010-04-01';

// US and Canada only (NANP, +1 and ten digits, area code and exchange not starting
// with 0 or 1). Anything else returns null: no text, the email still goes. International
// numbers are refused on purpose so the form cannot be used to pump SMS to premium or
// foreign routes.
export function toE164(raw: string): string | null {
	const trimmed = raw.trim();
	const digits = trimmed.replace(/[^0-9]/g, '');
	let national: string;
	if (trimmed.startsWith('+')) {
		if (!digits.startsWith('1') || digits.length !== 11) return null;
		national = digits.slice(1);
	} else if (digits.length === 10) {
		national = digits;
	} else if (digits.length === 11 && digits.startsWith('1')) {
		national = digits.slice(1);
	} else {
		return null;
	}
	return /^[2-9][0-9]{2}[2-9][0-9]{6}$/.test(national) ? `+1${national}` : null;
}

export function smsBody(code: string): string {
	return `Miami CI: your 10% code is ${code}, one event, valid 60 days. Book at miamicontactimprov.com. Reply STOP to opt out.`;
}

function mask(phone: string): string {
	return `***${phone.slice(-2)}`;
}

export interface TwilioEnv {
	TWILIO_ACCOUNT_SID?: string;
	TWILIO_AUTH_TOKEN?: string;
	// A phone number (+1...) or a Messaging Service SID (MG...).
	TWILIO_FROM?: string;
	EMAIL_SUBS: { get(key: string): Promise<string | null>; put(key: string, value: string): Promise<void> };
}

async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
	return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// At most one text per phone number, ever: `sms:<sha256(e164)>` is written after a
// successful send and checked before every one.
export async function sendSms(env: TwilioEnv, rawPhone: string, code: string): Promise<boolean> {
	if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM) {
		console.error('[SMS skipped] TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN or TWILIO_FROM is not set');
		return false;
	}
	const to = toE164(rawPhone);
	if (!to) {
		console.error('[SMS skipped] phone is not a US or Canada number');
		return false;
	}
	const key = `sms:${await sha256Hex(to)}`;
	try {
		if (await env.EMAIL_SUBS.get(key)) {
			console.log('[SMS skipped] this number already got a text', mask(to));
			return false;
		}
	} catch (error) {
		console.error('[SMS skipped] could not check the per-number record', String(error));
		return false;
	}
	const params = new URLSearchParams({ To: to, Body: smsBody(code) });
	// A Messaging Service SID starts with MG; anything else is a sending number.
	params.set(env.TWILIO_FROM.startsWith('MG') ? 'MessagingServiceSid' : 'From', env.TWILIO_FROM);
	try {
		const response = await fetch(`${TWILIO_API}/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: params.toString(),
		});
		if (!response.ok) {
			const payload = (await response.json().catch(() => null)) as { code?: number } | null;
			console.error('[SMS failed]', mask(to), response.status, payload?.code ?? '');
			return false;
		}
		console.log('[SMS sent]', mask(to));
		try {
			await env.EMAIL_SUBS.put(key, String(Date.now()));
		} catch (error) {
			console.error('[SMS record failed]', String(error));
		}
		return true;
	} catch (error) {
		console.error('[SMS error]', mask(to), String(error));
		return false;
	}
}
