import { MessageType, MessageStatus } from '@prisma/client';
export interface SendMessageRequest {
    senderId: string;
    recipientId?: string;
    groupId?: string;
    encryptedContent: string;
    messageType: MessageType;
    replyToId?: string;
    mediaFileId?: string;
}
export interface MessageResponse {
    id: string;
    senderId: string;
    recipientId?: string;
    groupId?: string;
    encryptedContent: string;
    messageType: MessageType;
    status: MessageStatus;
    sentAt: Date;
    deliveredAt?: Date;
    status: MessageStatus;
    replyToId?: string;
    mediaFileId?: string;
    isDeleted: boolean;
}
export interface ChatInfo {
    id: string;
    type: 'direct' | 'group';
    name?: string;
    avatarUrl?: string;
    participantCount?: number;
    lastMessage?: {
        id: string;
        content: string;
        type: MessageType;
        sentAt: Date;
        senderName?: string;
    };
    unreadCount: number;
    isOnline?: boolean;
    lastSeen?: Date;
}
export declare class MessageService {
    static sendMessage(messageData: SendMessageRequest): Promise<MessageResponse>;
}
//# sourceMappingURL=message.service.broken.d.ts.map