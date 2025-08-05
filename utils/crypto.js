const crypto = require('crypto');
const ENCRYPTION_KEY = crypto.scryptSync('Stu@7890', 'salt', 32); // Must be 32 bytes
const IV = Buffer.alloc(16, 0); // Initialization vector

function encrypt(text) {
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let encrypted = cipher.update(text.toString(), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decrypt(text) {
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, IV);
  let decrypted = decipher.update(text.toString(), 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

function hashLicenseKey(key) {
  return crypto.createHash('sha256').update(key).digest('hex');
}



module.exports = { encrypt, decrypt, hashLicenseKey };
