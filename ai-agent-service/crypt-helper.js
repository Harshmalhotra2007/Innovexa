const crypto = require('crypto');
const config = require('./config');

const ALGORITHM = 'aes-256-cbc';
// Use environment encryption key or fallback to a deterministic 32-byte key for local dev
const DEFAULT_KEY_HEX = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

function getEncryptionKey() {
  const keyEnv = config.encryptionSecretKey;
  if (keyEnv) {
    // Ensure key is 32 bytes (64 hex characters or hashed)
    return crypto.createHash('sha256').update(keyEnv).digest();
  }
  return Buffer.from(DEFAULT_KEY_HEX, 'hex');
}

/**
 * Encrypts sensitive text or transcript data using AES-256-CBC
 */
function encryptData(text) {
  const iv = crypto.randomBytes(16);
  const key = getEncryptionKey();
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(typeof text === 'string' ? text : JSON.stringify(text), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted
  };
}

/**
 * Decrypts AES-256-CBC encrypted data
 */
function decryptData(encryptedObj) {
  const key = getEncryptionKey();
  const iv = Buffer.from(encryptedObj.iv, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  let decrypted = decipher.update(encryptedObj.encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  try {
    return JSON.parse(decrypted);
  } catch (e) {
    return decrypted;
  }
}

module.exports = { encryptData, decryptData, getEncryptionKey };