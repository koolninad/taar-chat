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
    static encryptGroupMessage(groupId: string, senderId: string, plaintext: string, deviceId?: number): Promise<GroupEncryptedMessage>;
    static decryptGroupMessage(recipientUserId: string, encryptedMessage: GroupEncryptedMessage): Promise<DecryptedMessage>;
    static verifyMessage(message: EncryptedMessage | GroupEncryptedMessage, metadata: MessageMetadata): Promise<boolean>;
    static generateFingerprint(localUserId: string, remoteUserId: string): Promise<string>;
}
//# sourceMappingURL=encryption.service.d.ts.map