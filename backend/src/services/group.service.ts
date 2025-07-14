import { PrismaClient, GroupMemberRole } from '@prisma/client';
import { RedisService } from './redis.service';
import { AppError, ErrorMessages } from '../utils/errors';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CreateGroupRequest {
  name: string;
  description?: string;
  memberIds: string[];
  senderKeyDistribution: string;
  creatorId: string;
}

export interface GroupResponse {
  id: string;
  name: string;
  description?: string;
  avatarUrl?: string;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
  memberCount: number;
  isActive: boolean;
}

export interface GroupMemberResponse {
  id: string;
  userId: string;
  role: GroupMemberRole;
  joinedAt: Date;
  user: {
    id: string;
    name?: string;
    phoneNumber: string;
    avatarUrl?: string;
    isOnline: boolean;
    lastSeen?: Date;
  };
}

export interface GroupDetailResponse extends GroupResponse {
  members: GroupMemberResponse[];
  userRole?: GroupMemberRole;
  inviteLink?: string;
}

export class GroupService {
  /**
   * Create a new group
   */
  static async createGroup(groupData: CreateGroupRequest): Promise<GroupDetailResponse> {
    try {
      // Validate member count
      if (groupData.memberIds.length < 1) {
        throw new AppError('Group must have at least 1 member', 400);
      }

      if (groupData.memberIds.length > 255) {
        throw new AppError('Group cannot have more than 255 members', 400);
      }

      // Check if all members exist
      const members = await prisma.user.findMany({
        where: { id: { in: groupData.memberIds } },
        select: { id: true }
      });

      if (members.length !== groupData.memberIds.length) {
        throw new AppError('Some members not found', 400);
      }

      // Create group with transaction
      const group = await prisma.$transaction(async (tx) => {
        // Create group
        const newGroup = await tx.group.create({
          data: {
            name: groupData.name.trim(),
            description: groupData.description?.trim(),
            creatorId: groupData.creatorId,
            senderKeyDistribution: groupData.senderKeyDistribution ? Buffer.from(groupData.senderKeyDistribution, 'base64') : null
          }
        });

        // Add creator as admin
        await tx.groupMember.create({
          data: {
            groupId: newGroup.id,
            userId: groupData.creatorId,
            role: GroupMemberRole.ADMIN,
            joinedAt: new Date()
          }
        });

        // Add other members
        const memberData = groupData.memberIds
          .filter(id => id !== groupData.creatorId)
          .map(userId => ({
            groupId: newGroup.id,
            userId,
            role: GroupMemberRole.MEMBER,
            joinedAt: new Date()
          }));

        if (memberData.length > 0) {
          await tx.groupMember.createMany({
            data: memberData
          });
        }

        return newGroup;
      });

      logger.info('Group created', { 
        groupId: group.id, 
        creatorId: groupData.creatorId,
        memberCount: groupData.memberIds.length
      });

      return await this.getGroupDetails(group.id, groupData.creatorId);
    } catch (error) {
      logger.error('Error creating group:', error);
      throw error instanceof AppError ? error : new AppError('Failed to create group', 500);
    }
  }

