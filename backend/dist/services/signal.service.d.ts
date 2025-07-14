export interface SignalIdentity {
    identityKey: string;
    registrationId: number;
    deviceId: number;
}
export interface PreKeyBundleResponse {
    identityKey: string;
    deviceId: number;
    preKeyId: number;
    preKey: string;
    signedPreKeyId: number;
    signedPreKey: string;
    signedPreKeySignature: string;
    registrationId: number;
}
export interface GenerateKeysRequest {
    userId: string;
    deviceId?: number;
    preKeyCount?: number;
}
export interface SessionInfo {
    userId: string;
    deviceId: number;
    sessionData: string;
    createdAt: Date;
    lastUsed: Date;
}
export declare class SignalService {
    private static readonly DEFAULT_DEVICE_ID;
    private static readonly DEFAULT_PREKEY_COUNT;
    private static readonly MAX_PREKEY_COUNT;
    private static readonly PREKEY_REFILL_THRESHOLD;
    static initializeUser(userId: string, deviceId?: number): Promise<SignalIdentity>;
    static generatePreKeys(userId: string, deviceId?: number, count?: number): Promise<void>;
    static getPreKeyBundle(userId: string, deviceId?: number): Promise<PreKeyBundleResponse>;
    static storeSession(localUserId: string, remoteUserId: string, deviceId: number, sessionData: string): Promise<void>;
    static loadSession(localUserId: string, remoteUserId: string, deviceId: number): Promise<string | null>;
    static storeSenderKey(groupId: string, senderId: string, deviceId: number, senderKeyData: string): Promise<void>;
    static loadSenderKey(groupId: string, senderId: string, deviceId: number): Promise<string | null>;
    static deleteSession(localUserId: string, remoteUserId: string, deviceId: number): Promise<void>;
    static getUserSessions(userId: string): Promise<SessionInfo[]>;
    static rotateSignedPreKey(userId: string, deviceId?: number): Promise<void>;
    static cleanupOldData(): Promise<void>;
    private static encryptPrivateKey;
    private static decryptPrivateKey;
}
//# sourceMappingURL=signal.service.d.ts.map