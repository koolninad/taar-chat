import request from 'supertest';
import express from 'express';
import { authRoutes } from '@/routes/auth.routes';
import { DatabaseService } from '@/services/database.service';
import { RedisService } from '@/services/redis.service';
import { errorHandler } from '@/middleware/errorHandler';

describe('Authentication API', () => {
  let app: express.Application;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
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
  });

  describe('POST /api/v1/auth/send-otp', () => {
    it('should send OTP for valid phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({
          phoneNumber: '9876543210',
          countryCode: '+91'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('phoneNumber');
      expect(response.body.data).toHaveProperty('expiresIn', 300);
    });

    it('should reject invalid phone number', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({
          phoneNumber: '123',
          countryCode: '+91'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject invalid country code', async () => {
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({
          phoneNumber: '9876543210',
          countryCode: '91' // Missing +
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should enforce rate limiting', async () => {
      const phoneNumber = '9876543210';
      const countryCode = '+91';

      // Send 3 OTPs (should work)
      for (let i = 0; i < 3; i++) {
        const response = await request(app)
          .post('/api/v1/auth/send-otp')
          .send({ phoneNumber, countryCode });
        expect(response.status).toBe(200);
      }

      // 4th request should be rate limited
      const response = await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phoneNumber, countryCode });

      expect(response.status).toBe(429);
    });
  });

  describe('POST /api/v1/auth/verify-otp', () => {
    let phoneNumber: string;
    let countryCode: string;

    beforeEach(async () => {
      phoneNumber = '9876543210';
      countryCode = '+91';

      // Send OTP first
      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phoneNumber, countryCode });

      // Set a known OTP in Redis for testing
      await RedisService.setOtp(`${countryCode}${phoneNumber}`, '123456');
    });

    it('should verify OTP and create new user', async () => {
      const response = await request(app)
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

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data).toHaveProperty('isNewUser', true);
      expect(response.body.data.user.name).toBe('Test User');
    });

    it('should verify OTP and login existing user', async () => {
      // Create user first
      await request(app)
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

      // Send OTP again
      await request(app)
        .post('/api/v1/auth/send-otp')
        .send({ phoneNumber, countryCode });

      await RedisService.setOtp(`${countryCode}${phoneNumber}`, '654321');

      // Login with new OTP
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phoneNumber,
          countryCode,
          otpCode: '654321'
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('isNewUser', false);
    });

    it('should reject invalid OTP', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phoneNumber,
          countryCode,
          otpCode: '999999'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should reject expired OTP', async () => {
      // Clear the OTP to simulate expiration
      await RedisService.deleteOtp(`${countryCode}${phoneNumber}`);

      const response = await request(app)
        .post('/api/v1/auth/verify-otp')
        .send({
          phoneNumber,
          countryCode,
          otpCode: '123456'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      // Create user and get tokens
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

      refreshToken = loginResponse.body.data.tokens.refreshToken;
    });

    it('should refresh access token with valid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('tokens');
      expect(response.body.data.tokens).toHaveProperty('accessToken');
      expect(response.body.data.tokens).toHaveProperty('refreshToken');
    });

    it('should reject invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'invalid-token' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Protected Routes', () => {
    let accessToken: string;
    let userId: string;

    beforeEach(async () => {
      // Create user and get access token
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

    describe('GET /api/v1/auth/profile', () => {
      it('should get user profile with valid token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('user');
        expect(response.body.data.user.name).toBe('Test User');
      });

      it('should reject request without token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/profile');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });

      it('should reject request with invalid token', async () => {
        const response = await request(app)
          .get('/api/v1/auth/profile')
          .set('Authorization', 'Bearer invalid-token');

        expect(response.status).toBe(401);
        expect(response.body.success).toBe(false);
      });
    });

    describe('PUT /api/v1/auth/profile', () => {
      it('should update user profile', async () => {
        const response = await request(app)
          .put('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: 'Updated Name',
            about: 'Updated about'
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.name).toBe('Updated Name');
        expect(response.body.data.user.about).toBe('Updated about');
      });

      it('should validate profile updates', async () => {
        const response = await request(app)
          .put('/api/v1/auth/profile')
          .set('Authorization', `Bearer ${accessToken}`)
          .send({
            name: '', // Invalid: empty name
          });

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      });
    });

    describe('POST /api/v1/auth/logout', () => {
      it('should logout user', async () => {
        const response = await request(app)
          .post('/api/v1/auth/logout')
          .set('Authorization', `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });
});