import { Server as HttpServer } from 'http';
import { WebSocketServer as WSServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { RedisService } from './redis.service';
import { SecureMessageService } from './secure-message.service';
import { UserService } from './user.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

interface AuthenticatedWebSocket extends WebSocket {
  userId?: string;
  deviceId?: number;
  lastActivity?: Date;
}

interface WebSocketMessage {
  type: string;
  data: any;
  messageId?: string;
  timestamp?: string;
}

interface ClientInfo {
  userId: string;
  deviceId: number;
  socket: AuthenticatedWebSocket;
  lastActivity: Date;
  subscriptions: Set<string>;
}

export class WebSocketServer {
  private wss: WSServer | null = null;
  private clients: Map<string, ClientInfo> = new Map();
  private userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds
  private heartbeatInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(server: HttpServer): void {
    this.wss = new WSServer({
      server,
      path: '/ws',
      verifyClient: this.verifyClient.bind(this)
    });

    this.wss.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();

    logger.info('WebSocket server initialized');
  }

  /**
   * Verify client during connection
   */
  private verifyClient(info: { origin: string; secure: boolean; req: IncomingMessage }): boolean {
    try {
      const url = new URL(info.req.url!, `http://${info.req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        logger.warn('WebSocket connection attempt without token', { origin: info.origin });
        return false;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, config.jwt.secret) as any;
      
      // Store user info in request for later use
      (info.req as any).userId = decoded.userId;
      (info.req as any).deviceId = url.searchParams.get('deviceId') || 1;

      return true;
    } catch (error) {
      logger.warn('WebSocket authentication failed', { error: error instanceof Error ? error.message : 'Unknown error' });
      return false;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleConnection(ws: AuthenticatedWebSocket, req: IncomingMessage): Promise<void> {
    try {
      const userId = (req as any).userId;
      const deviceId = parseInt((req as any).deviceId) || 1;
      const socketId = this.generateSocketId();

      // Set up authenticated socket
      ws.userId = userId;
      ws.deviceId = deviceId;
      ws.lastActivity = new Date();

      // Store client info
      const clientInfo: ClientInfo = {
        userId,
        deviceId,
        socket: ws,
        lastActivity: new Date(),
        subscriptions: new Set()
      };

      this.clients.set(socketId, clientInfo);

      // Track user sockets
      if (!this.userSockets.has(userId)) {
        this.userSockets.set(userId, new Set());
      }
      this.userSockets.get(userId)!.add(socketId);

      // Update user online status
      await UserService.updateOnlineStatus(userId, true);

      // Subscribe to user's personal channel
      clientInfo.subscriptions.add(`user:${userId}`);

      // Set up event handlers
      ws.on('message', (data) => this.handleMessage(socketId, data));
      ws.on('close', () => this.handleDisconnection(socketId));
      ws.on('error', (error) => this.handleError(socketId, error));
      ws.on('pong', () => this.handlePong(socketId));

      // Send connection confirmation
      this.sendToSocket(socketId, {
        type: 'connection_established',
        data: {
          socketId,
          userId,
          deviceId,
          timestamp: new Date().toISOString()
        }
      });

      logger.info('WebSocket client connected', { userId, deviceId, socketId });
    } catch (error) {
      logger.error('Error handling WebSocket connection:', error);
      ws.close(1011, 'Internal server error');
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(socketId: string, data: any): Promise<void> {
    try {
      const clientInfo = this.clients.get(socketId);
      if (!clientInfo) {
        logger.warn('Received message from unknown client', { socketId });
        return;
      }

      // Update last activity
      clientInfo.lastActivity = new Date();

      const message: WebSocketMessage = JSON.parse(data.toString());
      
      logger.debug('WebSocket message received', {
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
          logger.warn('Unknown WebSocket message type', { 
            type: message.type, 
            socketId,
            userId: clientInfo.userId
          });
      }
    } catch (error) {
      logger.error('Error handling WebSocket message:', { error, socketId });
      this.sendError(socketId, 'Failed to process message');
    }
  }

  /**
   * Handle send message request
   */
  private async handleSendMessage(clientInfo: ClientInfo, message: WebSocketMessage): Promise<void> {
    try {
      const { recipientId, groupId, content, messageType, replyToId, mediaFileId } = message.data;

      // Send secure message
      const secureMessage = await SecureMessageService.sendSecureMessage({
        senderId: clientInfo.userId,
        recipientId,
        groupId,
        plaintextContent: content,
        messageType: messageType || 'TEXT',
        replyToId,
        mediaFileId,
        deviceId: clientInfo.deviceId
      });

      // Notify sender of successful send
      this.sendToSocket(this.getSocketId(clientInfo.socket), {
        type: 'message_sent',
        data: {
          messageId: secureMessage.id,
          tempId: message.data.tempId,
          sentAt: secureMessage.sentAt
        }
      });

      // Notify recipients
      if (recipientId) {
        // Direct message
        await this.notifyDirectMessage(recipientId, secureMessage);
      } else if (groupId) {
        // Group message
        await this.notifyGroupMessage(groupId, secureMessage, clientInfo.userId);
      }

    } catch (error) {
      logger.error('Error sending message via WebSocket:', error);
      this.sendError(this.getSocketId(clientInfo.socket), 'Failed to send message');
    }
  }

  /**
   * Handle message delivered notification
   */
  private async handleMessageDelivered(clientInfo: ClientInfo, message: WebSocketMessage): Promise<void> {
    try {
      const { messageId } = message.data;
      
      // Update message status in database would go here
      // For now, just notify the sender
      
      // Find the sender and notify them
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
    } catch (error) {
      logger.error('Error handling message delivered:', error);
    }
  }

  /**
   * Handle message read notification
   */
  private async handleMessageRead(clientInfo: ClientInfo, message: WebSocketMessage): Promise<void> {
    try {
      const { messageId } = message.data;
      
      // Update message status in database would go here
      
      // Find the sender and notify them
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
    } catch (error) {
      logger.error('Error handling message read:', error);
    }
  }

  /**
   * Handle typing start notification
   */
  private async handleTypingStart(clientInfo: ClientInfo, message: WebSocketMessage): Promise<void> {
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
    } else {
      this.notifyUser(chatId, typingNotification);
    }
  }

  /**
   * Handle typing stop notification
   */
  private async handleTypingStop(clientInfo: ClientInfo, message: WebSocketMessage): Promise<void> {
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
    } else {
      this.notifyUser(chatId, typingNotification);
    }
  }

  /**
   * Handle join group subscription
   */
  private async handleJoinGroup(clientInfo: ClientInfo, message: WebSocketMessage): Promise<void> {
    const { groupId } = message.data;
    
    // Add group subscription
    clientInfo.subscriptions.add(`group:${groupId}`);
    
    logger.debug('Client joined group channel', {
      userId: clientInfo.userId,
      groupId
    });
  }

  /**
   * Handle leave group subscription
   */
  private async handleLeaveGroup(clientInfo: ClientInfo, message: WebSocketMessage): Promise<void> {
    const { groupId } = message.data;
    
    // Remove group subscription
    clientInfo.subscriptions.delete(`group:${groupId}`);
    
    logger.debug('Client left group channel', {
      userId: clientInfo.userId,
      groupId
    });
  }

  /**
   * Handle custom subscription
   */
  private async handleSubscribe(clientInfo: ClientInfo, message: WebSocketMessage): Promise<void> {
    const { channel } = message.data;
    
    if (this.isValidChannel(channel, clientInfo.userId)) {
      clientInfo.subscriptions.add(channel);
      logger.debug('Client subscribed to channel', {
        userId: clientInfo.userId,
        channel
      });
    }
  }

  /**
   * Handle custom unsubscription
   */
  private async handleUnsubscribe(clientInfo: ClientInfo, message: WebSocketMessage): Promise<void> {
    const { channel } = message.data;
    
    clientInfo.subscriptions.delete(channel);
    
    logger.debug('Client unsubscribed from channel', {
      userId: clientInfo.userId,
      channel
    });
  }

  /**
   * Handle ping message
   */
  private handlePing(socketId: string): void {
    const clientInfo = this.clients.get(socketId);
    if (clientInfo) {
      clientInfo.lastActivity = new Date();
      this.sendToSocket(socketId, { type: 'pong', data: { timestamp: new Date().toISOString() } });
    }
  }

  /**
   * Handle pong response
   */
  private handlePong(socketId: string): void {
    const clientInfo = this.clients.get(socketId);
    if (clientInfo) {
      clientInfo.lastActivity = new Date();
    }
  }

  /**
   * Handle client disconnection
   */
  private async handleDisconnection(socketId: string): Promise<void> {
    try {
      const clientInfo = this.clients.get(socketId);
      if (!clientInfo) return;

      const { userId, deviceId } = clientInfo;

      // Remove client
      this.clients.delete(socketId);

      // Remove from user sockets
      const userSocketSet = this.userSockets.get(userId);
      if (userSocketSet) {
        userSocketSet.delete(socketId);
        
        // If no more sockets for this user, mark as offline
        if (userSocketSet.size === 0) {
          this.userSockets.delete(userId);
          await UserService.updateOnlineStatus(userId, false);
        }
      }

      logger.info('WebSocket client disconnected', { userId, deviceId, socketId });
    } catch (error) {
      logger.error('Error handling WebSocket disconnection:', error);
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(socketId: string, error: Error): void {
    logger.error('WebSocket error:', { socketId, error: error.message });
    
    // Clean up the connection
    this.handleDisconnection(socketId);
  }

  /**
   * Notify user of new direct message
   */
  private async notifyDirectMessage(recipientId: string, message: any): Promise<void> {
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

  /**
   * Notify group members of new message
   */
  private async notifyGroupMessage(groupId: string, message: any, senderId: string): Promise<void> {
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

  /**
   * Send message to specific user
   */
  public notifyUser(userId: string, message: WebSocketMessage): void {
    const userSocketSet = this.userSockets.get(userId);
    if (!userSocketSet) return;

    userSocketSet.forEach(socketId => {
      this.sendToSocket(socketId, message);
    });
  }

  /**
   * Send message to group members
   */
  public notifyGroup(groupId: string, message: WebSocketMessage, excludeUserId?: string): void {
    this.clients.forEach((clientInfo, socketId) => {
      if (excludeUserId && clientInfo.userId === excludeUserId) return;
      
      if (clientInfo.subscriptions.has(`group:${groupId}`)) {
        this.sendToSocket(socketId, message);
      }
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  public broadcast(message: WebSocketMessage, excludeUserId?: string): void {
    this.clients.forEach((clientInfo, socketId) => {
      if (excludeUserId && clientInfo.userId === excludeUserId) return;
      this.sendToSocket(socketId, message);
    });
  }

  /**
   * Send message to specific socket
   */
  private sendToSocket(socketId: string, message: WebSocketMessage): void {
    const clientInfo = this.clients.get(socketId);
    if (!clientInfo || clientInfo.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      clientInfo.socket.send(JSON.stringify({
        ...message,
        timestamp: message.timestamp || new Date().toISOString()
      }));
    } catch (error) {
      logger.error('Error sending WebSocket message:', { socketId, error });
      this.handleDisconnection(socketId);
    }
  }

  /**
   * Send error message to socket
   */
  private sendError(socketId: string, errorMessage: string): void {
    this.sendToSocket(socketId, {
      type: 'error',
      data: {
        message: errorMessage,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * Start heartbeat to check connection health
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = 60000; // 1 minute

      this.clients.forEach((clientInfo, socketId) => {
        const timeSinceLastActivity = now.getTime() - clientInfo.lastActivity.getTime();
        
        if (timeSinceLastActivity > timeout) {
          logger.info('Closing inactive WebSocket connection', {
            socketId,
            userId: clientInfo.userId,
            inactiveFor: timeSinceLastActivity
          });
          
          clientInfo.socket.terminate();
          this.handleDisconnection(socketId);
        } else {
          // Send ping
          if (clientInfo.socket.readyState === WebSocket.OPEN) {
            clientInfo.socket.ping();
          }
        }
      });
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get socket ID for a WebSocket instance
   */
  private getSocketId(socket: WebSocket): string {
    for (const [socketId, clientInfo] of this.clients.entries()) {
      if (clientInfo.socket === socket) {
        return socketId;
      }
    }
    return '';
  }

  /**
   * Generate unique socket ID
   */
  private generateSocketId(): string {
    return `ws_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  /**
   * Validate if channel subscription is allowed
   */
  private isValidChannel(channel: string, userId: string): boolean {
    // Allow user's own channel
    if (channel === `user:${userId}`) return true;
    
    // Allow group channels (would need additional validation in real app)
    if (channel.startsWith('group:')) return true;
    
    // Deny other channels
    return false;
  }

  /**
   * Get message sender info (placeholder - would query database)
   */
  private async getMessageSender(messageId: string): Promise<{ senderId: string } | null> {
    // This would query the database for message info
    // For now, returning null
    return null;
  }

  /**
   * Get connection statistics
   */
  public getStats(): any {
    return {
      totalConnections: this.clients.size,
      uniqueUsers: this.userSockets.size,
      uptime: process.uptime(),
      lastUpdate: new Date().toISOString()
    };
  }

  /**
   * Close WebSocket server
   */
  public async close(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.wss) {
      // Close all client connections
      this.clients.forEach((clientInfo, socketId) => {
        clientInfo.socket.close(1001, 'Server shutting down');
      });

      // Close the server
      return new Promise((resolve) => {
        this.wss!.close(() => {
          logger.info('WebSocket server closed');
          resolve();
        });
      });
    }
  }
}