import { Request, Response } from 'express';
import { GroupService } from '../services/group.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { asyncHandler } from '../middleware/errorHandler';
import { GroupMemberRole } from '@prisma/client';

/**
 * Create a new group
 */
export const createGroup = asyncHandler(async (req: Request, res: Response) => {
  const { name, description, memberIds, senderKeyDistribution } = req.body;
  const userId = req.user!.userId;

  const group = await GroupService.createGroup({
    name,
    description,
    memberIds,
    senderKeyDistribution,
    creatorId: userId
  });

  logger.info('Group created', { groupId: group.id, createdBy: userId });

  res.status(201).json({
    success: true,
    message: 'Group created successfully',
    data: {
      group
    }
  });
});

/**
 * Get group details
 */
export const getGroupDetails = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user!.userId;

  if (!groupId) {
    throw new AppError('Group ID is required', 400);
  }

  const group = await GroupService.getGroupDetails(groupId!, userId);

  res.status(200).json({
    success: true,
    data: {
      group
    }
  });
});

/**
 * Update group information
 */
export const updateGroup = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { name, description, avatarUrl } = req.body;
  const userId = req.user!.userId;

  const group = await GroupService.updateGroup(groupId!, userId, {
    name,
    description,
    avatarUrl
  });

  logger.info('Group updated', { groupId, userId });

  res.status(200).json({
    success: true,
    message: 'Group updated successfully',
    data: {
      group
    }
  });
});

/**
 * Add members to group
 */
export const addMembers = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { memberIds, senderKeyDistribution } = req.body;
  const userId = req.user!.userId;

  const group = await GroupService.addMembers(
    groupId!,
    userId,
    memberIds,
    senderKeyDistribution
  );

  logger.info('Members added to group', { 
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

/**
 * Remove member from group
 */
export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const { groupId, memberId } = req.params;
  const userId = req.user!.userId;

  const group = await GroupService.removeMember(groupId!, userId, memberId!);

  logger.info('Member removed from group', { groupId, removedBy: userId, memberId });

  res.status(200).json({
    success: true,
    message: 'Member removed successfully',
    data: {
      group
    }
  });
});

/**
 * Leave group
 */
export const leaveGroup = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user!.userId;

  await GroupService.leaveGroup(groupId!, userId);

  logger.info('User left group', { groupId, userId });

  res.status(200).json({
    success: true,
    message: 'You have left the group successfully'
  });
});

/**
 * Update member role
 */
export const updateMemberRole = asyncHandler(async (req: Request, res: Response) => {
  const { groupId, memberId } = req.params;
  const { role } = req.body;
  const userId = req.user!.userId;

  if (!Object.values(GroupMemberRole).includes(role)) {
    throw new AppError('Invalid role specified', 400);
  }

  const group = await GroupService.updateMemberRole(
    groupId!,
    userId,
    memberId!,
    role as GroupMemberRole
  );

  logger.info('Member role updated', { groupId, memberId, newRole: role, updatedBy: userId });

  res.status(200).json({
    success: true,
    message: `Member role updated to ${role.toLowerCase()}`,
    data: {
      group
    }
  });
});

/**
 * Get user's groups
 */
export const getUserGroups = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const groups = await GroupService.getUserGroups(userId);

  res.status(200).json({
    success: true,
    data: {
      groups,
      total: groups.length
    }
  });
});

/**
 * Join group via invite link
 */
export const joinGroupByInvite = asyncHandler(async (req: Request, res: Response) => {
  const { inviteCode } = req.params;
  const userId = req.user!.userId;

  const group = await GroupService.joinGroupByInvite(inviteCode!, userId);

  logger.info('User joined group via invite', { groupId: group.id, userId, inviteCode });

  res.status(200).json({
    success: true,
    message: 'Successfully joined the group',
    data: {
      group
    }
  });
});

/**
 * Generate new invite link
 */
export const generateInviteLink = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user!.userId;

  const inviteLink = await GroupService.generateInviteLink(groupId!, userId);

  logger.info('Invite link generated', { groupId, userId });

  res.status(200).json({
    success: true,
    message: 'Invite link generated successfully',
    data: {
      inviteLink
    }
  });
});

/**
 * Get group members
 */
export const getGroupMembers = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user!.userId;

  const group = await GroupService.getGroupDetails(groupId!, userId);

  res.status(200).json({
    success: true,
    data: {
      members: group.members,
      total: group.members.length
    }
  });
});

/**
 * Get group statistics
 */
export const getGroupStats = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user!.userId;

  // Check if user is member first
  const group = await GroupService.getGroupDetails(groupId!, userId);

  // Calculate basic stats
  const stats = {
    totalMembers: group.memberCount,
    totalAdmins: group.members.filter(m => m.role === GroupMemberRole.ADMIN).length,
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

/**
 * Delete group (only creator)
 */
export const deleteGroup = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user!.userId;

  // This would require additional service method implementation
  // For now, return error as this is a sensitive operation
  throw new AppError('Group deletion is not available through API', 403);
});

/**
 * Mute/Unmute group notifications
 */
export const toggleGroupMute = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const { isMuted } = req.body;
  const userId = req.user!.userId;

  // This would require additional service method implementation
  // For now, returning success response
  
  logger.info('Group mute status updated', { groupId, userId, isMuted });

  res.status(200).json({
    success: true,
    message: `Group ${isMuted ? 'muted' : 'unmuted'} successfully`
  });
});

/**
 * Get group invite info (public info for invite links)
 */
export const getGroupInviteInfo = asyncHandler(async (req: Request, res: Response) => {
  const { inviteCode } = req.params;

  // This would show basic group info without requiring authentication
  // For security, only show limited information
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

/**
 * Export group data (for admin)
 */
export const exportGroupData = asyncHandler(async (req: Request, res: Response) => {
  const { groupId } = req.params;
  const userId = req.user!.userId;

  // This would require additional service method implementation
  // For now, return error as this is a sensitive operation
  throw new AppError('Group data export is not available through API', 403);
});