  /**
   * Get group details
   */
  static async getGroupDetails(groupId: string, userId: string): Promise<GroupDetailResponse> {
    try {
      // Check if user is member
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId
          }
        }
      });

      if (!membership) {
        throw new AppError('You are not a member of this group', 403);
      }

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  phoneNumber: true,
                  avatarUrl: true,
                  isOnline: true,
                  lastSeen: true
                }
              }
            },
            orderBy: [
              { role: 'asc' }, // Admins first
              { joinedAt: 'asc' }
            ]
          },
          _count: {
            select: { members: true }
          }
        }
      });

      if (!group) {
        throw new AppError('Group not found', 404);
      }

      return {
        id: group.id,
        name: group.name,
        description: group.description || undefined,
        avatarUrl: group.avatarUrl || undefined,
        creatorId: group.creatorId,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt,
        memberCount: group._count.members,
        isActive: true,
        members: group.members.map(member => ({
          id: member.id,
          userId: member.userId,
          role: member.role,
          joinedAt: member.joinedAt,
          user: {
            ...member.user,
            name: member.user.name || undefined,
            avatarUrl: member.user.avatarUrl || undefined,
            lastSeen: member.user.lastSeen || undefined
          }
        })),
        userRole: membership.role,
        inviteLink: undefined
      };
    } catch (error) {
      logger.error('Error getting group details:', error);
      throw error instanceof AppError ? error : new AppError('Failed to get group details', 500);
    }
  }

  /**
   * Update group information
   */
  static async updateGroup(
    groupId: string,
    userId: string,
    updates: { name?: string; description?: string; avatarUrl?: string }
  ): Promise<GroupDetailResponse> {
    try {
      // Check if user is admin
      const membership = await this.checkAdminPermission(groupId, userId);

      const group = await prisma.group.update({
        where: { id: groupId },
        data: {
          ...(updates.name && { name: updates.name.trim() }),
          ...(updates.description !== undefined && { description: updates.description?.trim() }),
          ...(updates.avatarUrl !== undefined && { avatarUrl: updates.avatarUrl }),
          updatedAt: new Date()
        }
      });

      logger.info('Group updated', { groupId, userId, updates });

      return await this.getGroupDetails(groupId, userId);
    } catch (error) {
      logger.error('Error updating group:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update group', 500);
    }
  }

  /**
   * Add members to group
   */
  static async addMembers(
    groupId: string,
    userId: string,
    memberIds: string[],
    senderKeyDistribution: string
  ): Promise<GroupDetailResponse> {
    try {
      // Check if user is admin
      await this.checkAdminPermission(groupId, userId);

      if (memberIds.length === 0) {
        throw new AppError('No members to add', 400);
      }

      if (memberIds.length > 50) {
        throw new AppError('Cannot add more than 50 members at once', 400);
      }

      // Check current member count
      const currentMemberCount = await prisma.groupMember.count({
        where: { groupId }
      });

      if (currentMemberCount + memberIds.length > 255) {
        throw new AppError('Group member limit exceeded', 400);
      }

      // Check if users exist
      const users = await prisma.user.findMany({
        where: { id: { in: memberIds } },
        select: { id: true }
      });

      if (users.length !== memberIds.length) {
        throw new AppError('Some users not found', 400);
      }

      // Check for existing members
      const existingMembers = await prisma.groupMember.findMany({
        where: {
          groupId,
          userId: { in: memberIds }
        },
        select: { userId: true }
      });

      const existingUserIds = existingMembers.map(m => m.userId);
      const newMemberIds = memberIds.filter(id => !existingUserIds.includes(id));

      if (newMemberIds.length === 0) {
        throw new AppError('All users are already members', 400);
      }

      // Add new members
      await prisma.groupMember.createMany({
        data: newMemberIds.map(memberId => ({
          groupId,
          userId: memberId,
          role: GroupMemberRole.MEMBER,
          joinedAt: new Date()
        }))
      });

      // Update sender key distribution
      await prisma.group.update({
        where: { id: groupId },
        data: { 
          senderKeyDistribution: senderKeyDistribution ? Buffer.from(senderKeyDistribution, 'base64') : null
        }
      });

      logger.info('Members added to group', { 
        groupId, 
        addedBy: userId, 
        newMembers: newMemberIds.length 
      });

      return await this.getGroupDetails(groupId, userId);
    } catch (error) {
      logger.error('Error adding members:', error);
      throw error instanceof AppError ? error : new AppError('Failed to add members', 500);
    }
  }

  /**
   * Remove member from group
   */
  static async removeMember(
    groupId: string,
    userId: string,
    memberId: string
  ): Promise<GroupDetailResponse> {
    try {
      // Check if user is admin
      await this.checkAdminPermission(groupId, userId);

      if (userId === memberId) {
        throw new AppError('Use leave group to remove yourself', 400);
      }

      // Check if member exists
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: memberId
          }
        }
      });

      if (!member) {
        throw new AppError('Member not found in group', 404);
      }

      // Cannot remove group creator
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { creatorId: true }
      });

      if (group?.creatorId === memberId) {
        throw new AppError('Cannot remove group creator', 403);
      }

      // Remove member
      await prisma.groupMember.delete({
        where: {
          groupId_userId: {
            groupId,
            userId: memberId
          }
        }
      });

      logger.info('Member removed from group', { 
        groupId, 
        removedBy: userId, 
        removedMember: memberId 
      });

      return await this.getGroupDetails(groupId, userId);
    } catch (error) {
      logger.error('Error removing member:', error);
      throw error instanceof AppError ? error : new AppError('Failed to remove member', 500);
    }
  }

  /**
   * Leave group
   */
  static async leaveGroup(groupId: string, userId: string): Promise<void> {
    try {
      // Check if user is member
      const membership = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId
          }
        }
      });

      if (!membership) {
        throw new AppError('You are not a member of this group', 403);
      }

      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { creatorId: true }
      });

      // If creator is leaving, transfer ownership or delete group
      if (group?.creatorId === userId) {
        const adminCount = await prisma.groupMember.count({
          where: {
            groupId,
            role: GroupMemberRole.ADMIN,
            userId: { not: userId }
          }
        });

        if (adminCount > 0) {
          // Transfer ownership to first admin
          const newOwner = await prisma.groupMember.findFirst({
            where: {
              groupId,
              role: GroupMemberRole.ADMIN,
              userId: { not: userId }
            },
            orderBy: { joinedAt: 'asc' }
          });

          if (newOwner) {
            await prisma.$transaction([
              // Update group creator
              prisma.group.update({
                where: { id: groupId },
                data: { creatorId: newOwner.userId }
              }),
              // Remove leaving user
              prisma.groupMember.delete({
                where: {
                  groupId_userId: {
                    groupId,
                    userId
                  }
                }
              })
            ]);
          }
        } else {
          // No other admins, check if there are other members to promote
          const memberToPromote = await prisma.groupMember.findFirst({
            where: {
              groupId,
              userId: { not: userId }
            },
            orderBy: { joinedAt: 'asc' }
          });

          if (memberToPromote) {
            await prisma.$transaction([
              // Update group creator and promote member to admin
              prisma.group.update({
                where: { id: groupId },
                data: { creatorId: memberToPromote.userId }
              }),
              prisma.groupMember.update({
                where: {
                  groupId_userId: {
                    groupId,
                    userId: memberToPromote.userId
                  }
                },
                data: { role: GroupMemberRole.ADMIN }
              }),
              // Remove leaving user
              prisma.groupMember.delete({
                where: {
                  groupId_userId: {
                    groupId,
                    userId
                  }
                }
              })
            ]);
          } else {
            // Last member leaving, just remove the member
            await prisma.groupMember.delete({
              where: {
                groupId_userId: {
                  groupId,
                  userId
                }
              }
            });
          }
        }
      } else {
        // Regular member leaving
        await prisma.groupMember.delete({
          where: {
            groupId_userId: {
              groupId,
              userId
            }
          }
        });
      }

      logger.info('User left group', { groupId, userId });
    } catch (error) {
      logger.error('Error leaving group:', error);
      throw error instanceof AppError ? error : new AppError('Failed to leave group', 500);
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(
    groupId: string,
    userId: string,
    memberId: string,
    newRole: GroupMemberRole
  ): Promise<GroupDetailResponse> {
    try {
      // Check if user is admin
      await this.checkAdminPermission(groupId, userId);

      if (userId === memberId) {
        throw new AppError('Cannot change your own role', 400);
      }

      // Check if member exists
      const member = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId,
            userId: memberId
          }
        }
      });

      if (!member) {
        throw new AppError('Member not found in group', 404);
      }

      // Cannot change role of group creator
      const group = await prisma.group.findUnique({
        where: { id: groupId },
        select: { creatorId: true }
      });

      if (group?.creatorId === memberId) {
        throw new AppError('Cannot change role of group creator', 403);
      }

      // Update role
      await prisma.groupMember.update({
        where: {
          groupId_userId: {
            groupId,
            userId: memberId
          }
        },
        data: { role: newRole }
      });

      logger.info('Member role updated', { 
        groupId, 
        updatedBy: userId, 
        memberId, 
        newRole 
      });

      return await this.getGroupDetails(groupId, userId);
    } catch (error) {
      logger.error('Error updating member role:', error);
      throw error instanceof AppError ? error : new AppError('Failed to update member role', 500);
    }
  }

  /**
   * Get user's groups
   */
  static async getUserGroups(userId: string): Promise<GroupResponse[]> {
    try {
      const groups = await prisma.groupMember.findMany({
        where: { userId },
        include: {
          group: {
            include: {
              _count: {
                select: { members: true }
              }
            }
          }
        },
        orderBy: { joinedAt: 'desc' }
      });

      return groups.map(membership => ({
        id: membership.group.id,
        name: membership.group.name,
        description: membership.group.description || undefined,
        avatarUrl: membership.group.avatarUrl || undefined,
        creatorId: membership.group.creatorId,
        createdAt: membership.group.createdAt,
        updatedAt: membership.group.updatedAt,
        memberCount: membership.group._count.members,
        isActive: true
      }));
    } catch (error) {
      logger.error('Error getting user groups:', error);
      throw new AppError('Failed to get groups', 500);
    }
  }

  /**
   * Join group via invite code
   */
  static async joinGroupByInvite(inviteCode: string, userId: string): Promise<GroupDetailResponse> {
    try {
      // TODO: Implement invite functionality when inviteCode field is added to schema
      throw new AppError('Invite functionality not yet implemented', 501);
      
      // This would be the implementation once inviteCode field exists:
      /*
      const group = await prisma.group.findUnique({
        where: { inviteCode },
        include: {
          _count: { select: { members: true } }
        }
      });

      if (!group) {
        throw new AppError('Invalid or expired invite link', 404);
      }

      // Check if already a member
      const existingMember = await prisma.groupMember.findUnique({
        where: {
          groupId_userId: {
            groupId: group.id,
            userId
          }
        }
      });

      if (existingMember) {
        throw new AppError('You are already a member of this group', 400);
      }

      // Check member limit
      if (group._count.members >= 255) {
        throw new AppError('Group is full', 400);
      }

      // Add user to group
      await prisma.groupMember.create({
        data: {
          groupId: group.id,
          userId,
          role: GroupMemberRole.MEMBER,
          joinedAt: new Date()
        }
      });

      logger.info('User joined group via invite', { 
        groupId: group.id, 
        userId, 
        inviteCode 
      });

      return await this.getGroupDetails(group.id, userId);
      */
    } catch (error) {
      logger.error('Error joining group by invite:', error);
      throw error instanceof AppError ? error : new AppError('Failed to join group', 500);
    }
  }

  /**
   * Generate new invite link
   */
  static async generateInviteLink(groupId: string, userId: string): Promise<string> {
    try {
      // TODO: Implement invite functionality when inviteCode field is added to schema
      throw new AppError('Invite link generation not yet implemented', 501);
      
      /*
      // Check if user is admin
      await this.checkAdminPermission(groupId, userId);

      const inviteCode = this.generateInviteCode();

      await prisma.group.update({
        where: { id: groupId },
        data: { inviteCode }
      });

      logger.info('New invite link generated', { groupId, userId });

      return `${process.env.APP_BASE_URL}/join/${inviteCode}`;
      */
    } catch (error) {
      logger.error('Error generating invite link:', error);
      throw error instanceof AppError ? error : new AppError('Failed to generate invite link', 500);
    }
  }

  // Helper methods
  private static async checkAdminPermission(groupId: string, userId: string): Promise<void> {
    const membership = await prisma.groupMember.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId
        }
      }
    });

    if (!membership) {
      throw new AppError('You are not a member of this group', 403);
    }

    if (membership.role !== GroupMemberRole.ADMIN) {
      throw new AppError('Admin permission required', 403);
    }
  }

  private static generateInviteCode(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
}