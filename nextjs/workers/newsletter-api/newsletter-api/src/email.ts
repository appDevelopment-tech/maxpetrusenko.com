/**
 * The code emails (welcome and monthly): one simple layout, HTML plus a plain text part.
 * The code sits on its own line, big and alone; below it a button whose link pre-applies it.
 */

import { shortTicketLink } from './links';

const FONT = "'Helvetica Neue', Helvetica, Arial, sans-serif";
const DISPLAY = "Impact, 'Arial Narrow Bold', 'Arial Narrow', Arial, sans-serif";

function esc(value: string): string {
	return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface CodeEmail {
	greeting: string; // "Hi Ana, thanks for signing up." or "Thanks for signing up."
	intro: string; // the sentence above the code
	code: string;
	terms: string; // under the button: use, validity
	details: string; // the venue line
	footer: string; // closing line, opt-out wording
	buttonLabel: string;
	unsubscribeUrl?: string;
}

export function codeEmailText(e: CodeEmail): string {
	return `${e.greeting}

${e.intro}

${e.code}

${e.buttonLabel}:
${shortTicketLink(e.code)}

${e.terms}

${e.details}

${e.footer}${e.unsubscribeUrl ? `\n\nUnsubscribe: ${e.unsubscribeUrl}` : ''}

Max`;
}

export function codeEmailHtml(e: CodeEmail): string {
	const link = shortTicketLink(e.code);
	const unsub = e.unsubscribeUrl ? ` <a href="${esc(e.unsubscribeUrl)}" style="color:#8A7B5E">Unsubscribe</a>` : '';
	return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(e.intro)}</title></head>
<body style="margin:0;padding:0;background:#F3EDE1">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F3EDE1"><tr><td align="center" style="padding:28px 14px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#FFFFFF;border-radius:14px">
<tr><td style="padding:30px 28px 8px;font-family:${FONT};color:#171512;font-size:16px;line-height:1.5">
<p style="margin:0 0 6px;font-family:${DISPLAY};font-size:15px;letter-spacing:2px;text-transform:uppercase;color:#8A7B5E">Miami CI</p>
<p style="margin:0 0 18px">${esc(e.greeting)}</p>
<p style="margin:0">${esc(e.intro)}</p>
</td></tr>
<tr><td align="center" style="padding:14px 28px">
<div style="font-family:${DISPLAY};font-size:44px;line-height:1.1;letter-spacing:3px;color:#171512;background:#F3EDE1;border:2px dashed #C1734A;border-radius:12px;padding:18px 10px">${esc(e.code)}</div>
</td></tr>
<tr><td align="center" style="padding:6px 28px 8px">
<a href="${esc(link)}" style="display:inline-block;background:#171512;color:#F3EDE1;font-family:${FONT};font-size:16px;font-weight:bold;text-decoration:none;padding:15px 26px;border-radius:999px">${esc(e.buttonLabel)}</a>
</td></tr>
<tr><td style="padding:16px 28px 28px;font-family:${FONT};color:#4A463D;font-size:14px;line-height:1.5">
<p style="margin:0 0 12px">${esc(e.terms)}</p>
<p style="margin:0 0 12px">${esc(e.details)}</p>
<p style="margin:0 0 12px;color:#8A7B5E">${esc(e.footer)}${unsub}</p>
<p style="margin:0">Max</p>
</td></tr>
</table></td></tr></table></body></html>`;
}
