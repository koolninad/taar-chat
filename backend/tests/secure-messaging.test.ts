import request from 'supertest';
import express from 'express';
import { authRoutes } from '@/routes/auth.routes';
import { signalRoutes } from '@/routes/signal.routes';
import { secureMessageRoutes } from '@/routes/secure-message.routes';
import { DatabaseService } from '@/services/database.service';
import { RedisService } from '@/services/redis.service';
import { errorHandler } from '@/middleware/errorHandler';

describe('Secure Messaging API', () => {
  let app: express.Application;
  let user1AccessToken: string;
  let user1Id: string;
  let user2AccessToken: string;
  let user2Id: string;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/signal', signalRoutes);
    app.use('/api/v1/secure-messages', secureMessageRoutes);
    app.use(errorHandler);

    // Connect to test services
    await DatabaseService.connect();
    await RedisService.connect();
  });

  afterAll(async () => {
    await DatabaseService.clearTestData();
    await DatabaseService.disconnect();
    await RedisService.disconnect();
  });

  beforeEach(async () => {
    await DatabaseService.clearTestData();
    await RedisService.client.flushDb();

    // Create first user
    await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phoneNumber: '9876543210', countryCode: '+91' });

    await RedisService.setOtp('+919876543210', '123456');

    const user1Response = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        phoneNumber: '9876543210',
        countryCode: '+91',
        otpCode: '123456',
        userInfo: {
          name: 'User One',
          identityKey: 'mock-identity-key-1'
        }
      });

    user1AccessToken = user1Response.body.data.tokens.accessToken;
    user1Id = user1Response.body.data.user.id;

    // Create second user
    await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phoneNumber: '9876543211', countryCode: '+91' });

    await RedisService.setOtp('+919876543211', '123456');

    const user2Response = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        phoneNumber: '9876543211',
        countryCode: '+91',
        otpCode: '123456',
        userInfo: {
          name: 'User Two',
          identityKey: 'mock-identity-key-2'
        }
      });

    user2AccessToken = user2Response.body.data.tokens.accessToken;
    user2Id = user2Response.body.data.user.id;

    // Initialize Signal Protocol for both users
    await request(app)
      .post('/api/v1/signal/init')
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .send({ deviceId: 1 });

    await request(app)
      .post('/api/v1/signal/init')
      .set('Authorization', `Bearer ${user2AccessToken}`)
      .send({ deviceId: 1 });

    // Generate prekeys for both users
    await request(app)
      .post('/api/v1/signal/prekeys')
      .set('Authorization', `Bearer ${user1AccessToken}`)
      .send({ deviceId: 1, count: 10 });

    await request(app)
      .post('/api/v1/signal/prekeys')
      .set('Authorization', `Bearer ${user2AccessToken}`)
      .send({ deviceId: 1, count: 10 });
  });

  describe('POST /api/v1/secure-messages', () => {
    it('should send encrypted direct message', async () => {
      const response = await request(app)
        .post('/api/v1/secure-messages')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .send({
          recipientId: user2Id,
          message: 'Hello, this is a secure message!',
          messageType: 'TEXT'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('message');
      expect(response.body.data.message).toHaveProperty('id');
      expect(response.body.data.message).toHaveProperty('senderId', user1Id);
      expect(response.body.data.message).toHaveProperty('recipientId', user2Id);
      expect(response.body.data.message).toHaveProperty('signalMetadata');
    });

    it('should validate message content', async () => {
      const response = await request(app)
        .post('/api/v1/secure-messages')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .send({
          recipientId: user2Id,
          message: '', // Empty message
          messageType: 'TEXT'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require either recipientId or groupId', async () => {
      const response = await request(app)
        .post('/api/v1/secure-messages')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .send({
          message: 'Hello, this is a secure message!',
          messageType: 'TEXT'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should not allow both recipientId and groupId', async () => {
      const response = await request(app)
        .post('/api/v1/secure-messages')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .send({
          recipientId: user2Id,
          groupId: 'some-group-id',
          message: 'Hello, this is a secure message!',
          messageType: 'TEXT'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/secure-messages')
        .send({
          recipientId: user2Id,
          message: 'Hello, this is a secure message!',
          messageType: 'TEXT'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/secure-messages/:messageId/decrypt', () => {
    let messageId: string;

    beforeEach(async () => {
      // Send a message first
      const messageResponse = await request(app)
        .post('/api/v1/secure-messages')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .send({
          recipientId: user2Id,
          message: 'Hello, this is a secure message to decrypt!',
          messageType: 'TEXT'
        });

      messageId = messageResponse.body.data.message.id;
    });

    it('should decrypt message for recipient', async () => {
      const response = await request(app)
        .post(`/api/v1/secure-messages/${messageId}/decrypt`)
        .set('Authorization', `Bearer ${user2AccessToken}`)
        .send({ deviceId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('decryptedMessage');
      expect(response.body.data.decryptedMessage).toHaveProperty('plaintextContent');
      expect(response.body.data.decryptedMessage).toHaveProperty('senderId', user1Id);
      expect(response.body.data.decryptedMessage).toHaveProperty('metadata');
    });

    it('should not allow sender to decrypt their own message', async () => {
      const response = await request(app)
        .post(`/api/v1/secure-messages/${messageId}/decrypt`)
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .send({ deviceId: 1 });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent message', async () => {
      const fakeMessageId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .post(`/api/v1/secure-messages/${fakeMessageId}/decrypt`)
        .set('Authorization', `Bearer ${user2AccessToken}`)
        .send({ deviceId: 1 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/secure-messages/chat/:chatId', () => {
    beforeEach(async () => {
      // Send multiple messages
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/v1/secure-messages')
          .set('Authorization', `Bearer ${user1AccessToken}`)
          .send({
            recipientId: user2Id,
            message: `Message ${i + 1}`,
            messageType: 'TEXT'
          });
      }
    });

    it('should get encrypted messages for a chat', async () => {
      const response = await request(app)
        .get(`/api/v1/secure-messages/chat/${user2Id}`)
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('messages');
      expect(response.body.data).toHaveProperty('pagination');
      expect(Array.isArray(response.body.data.messages)).toBe(true);
      expect(response.body.data.messages.length).toBe(5);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/secure-messages/chat/${user2Id}`)
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.messages.length).toBe(2);
      expect(response.body.data.pagination).toHaveProperty('hasMore');
    });

    it('should enforce limit restrictions', async () => {
      const response = await request(app)
        .get(`/api/v1/secure-messages/chat/${user2Id}`)
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .query({ page: 1, limit: 200 }); // Exceeds max limit

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/secure-messages/key-exchange', () => {
    it('should process key exchange for new conversation', async () => {
      const response = await request(app)
        .post('/api/v1/secure-messages/key-exchange')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .send({
          remoteUserId: user2Id,
          deviceId: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('success', true);
    });

    it('should require remoteUserId', async () => {
      const response = await request(app)
        .post('/api/v1/secure-messages/key-exchange')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .send({ deviceId: 1 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/secure-messages/verify/:chatId', () => {
    beforeEach(async () => {
      // Send some messages to verify
      await request(app)
        .post('/api/v1/secure-messages')
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .send({
          recipientId: user2Id,
          message: 'Message for verification',
          messageType: 'TEXT'
        });
    });

    it('should verify conversation integrity', async () => {
      const response = await request(app)
        .get(`/api/v1/secure-messages/verify/${user2Id}`)
        .set('Authorization', `Bearer ${user1AccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('verification');
      expect(response.body.data.verification).toHaveProperty('verified');
      expect(response.body.data.verification).toHaveProperty('issueCount');
    });
  });

  describe('GET /api/v1/secure-messages/sessions/:remoteUserId', () => {
    it('should get session information', async () => {
      const response = await request(app)
        .get(`/api/v1/secure-messages/sessions/${user2Id}`)
        .set('Authorization', `Bearer ${user1AccessToken}`)
        .query({ deviceId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessionInfo');
    });
  });

  describe('GET /api/v1/secure-messages/stats', () => {
    it('should get secure messaging statistics', async () => {
      const response = await request(app)
        .get('/api/v1/secure-messages/stats')
        .set('Authorization', `Bearer ${user1AccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stats');
    });
  });

  describe('POST /api/v1/secure-messages/batch-decrypt', () => {
    let messageIds: string[];

    beforeEach(async () => {
      messageIds = [];
      
      // Send multiple messages
      for (let i = 0; i < 3; i++) {
        const messageResponse = await request(app)
          .post('/api/v1/secure-messages')
          .set('Authorization', `Bearer ${user1AccessToken}`)
          .send({
            recipientId: user2Id,
            message: `Batch message ${i + 1}`,
            messageType: 'TEXT'
          });
        
        messageIds.push(messageResponse.body.data.message.id);
      }
    });

    it('should decrypt multiple messages at once', async () => {
      const response = await request(app)
        .post('/api/v1/secure-messages/batch-decrypt')
        .set('Authorization', `Bearer ${user2AccessToken}`)
        .send({
          messageIds,
          deviceId: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('results');
      expect(response.body.data.results).toHaveProperty('decrypted');
      expect(response.body.data.results).toHaveProperty('failed');
      expect(response.body.data.results.total).toBe(3);
    });

    it('should limit batch size', async () => {
      const tooManyIds = new Array(60).fill('fake-id');
      
      const response = await request(app)
        .post('/api/v1/secure-messages/batch-decrypt')
        .set('Authorization', `Bearer ${user2AccessToken}`)
        .send({
          messageIds: tooManyIds,
          deviceId: 1
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/secure-messages/security/:chatId', () => {
    it('should get conversation security status', async () => {
      const response = await request(app)
        .get(`/api/v1/secure-messages/security/${user2Id}`)
        .set('Authorization', `Bearer ${user1AccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('securityStatus');
      expect(response.body.data.securityStatus).toHaveProperty('isSecure');
      expect(response.body.data.securityStatus).toHaveProperty('encryptionProtocol');
    });
  });

  describe('GET /api/v1/secure-messages/health', () => {
    it('should return secure messaging health status', async () => {
      const response = await request(app)
        .get('/api/v1/secure-messages/health')
        .set('Authorization', `Bearer ${user1AccessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('signalProtocol');
      expect(response.body.data).toHaveProperty('encryption');
      expect(response.body.data).toHaveProperty('decryption');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on message sending', async () => {
      // Send many messages quickly to trigger rate limiting
      const promises = [];
      
      for (let i = 0; i < 120; i++) {
        promises.push(
          request(app)
            .post('/api/v1/secure-messages')
            .set('Authorization', `Bearer ${user1AccessToken}`)
            .send({
              recipientId: user2Id,
              message: `Rate limit test message ${i}`,
              messageType: 'TEXT'
            })
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});