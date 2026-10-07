/** Ticket links: our own short domain path, no third-party shortener. */

const SITE = 'https://miamicontactimprov.com';

// CI10-K7P2QX or CI10K7P2QX, any case, becomes CI10-K7P2QX. Anything else is null.
export function normalizeTicketCode(raw: unknown): string | null {
	if (typeof raw !== 'string') return null;
	const m = /^CI(\d{2})-?([A-Z0-9]{6})$/i.exec(raw.trim());
	return m ? `CI${m[1]}-${m[2].toUpperCase()}` : null;
}

// https://miamicontactimprov.com/t/CI10K7P2QX: the dash is dropped to keep it short
// (a text or an email button). The site redirects it to the page that applies the code.
export function shortTicketLink(code: string): string {
	return `${SITE}/t/${code.replace('-', '')}`;
}
