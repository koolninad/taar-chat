import { Router } from 'express';
import * as groupController from '../controllers/group.controller';
import { validate, groupSchemas } from '../middleware/validation.middleware';
import { authenticateToken, createRateLimit } from '../middleware/auth.middleware';

const router = Router();

// All group routes require authentication except invite info
router.use(authenticateToken);

/**
 * @swagger
 * /api/v1/groups:
 *   post:
 *     summary: Create a new group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - memberIds
 *               - senderKeyDistribution
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *                 example: "My Awesome Group"
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: "A group for discussing awesome things"
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 255
 *                 example: ["uuid1", "uuid2", "uuid3"]
 *               senderKeyDistribution:
 *                 type: string
 *                 format: base64
 *                 description: Signal protocol sender key distribution
 *     responses:
 *       201:
 *         description: Group created successfully
 *       400:
 *         description: Invalid group data or member limit exceeded
 *       401:
 *         description: Authentication required
 */
router.post(
  '/',
  createRateLimit(3600000, 10, 'Too many group creations'), // 10 groups per hour
  validate(groupSchemas.createGroup),
  groupController.createGroup
);

/**
 * @swagger
 * /api/v1/groups/my:
 *   get:
 *     summary: Get user's groups
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User groups retrieved successfully
 *       401:
 *         description: Authentication required
 */
router.get('/my', groupController.getUserGroups);

/**
 * @swagger
 * /api/v1/groups/join/{inviteCode}:
 *   post:
 *     summary: Join group via invite code
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: inviteCode
 *         required: true
 *         schema:
 *           type: string
 *         description: Group invite code
 *     responses:
 *       200:
 *         description: Successfully joined the group
 *       400:
 *         description: Already a member or group is full
 *       404:
 *         description: Invalid or expired invite link
 *       401:
 *         description: Authentication required
 */
router.post(
  '/join/:inviteCode',
  createRateLimit(300000, 5, 'Too many join attempts'), // 5 joins per 5 minutes
  groupController.joinGroupByInvite
);

/**
 * @swagger
 * /api/v1/groups/{groupId}:
 *   get:
 *     summary: Get group details
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Group details retrieved successfully
 *       403:
 *         description: Not a member of this group
 *       404:
 *         description: Group not found
 *       401:
 *         description: Authentication required
 */
router.get('/:groupId', groupController.getGroupDetails);

/**
 * @swagger
 * /api/v1/groups/{groupId}:
 *   put:
 *     summary: Update group information
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 255
 *               description:
 *                 type: string
 *                 maxLength: 500
 *               avatarUrl:
 *                 type: string
 *                 format: uri
 *     responses:
 *       200:
 *         description: Group updated successfully
 *       403:
 *         description: Admin permission required
 *       404:
 *         description: Group not found
 *       401:
 *         description: Authentication required
 */
router.put(
  '/:groupId',
  validate(groupSchemas.updateGroup),
  groupController.updateGroup
);

/**
 * @swagger
 * /api/v1/groups/{groupId}/members:
 *   get:
 *     summary: Get group members
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Group members retrieved successfully
 *       403:
 *         description: Not a member of this group
 *       404:
 *         description: Group not found
 *       401:
 *         description: Authentication required
 */
router.get('/:groupId/members', groupController.getGroupMembers);

/**
 * @swagger
 * /api/v1/groups/{groupId}/members:
 *   post:
 *     summary: Add members to group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - memberIds
 *               - senderKeyDistribution
 *             properties:
 *               memberIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 minItems: 1
 *                 maxItems: 50
 *               senderKeyDistribution:
 *                 type: string
 *                 format: base64
 *     responses:
 *       200:
 *         description: Members added successfully
 *       400:
 *         description: Invalid member data or limit exceeded
 *       403:
 *         description: Admin permission required
 *       404:
 *         description: Group not found
 *       401:
 *         description: Authentication required
 */
router.post(
  '/:groupId/members',
  createRateLimit(300000, 10, 'Too many member additions'), // 10 additions per 5 minutes
  validate(groupSchemas.addMembers),
  groupController.addMembers
);

/**
 * @swagger
 * /api/v1/groups/{groupId}/members/{memberId}:
 *   delete:
 *     summary: Remove member from group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Member removed successfully
 *       403:
 *         description: Admin permission required or cannot remove creator
 *       404:
 *         description: Group or member not found
 *       401:
 *         description: Authentication required
 */
router.delete(
  '/:groupId/members/:memberId',
  validate(groupSchemas.removeMember),
  groupController.removeMember
);

/**
 * @swagger
 * /api/v1/groups/{groupId}/members/{memberId}/role:
 *   patch:
 *     summary: Update member role
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: memberId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [ADMIN, MEMBER]
 *     responses:
 *       200:
 *         description: Member role updated successfully
 *       403:
 *         description: Admin permission required or cannot change creator role
 *       404:
 *         description: Group or member not found
 *       401:
 *         description: Authentication required
 */
router.patch(
  '/:groupId/members/:memberId/role',
  validate(groupSchemas.updateMemberRole),
  groupController.updateMemberRole
);

/**
 * @swagger
 * /api/v1/groups/{groupId}/leave:
 *   post:
 *     summary: Leave group
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Successfully left the group
 *       403:
 *         description: Not a member of this group
 *       404:
 *         description: Group not found
 *       401:
 *         description: Authentication required
 */
router.post(
  '/:groupId/leave',
  validate(groupSchemas.leaveGroup),
  groupController.leaveGroup
);

/**
 * @swagger
 * /api/v1/groups/{groupId}/invite:
 *   post:
 *     summary: Generate new invite link
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Invite link generated successfully
 *       403:
 *         description: Admin permission required
 *       404:
 *         description: Group not found
 *       401:
 *         description: Authentication required
 */
router.post(
  '/:groupId/invite',
  createRateLimit(300000, 5, 'Too many invite generations'), // 5 generations per 5 minutes
  groupController.generateInviteLink
);

/**
 * @swagger
 * /api/v1/groups/{groupId}/stats:
 *   get:
 *     summary: Get group statistics
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Group statistics retrieved successfully
 *       403:
 *         description: Not a member of this group
 *       404:
 *         description: Group not found
 *       401:
 *         description: Authentication required
 */
router.get('/:groupId/stats', groupController.getGroupStats);

/**
 * @swagger
 * /api/v1/groups/{groupId}/mute:
 *   patch:
 *     summary: Mute or unmute group notifications
 *     tags: [Groups]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isMuted
 *             properties:
 *               isMuted:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Group mute status updated successfully
 *       403:
 *         description: Not a member of this group
 *       404:
 *         description: Group not found
 *       401:
 *         description: Authentication required
 */
router.patch('/:groupId/mute', groupController.toggleGroupMute);

export { router as groupRoutes };