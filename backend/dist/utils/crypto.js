"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateOtp = generateOtp;
exports.generateRegistrationId = generateRegistrationId;
exports.generateKeyId = generateKeyId;
exports.generateSessionId = generateSessionId;
exports.generateApiKey = generateApiKey;
exports.hashData = hashData;
exports.verifyHash = verifyHash;
exports.encryptData = encryptData;
exports.decryptData = decryptData;
exports.generateFileKey = generateFileKey;
exports.encryptFile = encryptFile;
exports.decryptFile = decryptFile;
exports.generateHmac = generateHmac;
exports.verifyHmac = verifyHmac;
exports.generateSecureToken = generateSecureToken;
exports.generateUuid = generateUuid;
exports.timingSafeEqual = timingSafeEqual;
exports.generateDeviceFingerprint = generateDeviceFingerprint;
exports.deriveKey = deriveKey;
exports.generateEntropy = generateEntropy;
const crypto_1 = __importDefault(require("crypto"));
function generateOtp(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = crypto_1.default.randomInt(0, digits.length);
        otp += digits[randomIndex];
    }
    return otp;
}
function generateRegistrationId() {
    return crypto_1.default.randomInt(1, 16380);
}
function generateKeyId() {
    return crypto_1.default.randomInt(1, 2147483647);
}
function generateSessionId() {
    return crypto_1.default.randomBytes(32).toString('hex');
}
function generateApiKey() {
    return crypto_1.default.randomBytes(32).toString('base64url');
}
function hashData(data, salt) {
    const actualSalt = salt || crypto_1.default.randomBytes(16).toString('hex');
    const hash = crypto_1.default.pbkdf2Sync(data, actualSalt, 10000, 64, 'sha512');
    return `${actualSalt}:${hash.toString('hex')}`;
}
function verifyHash(data, hashedData) {
    try {
        const [salt, hash] = hashedData.split(':');
        if (!salt || !hash)
            return false;
        const verifyHash = crypto_1.default.pbkdf2Sync(data, salt, 10000, 64, 'sha512');
        return hash === verifyHash.toString('hex');
    }
    catch {
        return false;
    }
}
function encryptData(data, key) {
    const encryptionKey = key || crypto_1.default.randomBytes(32);
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipher('aes-256-gcm', encryptionKey);
    cipher.setAAD(Buffer.from('taar-app'));
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag();
    return {
        encrypted,
        key: encryptionKey.toString('hex'),
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
    };
}
function decryptData(encrypted, key, iv, tag) {
    const keyBuffer = Buffer.from(key, 'hex');
    const ivBuffer = Buffer.from(iv, 'hex');
    const tagBuffer = Buffer.from(tag, 'hex');
    const decipher = crypto_1.default.createDecipher('aes-256-gcm', keyBuffer);
    decipher.setAAD(Buffer.from('taar-app'));
    decipher.setAuthTag(tagBuffer);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
}
function generateFileKey() {
    return crypto_1.default.randomBytes(32);
}
function encryptFile(fileData, key) {
    const encryptionKey = key || generateFileKey();
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipher('aes-256-cbc', encryptionKey);
    const encrypted = Buffer.concat([
        cipher.update(fileData),
        cipher.final()
    ]);
    return {
        encrypted,
        key: encryptionKey,
        iv
    };
}
function decryptFile(encryptedData, key, iv) {
    const decipher = crypto_1.default.createDecipher('aes-256-cbc', key);
    return Buffer.concat([
        decipher.update(encryptedData),
        decipher.final()
    ]);
}
function generateHmac(data, secret) {
    return crypto_1.default.createHmac('sha256', secret).update(data).digest('hex');
}
function verifyHmac(data, signature, secret) {
    const expectedSignature = generateHmac(data, secret);
    return crypto_1.default.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
}
function generateSecureToken(length = 32) {
    return crypto_1.default.randomBytes(length).toString('base64url');
}
function generateUuid() {
    return crypto_1.default.randomUUID();
}
function timingSafeEqual(a, b) {
    if (a.length !== b.length) {
        return false;
    }
    return crypto_1.default.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
function generateDeviceFingerprint(userAgent, ip) {
    const data = `${userAgent}:${ip}:${Date.now()}`;
    return crypto_1.default.createHash('sha256').update(data).digest('hex');
}
function deriveKey(password, salt, iterations = 10000) {
    return crypto_1.default.pbkdf2Sync(password, salt, iterations, 32, 'sha256');
}
function generateEntropy(bytes = 32) {
    return crypto_1.default.randomBytes(bytes);
}
//# sourceMappingURL=crypto.js.map