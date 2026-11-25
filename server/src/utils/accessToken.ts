import { randomBytes } from 'crypto';

/** A long random token (48 bytes = 384 bits, 64 URL-safe characters) used in a gate's QR link. */
export function generateAccessToken(): string {
  return randomBytes(48).toString('base64url');
}

/** The public web link a gate's QR code points at. */
export function accessUrl(token: string): string {
  const base = (process.env.PUBLIC_WEB_URL || 'https://mcsagate.runeworkz.com').replace(/\/$/, '');
  return `${base}/access/${token}`;
}

/** The token plus the two links a gate needs: one QR code for entering (/in) and one for leaving (/out). */
export function accessLinks(token: string) {
  const url = accessUrl(token);
  return { accessToken: token, url, inUrl: `${url}/in`, outUrl: `${url}/out` };
}
