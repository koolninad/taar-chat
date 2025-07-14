import request from 'supertest';
import express from 'express';
import { authRoutes } from '@/routes/auth.routes';
import { mediaRoutes } from '@/routes/media.routes';
import { DatabaseService } from '@/services/database.service';
import { RedisService } from '@/services/redis.service';
import { errorHandler } from '@/middleware/errorHandler';
import path from 'path';
import fs from 'fs';

describe('Media Management API', () => {
  let app: express.Application;
  let accessToken: string;
  let userId: string;
  let secondUserToken: string;
  let secondUserId: string;
  let mediaFileId: string;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/media', mediaRoutes);
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

  describe('POST /api/v1/media/upload', () => {
    it('should upload image file', async () => {
      // Create a mock image file buffer
      const imageBuffer = Buffer.from('fake-image-data');
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', imageBuffer, 'test-image.jpg')
        .field('mediaType', 'IMAGE');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('media');
      expect(response.body.data.media).toHaveProperty('id');
      expect(response.body.data.media).toHaveProperty('url');
      expect(response.body.data.media.mediaType).toBe('IMAGE');
      
      mediaFileId = response.body.data.media.id;
    });

    it('should upload document file', async () => {
      const docBuffer = Buffer.from('fake-document-data');
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', docBuffer, 'test-document.pdf')
        .field('mediaType', 'DOCUMENT');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.media.mediaType).toBe('DOCUMENT');
    });

    it('should upload audio file', async () => {
      const audioBuffer = Buffer.from('fake-audio-data');
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', audioBuffer, 'test-audio.mp3')
        .field('mediaType', 'AUDIO');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.media.mediaType).toBe('AUDIO');
    });

    it('should upload video file', async () => {
      const videoBuffer = Buffer.from('fake-video-data');
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', videoBuffer, 'test-video.mp4')
        .field('mediaType', 'VIDEO');

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.media.mediaType).toBe('VIDEO');
    });

    it('should validate file size', async () => {
      // Create a large buffer to simulate oversized file
      const largeBuffer = Buffer.alloc(100 * 1024 * 1024); // 100MB
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', largeBuffer, 'large-file.jpg')
        .field('mediaType', 'IMAGE');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should validate media type', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', imageBuffer, 'test-image.jpg')
        .field('mediaType', 'INVALID_TYPE');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require file', async () => {
      const response = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .field('mediaType', 'IMAGE');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const imageBuffer = Buffer.from('fake-image-data');
      
      const response = await request(app)
        .post('/api/v1/media/upload')
        .attach('file', imageBuffer, 'test-image.jpg')
        .field('mediaType', 'IMAGE');

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/media/:mediaId', () => {
    beforeEach(async () => {
      // Upload a test file first
      const imageBuffer = Buffer.from('fake-image-data');
      
      const uploadResponse = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', imageBuffer, 'test-image.jpg')
        .field('mediaType', 'IMAGE');

      mediaFileId = uploadResponse.body.data.media.id;
    });

    it('should get media file by owner', async () => {
      const response = await request(app)
        .get(`/api/v1/media/${mediaFileId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('media');
      expect(response.body.data.media.id).toBe(mediaFileId);
    });

    it('should return 404 for non-existent media', async () => {
      const fakeMediaId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .get(`/api/v1/media/${fakeMediaId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should not allow access to other user media without permission', async () => {
      const response = await request(app)
        .get(`/api/v1/media/${mediaFileId}`)
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/media/:mediaId/download', () => {
    beforeEach(async () => {
      // Upload a test file first
      const imageBuffer = Buffer.from('fake-image-data');
      
      const uploadResponse = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', imageBuffer, 'test-image.jpg')
        .field('mediaType', 'IMAGE');

      mediaFileId = uploadResponse.body.data.media.id;
    });

    it('should download media file by owner', async () => {
      const response = await request(app)
        .get(`/api/v1/media/${mediaFileId}/download`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      // Response should be the actual file data
      expect(response.headers['content-type']).toContain('image');
    });

    it('should return 404 for non-existent media download', async () => {
      const fakeMediaId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .get(`/api/v1/media/${fakeMediaId}/download`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/media/:mediaId', () => {
    beforeEach(async () => {
      // Upload a test file first
      const imageBuffer = Buffer.from('fake-image-data');
      
      const uploadResponse = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', imageBuffer, 'test-image.jpg')
        .field('mediaType', 'IMAGE');

      mediaFileId = uploadResponse.body.data.media.id;
    });

    it('should delete media file by owner', async () => {
      const response = await request(app)
        .delete(`/api/v1/media/${mediaFileId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow non-owner to delete media', async () => {
      const response = await request(app)
        .delete(`/api/v1/media/${mediaFileId}`)
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should return 404 for non-existent media delete', async () => {
      const fakeMediaId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .delete(`/api/v1/media/${fakeMediaId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/media/my', () => {
    beforeEach(async () => {
      // Upload multiple test files
      const files = [
        { name: 'image1.jpg', type: 'IMAGE' },
        { name: 'image2.png', type: 'IMAGE' },
        { name: 'document.pdf', type: 'DOCUMENT' }
      ];

      for (const file of files) {
        const buffer = Buffer.from(`fake-${file.type.toLowerCase()}-data`);
        await request(app)
          .post('/api/v1/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('file', buffer, file.name)
          .field('mediaType', file.type);
      }
    });

    it('should get user media files', async () => {
      const response = await request(app)
        .get('/api/v1/media/my')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('media');
      expect(Array.isArray(response.body.data.media)).toBe(true);
      expect(response.body.data.media.length).toBe(3);
    });

    it('should filter by media type', async () => {
      const response = await request(app)
        .get('/api/v1/media/my')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ mediaType: 'IMAGE' });

      expect(response.status).toBe(200);
      expect(response.body.data.media.length).toBe(2);
      response.body.data.media.forEach((media: any) => {
        expect(media.mediaType).toBe('IMAGE');
      });
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/media/my')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ page: 1, limit: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.media.length).toBe(2);
      expect(response.body.data).toHaveProperty('pagination');
      expect(response.body.data.pagination).toHaveProperty('hasMore');
    });
  });

  describe('POST /api/v1/media/:mediaId/share', () => {
    beforeEach(async () => {
      // Upload a test file first
      const imageBuffer = Buffer.from('fake-image-data');
      
      const uploadResponse = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', imageBuffer, 'test-image.jpg')
        .field('mediaType', 'IMAGE');

      mediaFileId = uploadResponse.body.data.media.id;
    });

    it('should share media with another user', async () => {
      const response = await request(app)
        .post(`/api/v1/media/${mediaFileId}/share`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: secondUserId,
          permissions: ['VIEW', 'DOWNLOAD']
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sharedMedia');
    });

    it('should validate permissions', async () => {
      const response = await request(app)
        .post(`/api/v1/media/${mediaFileId}/share`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: secondUserId,
          permissions: ['INVALID_PERMISSION']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should not allow sharing with self', async () => {
      const response = await request(app)
        .post(`/api/v1/media/${mediaFileId}/share`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: userId,
          permissions: ['VIEW']
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/media/shared', () => {
    beforeEach(async () => {
      // Upload and share a file
      const imageBuffer = Buffer.from('fake-image-data');
      
      const uploadResponse = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', imageBuffer, 'test-image.jpg')
        .field('mediaType', 'IMAGE');

      mediaFileId = uploadResponse.body.data.media.id;

      // Share with second user
      await request(app)
        .post(`/api/v1/media/${mediaFileId}/share`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          userId: secondUserId,
          permissions: ['VIEW', 'DOWNLOAD']
        });
    });

    it('should get shared media files', async () => {
      const response = await request(app)
        .get('/api/v1/media/shared')
        .set('Authorization', `Bearer ${secondUserToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sharedMedia');
      expect(Array.isArray(response.body.data.sharedMedia)).toBe(true);
      expect(response.body.data.sharedMedia.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/media/shared')
        .set('Authorization', `Bearer ${secondUserToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('pagination');
    });
  });

  describe('GET /api/v1/media/stats', () => {
    beforeEach(async () => {
      // Upload multiple files for stats
      const files = [
        { name: 'image1.jpg', type: 'IMAGE' },
        { name: 'document.pdf', type: 'DOCUMENT' },
        { name: 'audio.mp3', type: 'AUDIO' }
      ];

      for (const file of files) {
        const buffer = Buffer.from(`fake-${file.type.toLowerCase()}-data`);
        await request(app)
          .post('/api/v1/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('file', buffer, file.name)
          .field('mediaType', file.type);
      }
    });

    it('should get media statistics', async () => {
      const response = await request(app)
        .get('/api/v1/media/stats')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('stats');
      expect(response.body.data.stats).toHaveProperty('totalFiles');
      expect(response.body.data.stats).toHaveProperty('totalSize');
      expect(response.body.data.stats).toHaveProperty('byType');
      expect(response.body.data.stats.totalFiles).toBe(3);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on media upload', async () => {
      // Upload many files quickly to trigger rate limiting
      const promises = [];
      
      for (let i = 0; i < 20; i++) {
        const buffer = Buffer.from(`fake-image-data-${i}`);
        promises.push(
          request(app)
            .post('/api/v1/media/upload')
            .set('Authorization', `Bearer ${accessToken}`)
            .attach('file', buffer, `test-image-${i}.jpg`)
            .field('mediaType', 'IMAGE')
        );
      }

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });

  describe('File Type Validation', () => {
    it('should accept valid image file types', async () => {
      const validImageTypes = ['jpg', 'png', 'gif', 'webp'];
      
      for (const type of validImageTypes) {
        const buffer = Buffer.from('fake-image-data');
        const response = await request(app)
          .post('/api/v1/media/upload')
          .set('Authorization', `Bearer ${accessToken}`)
          .attach('file', buffer, `test.${type}`)
          .field('mediaType', 'IMAGE');

        expect(response.status).toBe(201);
      }
    });

    it('should reject invalid file types for images', async () => {
      const buffer = Buffer.from('fake-data');
      const response = await request(app)
        .post('/api/v1/media/upload')
        .set('Authorization', `Bearer ${accessToken}`)
        .attach('file', buffer, 'test.exe')
        .field('mediaType', 'IMAGE');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});