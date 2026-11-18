/**
 * QR codes for check-in tickets. The matrix comes from `uqr` (zero-dependency,
 * pure JS, runs in workerd); this file only turns it into the two formats we need:
 * an SVG string for the success page and a PNG for the confirmation email (Gmail
 * and Outlook do not render SVG or data: URIs in mail).
 */

import { encode, renderSVG } from 'uqr';

const QUIET_ZONE = 4; // modules of white border the QR spec requires
const PX_PER_MODULE = 8;

export function qrSvg(payload: string): string {
	return renderSVG(payload, { ecc: 'M', border: QUIET_ZONE });
}

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
	if (!crcTable) {
		crcTable = new Uint32Array(256);
		for (let n = 0; n < 256; n++) {
			let c = n;
			for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
			crcTable[n] = c >>> 0;
		}
	}
	let crc = 0xffffffff;
	for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
	return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
	const out = new Uint8Array(12 + data.length);
	const view = new DataView(out.buffer);
	view.setUint32(0, data.length);
	for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
	out.set(data, 8);
	view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
	return out;
}

async function zlib(raw: Uint8Array): Promise<Uint8Array> {
	const stream = new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate'));
	return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** A 1-bit grayscale PNG of the QR (black on white, quiet zone included). */
export async function qrPng(payload: string): Promise<Uint8Array> {
	const { data } = encode(payload, { ecc: 'M', border: QUIET_ZONE });
	const size = data.length * PX_PER_MODULE;
	const rowBytes = Math.ceil(size / 8);
	const raw = new Uint8Array((rowBytes + 1) * size); // each row starts with filter byte 0
	for (let y = 0; y < size; y++) {
		const row = data[Math.floor(y / PX_PER_MODULE)];
		const base = y * (rowBytes + 1) + 1;
		for (let x = 0; x < size; x++) {
			const dark = row[Math.floor(x / PX_PER_MODULE)];
			if (!dark) raw[base + (x >> 3)] |= 0x80 >> (x & 7); // 1 = white in 1-bit grayscale
		}
	}
	const header = new Uint8Array(13);
	const view = new DataView(header.buffer);
	view.setUint32(0, size);
	view.setUint32(4, size);
	header[8] = 1; // bit depth
	header[9] = 0; // grayscale
	const signature = Uint8Array.of(137, 80, 78, 71, 13, 10, 26, 10);
	const parts = [signature, chunk('IHDR', header), chunk('IDAT', await zlib(raw)), chunk('IEND', new Uint8Array(0))];
	const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
	let offset = 0;
	for (const part of parts) {
		png.set(part, offset);
		offset += part.length;
	}
	return png;
}

export function toBase64(bytes: Uint8Array): string {
	let binary = '';
	for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
	return btoa(binary);
}
