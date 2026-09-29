#!/usr/bin/env node
/**
 * One-off backfill: copy the emails already in the KV subscription store into
 * the Resend audience. Upserts, so re-running it is harmless.
 *
 * Usage (from this directory):
 *   ADMIN_TOKEN=... RESEND_API_KEY=... node scripts/backfill-resend-audience.mjs
 *
 * Neither value is read from a file, printed, or written anywhere.
 */
import { readFileSync } from 'node:fs';

const WORKER = process.env.NEWSLETTER_API_URL ?? 'https://newsletter-api.max-petrusenko.workers.dev';

function configAudienceId() {
	const raw = readFileSync(new URL('../wrangler.jsonc', import.meta.url), 'utf8');
	const json = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
	return JSON.parse(json).vars.RESEND_AUDIENCE_ID;
}

const audience = process.env.RESEND_AUDIENCE_ID ?? configAudienceId();
const adminToken = process.env.ADMIN_TOKEN;
const resendKey = process.env.RESEND_API_KEY;

if (!adminToken || !resendKey) {
	console.error('ADMIN_TOKEN and RESEND_API_KEY must both be set');
	process.exit(2);
}

const listResponse = await fetch(`${WORKER}/api/list`, {
	headers: { Authorization: `Bearer ${adminToken}` },
});
if (listResponse.status !== 200) {
	console.error(`GET ${WORKER}/api/list returned ${listResponse.status}`);
	process.exit(1);
}

const { keys } = await listResponse.json();
const failed = [];
let added = 0;

for (const email of keys) {
	const response = await fetch(`https://api.resend.com/audiences/${audience}/contacts`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${resendKey}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ email, unsubscribed: false }),
	});
	if (response.ok) {
		added++;
	} else {
		failed.push({ email, status: response.status });
	}
}

console.log(JSON.stringify({ inStore: keys.length, synced: added, failed }, null, 2));
process.exit(failed.length ? 1 : 0);
