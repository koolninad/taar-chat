import request from 'supertest';
import express from 'express';
import { authRoutes } from '@/routes/auth.routes';
import { groupRoutes } from '@/routes/group.routes';
import { DatabaseService } from '@/services/database.service';
import { RedisService } from '@/services/redis.service';
import { errorHandler } from '@/middleware/errorHandler';

describe('Group Management API', () => {
  let app: express.Application;
  let adminToken: string;
  let adminUserId: string;
  let memberToken: string;
  let memberUserId: string;
  let nonMemberToken: string;
  let nonMemberUserId: string;
  let groupId: string;

  beforeAll(async () => {
    // Create test app
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use('/api/v1/groups', groupRoutes);
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

    // Create admin user
    await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phoneNumber: '9876543210', countryCode: '+91' });

    await RedisService.setOtp('+919876543210', '123456');

    const adminResponse = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        phoneNumber: '9876543210',
        countryCode: '+91',
        otpCode: '123456',
        userInfo: {
          name: 'Admin User',
          identityKey: 'mock-identity-key-admin'
        }
      });

    adminToken = adminResponse.body.data.tokens.accessToken;
    adminUserId = adminResponse.body.data.user.id;

    // Create member user
    await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phoneNumber: '9876543211', countryCode: '+91' });

    await RedisService.setOtp('+919876543211', '123456');

    const memberResponse = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        phoneNumber: '9876543211',
        countryCode: '+91',
        otpCode: '123456',
        userInfo: {
          name: 'Member User',
          identityKey: 'mock-identity-key-member'
        }
      });

    memberToken = memberResponse.body.data.tokens.accessToken;
    memberUserId = memberResponse.body.data.user.id;

    // Create non-member user
    await request(app)
      .post('/api/v1/auth/send-otp')
      .send({ phoneNumber: '9876543212', countryCode: '+91' });

    await RedisService.setOtp('+919876543212', '123456');

    const nonMemberResponse = await request(app)
      .post('/api/v1/auth/verify-otp')
      .send({
        phoneNumber: '9876543212',
        countryCode: '+91',
        otpCode: '123456',
        userInfo: {
          name: 'Non Member User',
          identityKey: 'mock-identity-key-nonmember'
        }
      });

    nonMemberToken = nonMemberResponse.body.data.tokens.accessToken;
    nonMemberUserId = nonMemberResponse.body.data.user.id;

    // Create a test group
    const groupResponse = await request(app)
      .post('/api/v1/groups')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Group',
        description: 'A test group for API testing'
      });

    groupId = groupResponse.body.data.group.id;
  });

  describe('POST /api/v1/groups', () => {
    it('should create a new group', async () => {
      const response = await request(app)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'New Test Group',
          description: 'Another test group'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('group');
      expect(response.body.data.group.name).toBe('New Test Group');
      expect(response.body.data.group.createdBy).toBe(adminUserId);
    });

    it('should validate group name', async () => {
      const response = await request(app)
        .post('/api/v1/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: '', // Empty name
          description: 'Test group'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      const response = await request(app)
        .post('/api/v1/groups')
        .send({
          name: 'Test Group',
          description: 'Test description'
        });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/groups', () => {
    it('should get user groups', async () => {
      const response = await request(app)
        .get('/api/v1/groups')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('groups');
      expect(Array.isArray(response.body.data.groups)).toBe(true);
      expect(response.body.data.groups.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get('/api/v1/groups')
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('pagination');
    });
  });

  describe('GET /api/v1/groups/:groupId', () => {
    it('should get group details for admin', async () => {
      const response = await request(app)
        .get(`/api/v1/groups/${groupId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('group');
      expect(response.body.data.group.id).toBe(groupId);
      expect(response.body.data.group.name).toBe('Test Group');
    });

    it('should return 404 for non-existent group', async () => {
      const fakeGroupId = '12345678-1234-1234-1234-123456789012';
      const response = await request(app)
        .get(`/api/v1/groups/${fakeGroupId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should return 403 for non-member access', async () => {
      const response = await request(app)
        .get(`/api/v1/groups/${groupId}`)
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/groups/:groupId', () => {
    it('should update group details by admin', async () => {
      const response = await request(app)
        .put(`/api/v1/groups/${groupId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'Updated Test Group',
          description: 'Updated description'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.group.name).toBe('Updated Test Group');
    });

    it('should not allow non-admin to update group', async () => {
      // First add member to group
      await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId });

      const response = await request(app)
        .put(`/api/v1/groups/${groupId}`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          name: 'Hacked Group Name'
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/groups/:groupId', () => {
    it('should delete group by admin', async () => {
      const response = await request(app)
        .delete(`/api/v1/groups/${groupId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow non-admin to delete group', async () => {
      // Add member to group first
      await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId });

      const response = await request(app)
        .delete(`/api/v1/groups/${groupId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/groups/:groupId/members', () => {
    beforeEach(async () => {
      // Add a member to the group
      await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId });
    });

    it('should get group members', async () => {
      const response = await request(app)
        .get(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('members');
      expect(Array.isArray(response.body.data.members)).toBe(true);
      expect(response.body.data.members.length).toBeGreaterThan(0);
    });

    it('should support pagination', async () => {
      const response = await request(app)
        .get(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .query({ page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('pagination');
    });
  });

  describe('POST /api/v1/groups/:groupId/members', () => {
    it('should add member to group by admin', async () => {
      const response = await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('member');
      expect(response.body.data.member.userId).toBe(memberUserId);
    });

    it('should not allow duplicate members', async () => {
      // Add member first time
      await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId });

      // Try to add same member again
      const response = await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId });

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
    });

    it('should not allow non-admin to add members', async () => {
      const response = await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({ userId: memberUserId });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('DELETE /api/v1/groups/:groupId/members/:userId', () => {
    beforeEach(async () => {
      // Add member first
      await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId });
    });

    it('should remove member by admin', async () => {
      const response = await request(app)
        .delete(`/api/v1/groups/${groupId}/members/${memberUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should allow member to leave group', async () => {
      const response = await request(app)
        .delete(`/api/v1/groups/${groupId}/members/${memberUserId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should not allow non-admin to remove others', async () => {
      const response = await request(app)
        .delete(`/api/v1/groups/${groupId}/members/${adminUserId}`)
        .set('Authorization', `Bearer ${memberToken}`);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/groups/:groupId/members/:userId/role', () => {
    beforeEach(async () => {
      // Add member first
      await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId });
    });

    it('should update member role by admin', async () => {
      const response = await request(app)
        .put(`/api/v1/groups/${groupId}/members/${memberUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'MODERATOR' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.member.role).toBe('MODERATOR');
    });

    it('should not allow non-admin to change roles', async () => {
      const response = await request(app)
        .put(`/api/v1/groups/${groupId}/members/${adminUserId}/role`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({ role: 'MEMBER' });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });

    it('should validate role values', async () => {
      const response = await request(app)
        .put(`/api/v1/groups/${groupId}/members/${memberUserId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'INVALID_ROLE' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/groups/:groupId/invite', () => {
    it('should generate invite link by admin', async () => {
      const response = await request(app)
        .post(`/api/v1/groups/${groupId}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ expiresIn: 3600 });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('inviteLink');
      expect(response.body.data).toHaveProperty('expiresAt');
    });

    it('should not allow non-admin to create invite', async () => {
      const response = await request(app)
        .post(`/api/v1/groups/${groupId}/invite`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .send({ expiresIn: 3600 });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/groups/join/:inviteCode', () => {
    let inviteCode: string;

    beforeEach(async () => {
      // Create invite link
      const inviteResponse = await request(app)
        .post(`/api/v1/groups/${groupId}/invite`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ expiresIn: 3600 });

      // Extract invite code from the invite link
      const inviteLink = inviteResponse.body.data.inviteLink;
      inviteCode = inviteLink.split('/').pop();
    });

    it('should join group with valid invite code', async () => {
      const response = await request(app)
        .post(`/api/v1/groups/join/${inviteCode}`)
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('membership');
    });

    it('should not allow joining with invalid invite code', async () => {
      const response = await request(app)
        .post('/api/v1/groups/join/invalid-code')
        .set('Authorization', `Bearer ${nonMemberToken}`);

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/groups/:groupId/messages', () => {
    it('should get group messages for members', async () => {
      // Add member to group first
      await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId });

      const response = await request(app)
        .get(`/api/v1/groups/${groupId}/messages`)
        .set('Authorization', `Bearer ${memberToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('messages');
      expect(response.body.data).toHaveProperty('pagination');
    });

    it('should not allow non-members to access messages', async () => {
      const response = await request(app)
        .get(`/api/v1/groups/${groupId}/messages`)
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .query({ page: 1, limit: 20 });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('PUT /api/v1/groups/:groupId/settings', () => {
    it('should update group settings by admin', async () => {
      const response = await request(app)
        .put(`/api/v1/groups/${groupId}/settings`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isPublic: false,
          allowMemberInvites: true,
          messageHistory: 'visible'
        });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('settings');
    });

    it('should not allow non-admin to change settings', async () => {
      // Add member first
      await request(app)
        .post(`/api/v1/groups/${groupId}/members`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ userId: memberUserId });

      const response = await request(app)
        .put(`/api/v1/groups/${groupId}/settings`)
        .set('Authorization', `Bearer ${memberToken}`)
        .send({
          isPublic: true
        });

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/v1/groups/search', () => {
    it('should search public groups', async () => {
      const response = await request(app)
        .get('/api/v1/groups/search')
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .query({ query: 'Test' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('groups');
      expect(Array.isArray(response.body.data.groups)).toBe(true);
    });

    it('should support pagination in search', async () => {
      const response = await request(app)
        .get('/api/v1/groups/search')
        .set('Authorization', `Bearer ${nonMemberToken}`)
        .query({ query: 'Test', page: 1, limit: 10 });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('pagination');
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits on group creation', async () => {
      // Create many groups quickly to trigger rate limiting
      const promises = [];
      
      for (let i = 0; i < 15; i++) {
        promises.push(
          request(app)
            .post('/api/v1/groups')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({
              name: `Rate Limit Test Group ${i}`,
              description: 'Test group for rate limiting'
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