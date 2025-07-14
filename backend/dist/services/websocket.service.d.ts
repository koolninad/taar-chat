import { Server as HttpServer } from 'http';
interface WebSocketMessage {
    type: string;
    data: any;
    messageId?: string;
    timestamp?: string;
}
export declare class WebSocketServer {
    private wss;
    private clients;
    private userSockets;
    private heartbeatInterval;
    initialize(server: HttpServer): void;
    private verifyClient;
    private handleConnection;
    private handleMessage;
    private handleSendMessage;
    private handleMessageDelivered;
    private handleMessageRead;
    private handleTypingStart;
    private handleTypingStop;
    private handleJoinGroup;
    private handleLeaveGroup;
    private handleSubscribe;
    private handleUnsubscribe;
    private handlePing;
    private handlePong;
    private handleDisconnection;
    private handleError;
    private notifyDirectMessage;
    private notifyGroupMessage;
    notifyUser(userId: string, message: WebSocketMessage): void;
    notifyGroup(groupId: string, message: WebSocketMessage, excludeUserId?: string): void;
    broadcast(message: WebSocketMessage, excludeUserId?: string): void;
    private sendToSocket;
    private sendError;
    private startHeartbeat;
    private getSocketId;
    private generateSocketId;
    private isValidChannel;
    private getMessageSender;
    getStats(): any;
    close(): Promise<void>;
}
export {};
//# sourceMappingURL=websocket.service.d.ts.map