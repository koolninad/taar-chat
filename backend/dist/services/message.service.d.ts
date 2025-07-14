import { MessageType, MessageStatus } from '@prisma/client';
export interface SendMessageRequest {
    senderId: string;
    recipientId?: string;
    groupId?: string;
    encryptedContent: Buffer;
    messageType: MessageType;
    replyToId?: string;
    mediaFileId?: string;
}
export interface MessageResponse {
    id: string;
    senderId: string;
    recipientId?: string;
    groupId?: string;
    content: string;
    messageType: MessageType;
    status: MessageStatus;
    sentAt: Date;
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
        content: Buffer;
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
    static getMessages(userId: string, chatId: string, limit?: number, before?: string, after?: string): Promise<{
        messages: MessageResponse[];
        hasMore: boolean;
        total: number;
    }>;
    static markAsDelivered(messageId: string, userId: string): Promise<void>;
    static markAsRead(messageId: string, userId: string): Promise<void>;
    static deleteMessage(messageId: string, userId: string, deleteForEveryone?: boolean): Promise<void>;
    static getChatList(userId: string): Promise<ChatInfo[]>;
}
export { MessageService };
//# sourceMappingURL=message.service.d.ts.map