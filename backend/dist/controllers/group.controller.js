"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportGroupData = exports.getGroupInviteInfo = exports.toggleGroupMute = exports.deleteGroup = exports.getGroupStats = exports.getGroupMembers = exports.generateInviteLink = exports.joinGroupByInvite = exports.getUserGroups = exports.updateMemberRole = exports.leaveGroup = exports.removeMember = exports.addMembers = exports.updateGroup = exports.getGroupDetails = exports.createGroup = void 0;
const group_service_1 = require("../services/group.service");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const errorHandler_1 = require("../middleware/errorHandler");
const client_1 = require("@prisma/client");
exports.createGroup = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { name, description, memberIds, senderKeyDistribution } = req.body;
    const userId = req.user.userId;
    const group = await group_service_1.GroupService.createGroup({
        name,
        description,
        memberIds,
        senderKeyDistribution,
        creatorId: userId
    });
    logger_1.logger.info('Group created', { groupId: group.id, createdBy: userId });
    res.status(201).json({
        success: true,
        message: 'Group created successfully',
        data: {
            group
        }
    });
});
exports.getGroupDetails = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.userId;
    if (!groupId) {
        throw new errors_1.AppError('Group ID is required', 400);
    }
    const group = await group_service_1.GroupService.getGroupDetails(groupId, userId);
    res.status(200).json({
        success: true,
        data: {
            group
        }
    });
});
exports.updateGroup = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { groupId } = req.params;
    const { name, description, avatarUrl } = req.body;
    const userId = req.user.userId;
    const group = await group_service_1.GroupService.updateGroup(groupId, userId, {
        name,
        description,
        avatarUrl
    });
    logger_1.logger.info('Group updated', { groupId, userId });
    res.status(200).json({
        success: true,
        message: 'Group updated successfully',
        data: {
            group
        }
    });
});
exports.addMembers = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { groupId } = req.params;
    const { memberIds, senderKeyDistribution } = req.body;
    const userId = req.user.userId;
    const group = await group_service_1.GroupService.addMembers(groupId, userId, memberIds, senderKeyDistribution);
    logger_1.logger.info('Members added to group', {
        groupId,
        addedBy: userId,
        memberCount: memberIds.length
    });
    res.status(200).json({
        success: true,
        message: `${memberIds.length} member(s) added successfully`,
        data: {
            group
        }
    });
});
exports.removeMember = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { groupId, memberId } = req.params;
    const userId = req.user.userId;
    const group = await group_service_1.GroupService.removeMember(groupId, userId, memberId);
    logger_1.logger.info('Member removed from group', { groupId, removedBy: userId, memberId });
    res.status(200).json({
        success: true,
        message: 'Member removed successfully',
        data: {
            group
        }
    });
});
exports.leaveGroup = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.userId;
    await group_service_1.GroupService.leaveGroup(groupId, userId);
    logger_1.logger.info('User left group', { groupId, userId });
    res.status(200).json({
        success: true,
        message: 'You have left the group successfully'
    });
});
exports.updateMemberRole = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { groupId, memberId } = req.params;
    const { role } = req.body;
    const userId = req.user.userId;
    if (!Object.values(client_1.GroupMemberRole).includes(role)) {
        throw new errors_1.AppError('Invalid role specified', 400);
    }
    const group = await group_service_1.GroupService.updateMemberRole(groupId, userId, memberId, role);
    logger_1.logger.info('Member role updated', { groupId, memberId, newRole: role, updatedBy: userId });
    res.status(200).json({
        success: true,
        message: `Member role updated to ${role.toLowerCase()}`,
        data: {
            group
        }
    });
});
exports.getUserGroups = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const groups = await group_service_1.GroupService.getUserGroups(userId);
    res.status(200).json({
        success: true,
        data: {
            groups,
            total: groups.length
        }
    });
});
exports.joinGroupByInvite = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { inviteCode } = req.params;
    const userId = req.user.userId;
    const group = await group_service_1.GroupService.joinGroupByInvite(inviteCode, userId);
    logger_1.logger.info('User joined group via invite', { groupId: group.id, userId, inviteCode });
    res.status(200).json({
        success: true,
        message: 'Successfully joined the group',
        data: {
            group
        }
    });
});
exports.generateInviteLink = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.userId;
    const inviteLink = await group_service_1.GroupService.generateInviteLink(groupId, userId);
    logger_1.logger.info('Invite link generated', { groupId, userId });
    res.status(200).json({
        success: true,
        message: 'Invite link generated successfully',
        data: {
            inviteLink
        }
    });
});
exports.getGroupMembers = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.userId;
    const group = await group_service_1.GroupService.getGroupDetails(groupId, userId);
    res.status(200).json({
        success: true,
        data: {
            members: group.members,
            total: group.members.length
        }
    });
});
exports.getGroupStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.userId;
    const group = await group_service_1.GroupService.getGroupDetails(groupId, userId);
    const stats = {
        totalMembers: group.memberCount,
        totalAdmins: group.members.filter(m => m.role === client_1.GroupMemberRole.ADMIN).length,
        onlineMembers: group.members.filter(m => m.user.isOnline).length,
        createdAt: group.createdAt,
        daysSinceCreation: Math.floor((Date.now() - group.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    };
    res.status(200).json({
        success: true,
        data: {
            stats
        }
    });
});
exports.deleteGroup = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.userId;
    throw new errors_1.AppError('Group deletion is not available through API', 403);
});
exports.toggleGroupMute = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { groupId } = req.params;
    const { isMuted } = req.body;
    const userId = req.user.userId;
    logger_1.logger.info('Group mute status updated', { groupId, userId, isMuted });
    res.status(200).json({
        success: true,
        message: `Group ${isMuted ? 'muted' : 'unmuted'} successfully`
    });
});
exports.getGroupInviteInfo = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { inviteCode } = req.params;
    const groupInfo = {
        name: 'Sample Group',
        memberCount: 42,
        description: 'Join us for great conversations!'
    };
    res.status(200).json({
        success: true,
        data: {
            groupInfo,
            inviteCode
        }
    });
});
exports.exportGroupData = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { groupId } = req.params;
    const userId = req.user.userId;
    throw new errors_1.AppError('Group data export is not available through API', 403);
});
//# sourceMappingURL=group.controller.js.map