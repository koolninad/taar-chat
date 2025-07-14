export declare function generateOtp(length?: number): string;
export declare function generateRegistrationId(): number;
export declare function generateKeyId(): number;
export declare function generateSessionId(): string;
export declare function generateApiKey(): string;
export declare function hashData(data: string, salt?: string): string;
export declare function verifyHash(data: string, hashedData: string): boolean;
export declare function encryptData(data: string, key?: Buffer): {
    encrypted: string;
    key: string;
    iv: string;
    tag: string;
};
export declare function decryptData(encrypted: string, key: string, iv: string, tag: string): string;
export declare function generateFileKey(): Buffer;
export declare function encryptFile(fileData: Buffer, key?: Buffer): {
    encrypted: Buffer;
    key: Buffer;
    iv: Buffer;
};
export declare function decryptFile(encryptedData: Buffer, key: Buffer, iv: Buffer): Buffer;
export declare function generateHmac(data: string, secret: string): string;
export declare function verifyHmac(data: string, signature: string, secret: string): boolean;
export declare function generateSecureToken(length?: number): string;
export declare function generateUuid(): string;
export declare function timingSafeEqual(a: string, b: string): boolean;
export declare function generateDeviceFingerprint(userAgent: string, ip: string): string;
export declare function deriveKey(password: string, salt: string, iterations?: number): Buffer;
export declare function generateEntropy(bytes?: number): Buffer;
//# sourceMappingURL=crypto.d.ts.map