"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketServer = void 0;
const ws_1 = require("ws");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const secure_message_service_1 = require("./secure-message.service");
const user_service_1 = require("./user.service");
const logger_1 = require("../utils/logger");
class WebSocketServer {
    constructor() {
        this.wss = null;
        this.clients = new Map();
        this.userSockets = new Map();
        this.heartbeatInterval = null;
    }
    initialize(server) {
        this.wss = new ws_1.WebSocketServer({
            server,
            path: '/ws',
            verifyClient: this.verifyClient.bind(this)
        });
        this.wss.on('connection', this.handleConnection.bind(this));
        this.startHeartbeat();
        logger_1.logger.info('WebSocket server initialized');
    }
    verifyClient(info) {
        try {
            const url = new URL(info.req.url, `http://${info.req.headers.host}`);
            const token = url.searchParams.get('token');
            if (!token) {
                logger_1.logger.warn('WebSocket connection attempt without token', { origin: info.origin });
                return false;
            }
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            info.req.userId = decoded.userId;
            info.req.deviceId = url.searchParams.get('deviceId') || 1;
            return true;
        }
        catch (error) {
            logger_1.logger.warn('WebSocket authentication failed', { error: error instanceof Error ? error.message : 'Unknown error' });
            return false;
        }
    }
    async handleConnection(ws, req) {
        try {
            const userId = req.userId;
            const deviceId = parseInt(req.deviceId) || 1;
            const socketId = this.generateSocketId();
            ws.userId = userId;
            ws.deviceId = deviceId;
            ws.lastActivity = new Date();
            const clientInfo = {
                userId,
                deviceId,
                socket: ws,
                lastActivity: new Date(),
                subscriptions: new Set()
            };
            this.clients.set(socketId, clientInfo);
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId).add(socketId);
            await user_service_1.UserService.updateOnlineStatus(userId, true);
            clientInfo.subscriptions.add(`user:${userId}`);
            ws.on('message', (data) => this.handleMessage(socketId, data));
            ws.on('close', () => this.handleDisconnection(socketId));
            ws.on('error', (error) => this.handleError(socketId, error));
            ws.on('pong', () => this.handlePong(socketId));
            this.sendToSocket(socketId, {
                type: 'connection_established',
                data: {
                    socketId,
                    userId,
                    deviceId,
                    timestamp: new Date().toISOString()
                }
            });
            logger_1.logger.info('WebSocket client connected', { userId, deviceId, socketId });
        }
        catch (error) {
            logger_1.logger.error('Error handling WebSocket connection:', error);
            ws.close(1011, 'Internal server error');
        }
    }
    async handleMessage(socketId, data) {
        try {
            const clientInfo = this.clients.get(socketId);
            if (!clientInfo) {
                logger_1.logger.warn('Received message from unknown client', { socketId });
                return;
            }
            clientInfo.lastActivity = new Date();
            const message = JSON.parse(data.toString());
            logger_1.logger.debug('WebSocket message received', {
                socketId,
                userId: clientInfo.userId,
                type: message.type
            });
            switch (message.type) {
                case 'send_message':
                    await this.handleSendMessage(clientInfo, message);
                    break;
                case 'message_delivered':
                    await this.handleMessageDelivered(clientInfo, message);
                    break;
                case 'message_read':
                    await this.handleMessageRead(clientInfo, message);
                    break;
                case 'typing_start':
                    await this.handleTypingStart(clientInfo, message);
                    break;
                case 'typing_stop':
                    await this.handleTypingStop(clientInfo, message);
                    break;
                case 'join_group':
                    await this.handleJoinGroup(clientInfo, message);
                    break;
                case 'leave_group':
                    await this.handleLeaveGroup(clientInfo, message);
                    break;
                case 'subscribe':
                    await this.handleSubscribe(clientInfo, message);
                    break;
                case 'unsubscribe':
                    await this.handleUnsubscribe(clientInfo, message);
                    break;
                case 'ping':
                    this.handlePing(socketId);
                    break;
                default:
                    logger_1.logger.warn('Unknown WebSocket message type', {
                        type: message.type,
                        socketId,
                        userId: clientInfo.userId
                    });
            }
        }
        catch (error) {
            logger_1.logger.error('Error handling WebSocket message:', { error, socketId });
            this.sendError(socketId, 'Failed to process message');
        }
    }
    async handleSendMessage(clientInfo, message) {
        try {
            const { recipientId, groupId, content, messageType, replyToId, mediaFileId } = message.data;
            const secureMessage = await secure_message_service_1.SecureMessageService.sendSecureMessage({
                senderId: clientInfo.userId,
                recipientId,
                groupId,
                plaintextContent: content,
                messageType: messageType || 'TEXT',
                replyToId,
                mediaFileId,
                deviceId: clientInfo.deviceId
            });
            this.sendToSocket(this.getSocketId(clientInfo.socket), {
                type: 'message_sent',
                data: {
                    messageId: secureMessage.id,
                    tempId: message.data.tempId,
                    sentAt: secureMessage.sentAt
                }
            });
            if (recipientId) {
                await this.notifyDirectMessage(recipientId, secureMessage);
            }
            else if (groupId) {
                await this.notifyGroupMessage(groupId, secureMessage, clientInfo.userId);
            }
        }
        catch (error) {
            logger_1.logger.error('Error sending message via WebSocket:', error);
            this.sendError(this.getSocketId(clientInfo.socket), 'Failed to send message');
        }
    }
    async handleMessageDelivered(clientInfo, message) {
        try {
            const { messageId } = message.data;
            const messageData = await this.getMessageSender(messageId);
            if (messageData) {
                this.notifyUser(messageData.senderId, {
                    type: 'message_delivered',
                    data: {
                        messageId,
                        deliveredBy: clientInfo.userId,
                        deliveredAt: new Date().toISOString()
                    }
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error handling message delivered:', error);
        }
    }
    async handleMessageRead(clientInfo, message) {
        try {
            const { messageId } = message.data;
            const messageData = await this.getMessageSender(messageId);
            if (messageData) {
                this.notifyUser(messageData.senderId, {
                    type: 'message_read',
                    data: {
                        messageId,
                        readBy: clientInfo.userId,
                        readAt: new Date().toISOString()
                    }
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error handling message read:', error);
        }
    }
    async handleTypingStart(clientInfo, message) {
        const { chatId, isGroup } = message.data;
        const typingNotification = {
            type: 'typing_start',
            data: {
                userId: clientInfo.userId,
                chatId,
                timestamp: new Date().toISOString()
            }
        };
        if (isGroup) {
            this.notifyGroup(chatId, typingNotification, clientInfo.userId);
        }
        else {
            this.notifyUser(chatId, typingNotification);
        }
    }
    async handleTypingStop(clientInfo, message) {
        const { chatId, isGroup } = message.data;
        const typingNotification = {
            type: 'typing_stop',
            data: {
                userId: clientInfo.userId,
                chatId,
                timestamp: new Date().toISOString()
            }
        };
        if (isGroup) {
            this.notifyGroup(chatId, typingNotification, clientInfo.userId);
        }
        else {
            this.notifyUser(chatId, typingNotification);
        }
    }
    async handleJoinGroup(clientInfo, message) {
        const { groupId } = message.data;
        clientInfo.subscriptions.add(`group:${groupId}`);
        logger_1.logger.debug('Client joined group channel', {
            userId: clientInfo.userId,
            groupId
        });
    }
    async handleLeaveGroup(clientInfo, message) {
        const { groupId } = message.data;
        clientInfo.subscriptions.delete(`group:${groupId}`);
        logger_1.logger.debug('Client left group channel', {
            userId: clientInfo.userId,
            groupId
        });
    }
    async handleSubscribe(clientInfo, message) {
        const { channel } = message.data;
        if (this.isValidChannel(channel, clientInfo.userId)) {
            clientInfo.subscriptions.add(channel);
            logger_1.logger.debug('Client subscribed to channel', {
                userId: clientInfo.userId,
                channel
            });
        }
    }
    async handleUnsubscribe(clientInfo, message) {
        const { channel } = message.data;
        clientInfo.subscriptions.delete(channel);
        logger_1.logger.debug('Client unsubscribed from channel', {
            userId: clientInfo.userId,
            channel
        });
    }
    handlePing(socketId) {
        const clientInfo = this.clients.get(socketId);
        if (clientInfo) {
            clientInfo.lastActivity = new Date();
            this.sendToSocket(socketId, { type: 'pong', data: { timestamp: new Date().toISOString() } });
        }
    }
    handlePong(socketId) {
        const clientInfo = this.clients.get(socketId);
        if (clientInfo) {
            clientInfo.lastActivity = new Date();
        }
    }
    async handleDisconnection(socketId) {
        try {
            const clientInfo = this.clients.get(socketId);
            if (!clientInfo)
                return;
            const { userId, deviceId } = clientInfo;
            this.clients.delete(socketId);
            const userSocketSet = this.userSockets.get(userId);
            if (userSocketSet) {
                userSocketSet.delete(socketId);
                if (userSocketSet.size === 0) {
                    this.userSockets.delete(userId);
                    await user_service_1.UserService.updateOnlineStatus(userId, false);
                }
            }
            logger_1.logger.info('WebSocket client disconnected', { userId, deviceId, socketId });
        }
        catch (error) {
            logger_1.logger.error('Error handling WebSocket disconnection:', error);
        }
    }
    handleError(socketId, error) {
        logger_1.logger.error('WebSocket error:', { socketId, error: error.message });
        this.handleDisconnection(socketId);
    }
    async notifyDirectMessage(recipientId, message) {
        this.notifyUser(recipientId, {
            type: 'new_message',
            data: {
                messageId: message.id,
                senderId: message.senderId,
                messageType: message.messageType,
                sentAt: message.sentAt,
                isGroup: false
            }
        });
    }
    async notifyGroupMessage(groupId, message, senderId) {
        this.notifyGroup(groupId, {
            type: 'new_message',
            data: {
                messageId: message.id,
                senderId: message.senderId,
                groupId,
                messageType: message.messageType,
                sentAt: message.sentAt,
                isGroup: true
            }
        }, senderId);
    }
    notifyUser(userId, message) {
        const userSocketSet = this.userSockets.get(userId);
        if (!userSocketSet)
            return;
        userSocketSet.forEach(socketId => {
            this.sendToSocket(socketId, message);
        });
    }
    notifyGroup(groupId, message, excludeUserId) {
        this.clients.forEach((clientInfo, socketId) => {
            if (excludeUserId && clientInfo.userId === excludeUserId)
                return;
            if (clientInfo.subscriptions.has(`group:${groupId}`)) {
                this.sendToSocket(socketId, message);
            }
        });
    }
    broadcast(message, excludeUserId) {
        this.clients.forEach((clientInfo, socketId) => {
            if (excludeUserId && clientInfo.userId === excludeUserId)
                return;
            this.sendToSocket(socketId, message);
        });
    }
    sendToSocket(socketId, message) {
        const clientInfo = this.clients.get(socketId);
        if (!clientInfo || clientInfo.socket.readyState !== ws_1.WebSocket.OPEN) {
            return;
        }
        try {
            clientInfo.socket.send(JSON.stringify({
                ...message,
                timestamp: message.timestamp || new Date().toISOString()
            }));
        }
        catch (error) {
            logger_1.logger.error('Error sending WebSocket message:', { socketId, error });
            this.handleDisconnection(socketId);
        }
    }
    sendError(socketId, errorMessage) {
        this.sendToSocket(socketId, {
            type: 'error',
            data: {
                message: errorMessage,
                timestamp: new Date().toISOString()
            }
        });
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => {
            const now = new Date();
            const timeout = 60000;
            this.clients.forEach((clientInfo, socketId) => {
                const timeSinceLastActivity = now.getTime() - clientInfo.lastActivity.getTime();
                if (timeSinceLastActivity > timeout) {
                    logger_1.logger.info('Closing inactive WebSocket connection', {
                        socketId,
                        userId: clientInfo.userId,
                        inactiveFor: timeSinceLastActivity
                    });
                    clientInfo.socket.terminate();
                    this.handleDisconnection(socketId);
                }
                else {
                    if (clientInfo.socket.readyState === ws_1.WebSocket.OPEN) {
                        clientInfo.socket.ping();
                    }
                }
            });
        }, 30000);
    }
    getSocketId(socket) {
        for (const [socketId, clientInfo] of this.clients.entries()) {
            if (clientInfo.socket === socket) {
                return socketId;
            }
        }
        return '';
    }
    generateSocketId() {
        return `ws_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    }
    isValidChannel(channel, userId) {
        if (channel === `user:${userId}`)
            return true;
        if (channel.startsWith('group:'))
            return true;
        return false;
    }
    async getMessageSender(messageId) {
        return null;
    }
    getStats() {
        return {
            totalConnections: this.clients.size,
            uniqueUsers: this.userSockets.size,
            uptime: process.uptime(),
            lastUpdate: new Date().toISOString()
        };
    }
    async close() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        if (this.wss) {
            this.clients.forEach((clientInfo, socketId) => {
                clientInfo.socket.close(1001, 'Server shutting down');
            });
            return new Promise((resolve) => {
                this.wss.close(() => {
                    logger_1.logger.info('WebSocket server closed');
                    resolve();
                });
            });
        }
    }
}
exports.WebSocketServer = WebSocketServer;
//# sourceMappingURL=websocket.service.js.map