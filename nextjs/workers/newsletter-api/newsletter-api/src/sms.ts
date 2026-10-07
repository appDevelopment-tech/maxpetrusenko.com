/**
 * Twilio Verify for the one-time code sent by text. Verify sends from Twilio's own
 * registered senders and owns the code, so the Worker never sees or stores it. SMS is
 * used for nothing else. Never logs a full phone number.
 */

const VERIFY_API = 'https://verify.twilio.com/v2/Services';

// US and Canada only (NANP, +1 and ten digits, area code and exchange not starting
// with 0 or 1). Anything else returns null and the code goes by email instead.
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

export interface VerifyEnv {
	TWILIO_ACCOUNT_SID?: string;
	TWILIO_AUTH_TOKEN?: string;
	TWILIO_VERIFY_SID?: string;
}

export function verifyConfigured(env: VerifyEnv): boolean {
	return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_VERIFY_SID);
}

const mask = (phone: string) => `***${phone.slice(-2)}`;

async function post(env: VerifyEnv, path: string, params: Record<string, string>): Promise<Response> {
	return fetch(`${VERIFY_API}/${env.TWILIO_VERIFY_SID}/${path}`, {
		method: 'POST',
		headers: {
			Authorization: `Basic ${btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)}`,
			'Content-Type': 'application/x-www-form-urlencoded',
		},
		body: new URLSearchParams(params).toString(),
	});
}

export async function startVerification(env: VerifyEnv, to: string): Promise<boolean> {
	try {
		const response = await post(env, 'Verifications', { To: to, Channel: 'sms' });
		if (!response.ok) {
			const payload = (await response.json().catch(() => null)) as { code?: number } | null;
			console.error('[Verify start failed]', mask(to), response.status, payload?.code ?? '');
			return false;
		}
		return true;
	} catch (error) {
		console.error('[Verify start error]', mask(to), String(error));
		return false;
	}
}

// 'approved' | 'wrong' (Twilio answered and it did not match, or the code expired) |
// 'error' (could not ask: not the visitor's fault, so not counted as an attempt).
export async function checkVerification(env: VerifyEnv, to: string, code: string): Promise<'approved' | 'wrong' | 'error'> {
	try {
		const response = await post(env, 'VerificationCheck', { To: to, Code: code });
		if (response.status >= 500) return 'error';
		const payload = (await response.json().catch(() => null)) as { status?: string } | null;
		return response.ok && payload?.status === 'approved' ? 'approved' : 'wrong';
	} catch (error) {
		console.error('[Verify check error]', mask(to), String(error));
		return 'error';
	}
}
