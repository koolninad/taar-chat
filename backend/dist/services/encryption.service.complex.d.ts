export interface EncryptedMessage {
    ciphertext: string;
    messageType: number;
    registrationId: number;
    deviceId: number;
}
export interface DecryptedMessage {
    plaintext: string;
    senderUserId: string;
    deviceId: number;
    timestamp: Date;
}
export interface GroupEncryptedMessage {
    ciphertext: string;
    senderKeyDistributionMessage?: string;
    groupId: string;
    senderId: string;
    deviceId: number;
}
export interface MessageMetadata {
    messageId: string;
    timestamp: Date;
    senderUserId: string;
    recipientUserId?: string;
    groupId?: string;
    messageType: 'direct' | 'group';
}
export declare class EncryptionService {
    private static readonly DEFAULT_DEVICE_ID;
    static encryptDirectMessage(senderUserId: string, recipientUserId: string, plaintext: string, deviceId?: number): Promise<EncryptedMessage>;
    static decryptDirectMessage(recipientUserId: string, senderUserId: string, encryptedMessage: EncryptedMessage): Promise<DecryptedMessage>;
    static encryptGroupMessage(senderId: string, groupId: string, plaintext: string, deviceId?: number): Promise<GroupEncryptedMessage>;
    static decryptGroupMessage(recipientUserId: string, encryptedMessage: GroupEncryptedMessage): Promise<DecryptedMessage>;
    private static buildSession;
    private static processSenderKeyDistributionMessage;
    private static createInMemoryStore;
    private static createSenderKeyStore;
    private static updateSessionAfterEncryption;
    private static updateSessionAfterDecryption;
    static verifyMessage(message: EncryptedMessage | GroupEncryptedMessage, metadata: MessageMetadata): Promise<boolean>;
    private static createStores;
    static generateFingerprint(localUserId: string, remoteUserId: string): Promise<string>;
}
//# sourceMappingURL=encryption.service.complex.d.ts.map