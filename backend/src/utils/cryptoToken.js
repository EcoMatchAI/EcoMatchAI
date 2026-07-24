import crypto from 'crypto';

/**
 * Generate a cryptographically secure random token (the RAW value that goes
 * into an email link). 32 bytes -> 64 hex chars.
 */
export const generateRawToken = () => crypto.randomBytes(32).toString('hex');

/**
 * Hash a raw token with SHA-256. Only the hash is ever stored in the DB, so a
 * leaked database can't be used to forge verification links.
 * @param {string} rawToken
 * @returns {string} hex sha256 hash
 */
export const hashToken = (rawToken) =>
  crypto.createHash('sha256').update(rawToken).digest('hex');
