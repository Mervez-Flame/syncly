const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
// Derives a key of exactly 32 bytes from environment secret
const KEY = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'fallback_secret_key', 'salt', 32);

function encrypt(text) {
    const iv = crypto.randomBytes(16); // Initialization Vector for randomness
    const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(text) {
    const [ivHex, encryptedText] = text.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}

module.exports = { encrypt, decrypt };