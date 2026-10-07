/**
 * Twilio SMS over REST with `fetch`, same convention as the Resend and Stripe calls.
 * Never logs the code or the full phone number.
 */

const TWILIO_API = 'https://api.twilio.com/2010-04-01';

// E.164 with a US default: 10 digits get +1, 11 digits starting with 1 get +, an
// explicit leading + is kept. Anything else returns null and the text is skipped.
export function toE164(raw: string): string | null {
	const trimmed = raw.trim();
	const digits = trimmed.replace(/[^0-9]/g, '');
	if (trimmed.startsWith('+')) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
	if (digits.length === 10) return `+1${digits}`;
	if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
	return null;
}

export function smsBody(code: string): string {
	return `Contact Improv Miami: your 10% code is ${code}, one event, valid 60 days. Book at miamicontactimprov.com. Reply STOP to opt out.`;
}

function mask(phone: string): string {
	return `***${phone.slice(-2)}`;
}

export interface TwilioEnv {
	TWILIO_ACCOUNT_SID?: string;
	TWILIO_AUTH_TOKEN?: string;
	TWILIO_FROM?: string;
}

export async function sendSms(env: TwilioEnv, rawPhone: string, code: string): Promise<boolean> {
	if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_FROM) {
		console.error('[SMS skipped] TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN or TWILIO_FROM is not set');
		return false;
	}
	const to = toE164(rawPhone);
	if (!to) {
		console.error('[SMS skipped] phone is not a usable number');
		return false;
	}
	const body = new URLSearchParams({ To: to, From: env.TWILIO_FROM, Body: smsBody(code) });
	try {
		const response = await fetch(`${TWILIO_API}/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`, {
			method: 'POST',
			headers: {
				Authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`,
				'Content-Type': 'application/x-www-form-urlencoded',
			},
			body: body.toString(),
		});
		if (!response.ok) {
			const payload = (await response.json().catch(() => null)) as { code?: number; message?: string } | null;
			console.error('[SMS failed]', mask(to), response.status, payload?.code ?? '');
			return false;
		}
		console.log('[SMS sent]', mask(to));
		return true;
	} catch (error) {
		console.error('[SMS error]', mask(to), String(error));
		return false;
	}
}
