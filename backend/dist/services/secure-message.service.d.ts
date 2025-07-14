import { MessageType, MessageStatus } from '@prisma/client';
export interface SecureMessageRequest {
    senderId: string;
    recipientId?: string;
    groupId?: string;
    plaintextContent: string;
    messageType: MessageType;
    replyToId?: string;
    mediaFileId?: string;
    deviceId?: number;
}
export interface SecureMessageResponse {
    id: string;
    senderId: string;
    recipientId?: string;
    groupId?: string;
    encryptedContent: string;
    messageType: MessageType;
    status: MessageStatus;
    sentAt: Date;
    signalMetadata: {
        cipherType: number;
        deviceId: number;
        senderKeyDistribution?: string;
    };
}
export interface DecryptMessageRequest {
    messageId: string;
    recipientUserId: string;
    deviceId?: number;
}
export interface DecryptedMessageResponse {
    messageId: string;
    senderId: string;
    plaintextContent: string;
    messageType: MessageType;
    sentAt: Date;
    isGroupMessage: boolean;
    metadata: {
        verified: boolean;
        deviceId: number;
        timestamp: Date;
    };
}
export declare class SecureMessageService {
    private static readonly DEFAULT_DEVICE_ID;
    static sendSecureMessage(messageData: SecureMessageRequest): Promise<SecureMessageResponse>;
    static decryptMessage(decryptRequest: DecryptMessageRequest): Promise<DecryptedMessageResponse>;
    static getEncryptedMessages(userId: string, chatId: string, page?: number, limit?: number): Promise<{
        messages: SecureMessageResponse[];
        hasMore: boolean;
        total: number;
    }>;
    static processKeyExchange(localUserId: string, remoteUserId: string, deviceId?: number): Promise<{
        success: boolean;
        sessionEstablished: boolean;
    }>;
    static verifyConversation(userId: string, chatId: string, lastKnownMessageId?: string): Promise<{
        verified: boolean;
        integrityIssues: string[];
    }>;
    static getSessionInfo(localUserId: string, remoteUserId: string, deviceId?: number): Promise<{
        hasSession: boolean;
        lastUsed?: Date;
        sessionData?: any;
    }>;
    private static ensureSignalInitialized;
    private static validateGroupMembership;
    private static storeSignalMetadata;
    private static getSignalMetadata;
    private static cacheMessageMetadata;
    private static getMessageMetadata;
}
//# sourceMappingURL=secure-message.service.d.ts.map