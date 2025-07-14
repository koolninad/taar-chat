import request from 'supertest';
import express from 'express';
import { signalRoutes } from '@/routes/signal.routes';
import { authRoutes } from '@/routes/auth.routes';
import { DatabaseService } from '@/services/database.service';
import { RedisService } from '@/services/redis.service';
import { errorHandler } from '@/middleware/errorHandler';

describe('Signal Protocol API', () => {
  let app: express.Application;
  let accessToken: string;
  let userId: string;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/signal', signalRoutes);
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

    // Create authenticated user for testing
    const phoneNumber = '9876543210';
    const countryCode = '+91';

    await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phoneNumber, countryCode });

    await RedisService.setOtp(`${countryCode}${phoneNumber}`, '123456');

    const loginResponse = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        phoneNumber,
        countryCode,
        otpCode: '123456',
        userInfo: {
          name: 'Test User',
          identityKey: 'mock-identity-key'
        }
      });

    accessToken = loginResponse.body.data.tokens.accessToken;
    userId = loginResponse.body.data.user.id;
  });

  describe('POST /api/v1/signal/init', () => {
    it('should initialize Signal Protocol for user', async () => {
      const response = await request(app)
        .post('/api/v1/signal/init')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('identity');
      expect(response.body.data.identity).toHaveProperty('identityKey');
      expect(response.body.data.identity).toHaveProperty('registrationId');
      expect(response.body.data.identity).toHaveProperty('deviceId', 1);
    });

    it('should return existing identity if already initialized', async () => {
      // Initialize first time
      await request(app)
        .post('/api/v1/signal/init')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1 });

      // Initialize second time
      const response = await request(app)
        .post('/api/v1/signal/init')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/signal/init')
        .send({ deviceId: 1 });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/signal/prekeys', () => {
    beforeEach(async () => {
      // Initialize Signal Protocol first
      await request(app)
        .post('/api/v1/signal/init')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1 });
    });

    it('should generate prekeys', async () => {
      const response = await request(app)
        .post('/api/v1/signal/prekeys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1, count: 50 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('50 prekeys generated');
    });

    it('should limit prekey count', async () => {
      const response = await request(app)
        .post('/api/v1/signal/prekeys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1, count: 2000 }); // Exceeds limit

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should use default count if not provided', async () => {
      const response = await request(app)
        .post('/api/v1/signal/prekeys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/signal/prekeys/my', () => {
    beforeEach(async () => {
      // Initialize Signal Protocol and generate prekeys
      await request(app)
        .post('/api/v1/signal/init')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1 });

      await request(app)
        .post('/api/v1/signal/prekeys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1, count: 10 });
    });

    it('should get own prekey bundle', async () => {
      const response = await request(app)
        .get('/api/v1/signal/prekeys/my')
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ deviceId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('preKeyBundle');
      expect(response.body.data.preKeyBundle).toHaveProperty('identityKey');
      expect(response.body.data.preKeyBundle).toHaveProperty('preKey');
      expect(response.body.data.preKeyBundle).toHaveProperty('signedPreKey');
    });
  });

  describe('GET /api/v1/signal/prekeys/:userId', () => {
    let secondUserId: string;
    let secondAccessToken: string;

    beforeEach(async () => {
      // Create second user
      const phoneNumber = '9876543211';
      const countryCode = '+91';

      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phoneNumber, countryCode });

      await RedisService.setOtp(`${countryCode}${phoneNumber}`, '123456');

      const secondUserResponse = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phoneNumber,
          countryCode,
          otpCode: '123456',
          userInfo: {
            name: 'Second User',
            identityKey: 'mock-identity-key-2'
          }
        });

      secondUserId = secondUserResponse.body.data.user.id;
      secondAccessToken = secondUserResponse.body.data.tokens.accessToken;

      // Initialize Signal Protocol for second user
      await request(app)
        .post('/api/v1/signal/init')
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .send({ deviceId: 1 });

      await request(app)
        .post('/api/v1/signal/prekeys')
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .send({ deviceId: 1, count: 10 });
    });

    it('should get another user\'s prekey bundle', async () => {
      const response = await request(app)
        .get(`/api/v1/signal/prekeys/${secondUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ deviceId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('preKeyBundle');
    });

    it('should return 404 for non-existent user', async () => {
      const fakeUserId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .get(`/api/v1/signal/prekeys/${fakeUserId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .query({ deviceId: 1 });

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/signal/signed-prekey/rotate', () => {
    beforeEach(async () => {
      // Initialize Signal Protocol first
      await request(app)
        .post('/api/v1/signal/init')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1 });
    });

    it('should rotate signed prekey', async () => {
      const response = await request(app)
        .post('/api/v1/signal/signed-prekey/rotate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rotated successfully');
    });
  });

  describe('GET /api/v1/signal/sessions', () => {
    beforeEach(async () => {
      // Initialize Signal Protocol first
      await request(app)
        .post('/api/v1/signal/init')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1 });
    });

    it('should get user sessions', async () => {
      const response = await request(app)
        .get('/api/v1/signal/sessions')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('sessions');
      expect(response.body.data).toHaveProperty('total');
      expect(Array.isArray(response.body.data.sessions)).toBe(true);
    });
  });

  describe('GET /api/v1/signal/fingerprint/:userId', () => {
    let secondUserId: string;

    beforeEach(async () => {
      // Create second user
      const phoneNumber = '9876543211';
      const countryCode = '+91';

      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phoneNumber, countryCode });

      await RedisService.setOtp(`${countryCode}${phoneNumber}`, '123456');

      const secondUserResponse = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phoneNumber,
          countryCode,
          otpCode: '123456',
          userInfo: {
            name: 'Second User',
            identityKey: 'mock-identity-key-2'
          }
        });

      secondUserId = secondUserResponse.body.data.user.id;
    });

    it('should generate fingerprint for verification', async () => {
      const response = await request(app)
        .get(`/api/v1/signal/fingerprint/${secondUserId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('fingerprint');
      expect(response.body.data).toHaveProperty('localUserId', userId);
      expect(response.body.data).toHaveProperty('remoteUserId', secondUserId);
      expect(typeof response.body.data.fingerprint).toBe('string');
    });
  });

  describe('POST /api/v1/signal/encrypt', () => {
    let secondUserId: string;
    let secondAccessToken: string;

    beforeEach(async () => {
      // Initialize Signal Protocol for first user
      await request(app)
        .post('/api/v1/signal/init')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1 });

      // Create and initialize second user
      const phoneNumber = '9876543211';
      const countryCode = '+91';

      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phoneNumber, countryCode });

      await RedisService.setOtp(`${countryCode}${phoneNumber}`, '123456');

      const secondUserResponse = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phoneNumber,
          countryCode,
          otpCode: '123456',
          userInfo: {
            name: 'Second User',
            identityKey: 'mock-identity-key-2'
          }
        });

      secondUserId = secondUserResponse.body.data.user.id;
      secondAccessToken = secondUserResponse.body.data.tokens.accessToken;

      await request(app)
        .post('/api/v1/signal/init')
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .send({ deviceId: 1 });

      await request(app)
        .post('/api/v1/signal/prekeys')
        .set('Authorization', `Bearer ${secondAccessToken}`)
        .send({ deviceId: 1, count: 10 });
    });

    it('should encrypt direct message', async () => {
      const response = await request(app)
        .post('/api/v1/signal/encrypt')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          recipientId: secondUserId,
          message: 'Hello, this is a test message!',
          deviceId: 1
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('encryptedMessage');
      expect(response.body.data).toHaveProperty('messageType', 'direct');
    });

    it('should require either recipientId or groupId', async () => {
      const response = await request(app)
        .post('/api/v1/signal/encrypt')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          message: 'Hello, this is a test message!',
          deviceId: 1
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should not allow both recipientId and groupId', async () => {
      const response = await request(app)
        .post('/api/v1/signal/encrypt')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          recipientId: secondUserId,
          groupId: 'some-group-id',
          message: 'Hello, this is a test message!',
          deviceId: 1
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/signal/health', () => {
    it('should return Signal Protocol health status', async () => {
      const response = await request(app)
        .get('/api/v1/signal/health')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('signalProtocol');
      expect(response.body.data).toHaveProperty('keyGeneration');
      expect(response.body.data).toHaveProperty('encryption');
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(async () => {
      // Initialize Signal Protocol first
      await request(app)
        .post('/api/v1/signal/init')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1 });
    });

    it('should enforce rate limits on prekey generation', async () => {
      // Generate prekeys multiple times to hit rate limit
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post('/api/v1/signal/prekeys')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({ deviceId: 1, count: 1 });
      }

      // Next request should be rate limited
      const response = await request(app)
        .post('/api/v1/signal/prekeys')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ deviceId: 1, count: 1 });

      expect(response.status).toBe(429);
    });
  });
});