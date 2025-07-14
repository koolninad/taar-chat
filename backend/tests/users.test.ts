import request from 'supertest';
import express from 'express';
import { authRoutes } from '@/routes/auth.routes';
import { userRoutes } from '@/routes/user.routes';
import { DatabaseService } from '@/services/database.service';
import { RedisService } from '@/services/redis.service';
import { errorHandler } from '@/middleware/errorHandler';

describe('User Management API', () => {
  let app: express.Application;
  let accessToken: string;
  let userId: string;
  let secondUserToken: string;
  let secondUserId: string;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/users', userRoutes);
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

    // Create first authenticated user
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

    accessToken = user1Response.body.data.tokens.accessToken;
    userId = user1Response.body.data.user.id;

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

    secondUserToken = user2Response.body.data.tokens.accessToken;
    secondUserId = user2Response.body.data.user.id;
  });

  describe('GET /api/v1/users/profile/:userId', () => {
    it('should get user profile by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/users/profile/${secondUserId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user.id).toBe(secondUserId);
      expect(response.body.data.user.name).toBe('User Two');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeUserId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .get(`/api/v1/users/profile/${fakeUserId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/users/profile/${secondUserId}`);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/search', () => {
    it('should search users by phone number', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ phoneNumber: '9876543211' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('users');
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBe(1);
      expect(response.body.data.users[0].id).toBe(secondUserId);
    });

    it('should search users by name', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ name: 'User Two' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users.length).toBe(1);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ name: 'User', page: 1, limit: 1 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('hasMore');
    });

    it('should require search parameter', async () => {
      const response = await request(app)
        .get('/api/v1/users/search')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/contacts', () => {
    beforeEach(async () => {
      // Add contact relationship
      await request(app)
        .post('/api/v1/users/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: secondUserId });
    });

    it('should get user contacts', async () => {
      const response = await request(app)
        .get('/api/v1/users/contacts')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('contacts');
      expect(Array.isArray(response.body.data.contacts)).toBe(true);
      expect(response.body.data.contacts.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/users/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('pagination');
    });
  });

  describe('POST /api/v1/users/contacts', () => {
    it('should add user to contacts', async () => {
      const response = await request(app)
        .post('/api/v1/users/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: secondUserId });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('contact');
      expect(response.body.data.contact.contactId).toBe(secondUserId);
    });

    it('should not allow adding self as contact', async () => {
      const response = await request(app)
        .post('/api/v1/users/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: userId });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should not allow duplicate contacts', async () => {
      // Add contact first time
      await request(app)
        .post('/api/v1/users/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: secondUserId });

      // Try to add same contact again
      const response = await request(app)
        .post('/api/v1/users/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: secondUserId });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/users/contacts/:contactId', () => {
    beforeEach(async () => {
      // Add contact first
      await request(app)
        .post('/api/v1/users/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: secondUserId });
    });

    it('should remove user from contacts', async () => {
      const response = await request(app)
        .delete(`/api/v1/users/contacts/${secondUserId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 for non-existent contact', async () => {
      const fakeUserId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .delete(`/api/v1/users/contacts/${fakeUserId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/users/contacts/:contactId', () => {
    beforeEach(async () => {
      // Add contact first
      await request(app)
        .post('/api/v1/users/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: secondUserId });
    });

    it('should update contact information', async () => {
      const response = await request(app)
        .put(`/api/v1/users/contacts/${secondUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          nickname: 'Best Friend',
          isBlocked: false
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.contact.nickname).toBe('Best Friend');
    });
  });

  describe('POST /api/v1/users/block', () => {
    it('should block a user', async () => {
      const response = await request(app)
        .post('/api/v1/users/block')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: secondUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow blocking self', async () => {
      const response = await request(app)
        .post('/api/v1/users/block')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: userId });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/users/unblock', () => {
    beforeEach(async () => {
      // Block user first
      await request(app)
        .post('/api/v1/users/block')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: secondUserId });
    });

    it('should unblock a user', async () => {
      const response = await request(app)
        .post('/api/v1/users/unblock')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: secondUserId });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/users/blocked', () => {
    beforeEach(async () => {
      // Block a user
      await request(app)
        .post('/api/v1/users/block')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ userId: secondUserId });
    });

    it('should get blocked users list', async () => {
      const response = await request(app)
        .get('/api/v1/users/blocked')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('blockedUsers');
      expect(Array.isArray(response.body.data.blockedUsers)).toBe(true);
    });
  });

  describe('GET /api/v1/users/activity/:userId', () => {
    it('should get user activity status', async () => {
      const response = await request(app)
        .get(`/api/v1/users/activity/${secondUserId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('activity');
      expect(response.body.data.activity).toHaveProperty('isOnline');
      expect(response.body.data.activity).toHaveProperty('lastSeen');
    });
  });

  describe('PUT /api/v1/users/privacy', () => {
    it('should update privacy settings', async () => {
      const response = await request(app)
        .put('/api/v1/users/privacy')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          lastSeenVisibility: 'contacts',
          profilePhotoVisibility: 'everyone',
          aboutVisibility: 'contacts'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('privacy');
    });

    it('should validate privacy settings', async () => {
      const response = await request(app)
        .put('/api/v1/users/privacy')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          lastSeenVisibility: 'invalid-option'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/privacy', () => {
    it('should get privacy settings', async () => {
      const response = await request(app)
        .get('/api/v1/users/privacy')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('privacy');
    });
  });

  describe('DELETE /api/v1/users/account', () => {
    it('should delete user account', async () => {
      const response = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ confirmation: 'DELETE' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require confirmation', async () => {
      const response = await request(app)
        .delete('/api/v1/users/account')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/users/stats', () => {
    it('should get user statistics', async () => {
      const response = await request(app)
        .get('/api/v1/users/stats')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data.stats).toHaveProperty('totalContacts');
      expect(response.body.data.stats).toHaveProperty('totalMessages');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on search', async () => {
      // Perform many searches to trigger rate limiting
      const promises = [];
      
      for (let i = 0; i < 30; i++) {
        promises.push(
          request(app)
            .get('/api/v1/users/search')
            .set('Authorization', `Bearer ${accessToken}`)
            .query({ name: 'test' })
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});