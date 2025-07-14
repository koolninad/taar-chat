"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupService = void 0;
const client_1 = require("@prisma/client");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient();
class GroupService {
    static async createGroup(groupData) {
        try {
            if (groupData.memberIds.length < 1) {
                throw new errors_1.AppError('Group must have at least 1 member', 400);
            }
            if (groupData.memberIds.length > 255) {
                throw new errors_1.AppError('Group cannot have more than 255 members', 400);
            }
            const members = await prisma.user.findMany({
                where: { id: { in: groupData.memberIds } },
                select: { id: true }
            });
            if (members.length !== groupData.memberIds.length) {
                throw new errors_1.AppError('Some members not found', 400);
            }
            const group = await prisma.$transaction(async (tx) => {
                const newGroup = await tx.group.create({
                    data: {
                        name: groupData.name.trim(),
                        description: groupData.description?.trim(),
                        creatorId: groupData.creatorId,
                        senderKeyDistribution: groupData.senderKeyDistribution ? Buffer.from(groupData.senderKeyDistribution, 'base64') : null
                    }
                });
                await tx.groupMember.create({
                    data: {
                        groupId: newGroup.id,
                        userId: groupData.creatorId,
                        role: client_1.GroupMemberRole.ADMIN,
                        joinedAt: new Date()
                    }
                });
                const memberData = groupData.memberIds
                    .filter(id => id !== groupData.creatorId)
                    .map(userId => ({
                    groupId: newGroup.id,
                    userId,
                    role: client_1.GroupMemberRole.MEMBER,
                    joinedAt: new Date()
                }));
                if (memberData.length > 0) {
                    await tx.groupMember.createMany({
                        data: memberData
                    });
                }
                return newGroup;
            });
            logger_1.logger.info('Group created', {
                groupId: group.id,
                creatorId: groupData.creatorId,
                memberCount: groupData.memberIds.length
            });
            return await this.getGroupDetails(group.id, groupData.creatorId);
        }
        catch (error) {
            logger_1.logger.error('Error creating group:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to create group', 500);
        }
    }
    static async getGroupDetails(groupId, userId) {
        try {
            const membership = await prisma.groupMember.findUnique({
                where: {
                    groupId_userId: {
                        groupId,
                        userId
                    }
                }
            });
            if (!membership) {
                throw new errors_1.AppError('You are not a member of this group', 403);
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
                            { role: 'asc' },
                            { joinedAt: 'asc' }
                        ]
                    },
                    _count: {
                        select: { members: true }
                    }
                }
            });
            if (!group) {
                throw new errors_1.AppError('Group not found', 404);
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
        }
        catch (error) {
            logger_1.logger.error('Error getting group details:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to get group details', 500);
        }
    }
    static async updateGroup(groupId, userId, updates) {
        try {
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
            logger_1.logger.info('Group updated', { groupId, userId, updates });
            return await this.getGroupDetails(groupId, userId);
        }
        catch (error) {
            logger_1.logger.error('Error updating group:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to update group', 500);
        }
    }
    static async addMembers(groupId, userId, memberIds, senderKeyDistribution) {
        try {
            await this.checkAdminPermission(groupId, userId);
            if (memberIds.length === 0) {
                throw new errors_1.AppError('No members to add', 400);
            }
            if (memberIds.length > 50) {
                throw new errors_1.AppError('Cannot add more than 50 members at once', 400);
            }
            const currentMemberCount = await prisma.groupMember.count({
                where: { groupId }
            });
            if (currentMemberCount + memberIds.length > 255) {
                throw new errors_1.AppError('Group member limit exceeded', 400);
            }
            const users = await prisma.user.findMany({
                where: { id: { in: memberIds } },
                select: { id: true }
            });
            if (users.length !== memberIds.length) {
                throw new errors_1.AppError('Some users not found', 400);
            }
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
                throw new errors_1.AppError('All users are already members', 400);
            }
            await prisma.groupMember.createMany({
                data: newMemberIds.map(memberId => ({
                    groupId,
                    userId: memberId,
                    role: client_1.GroupMemberRole.MEMBER,
                    joinedAt: new Date()
                }))
            });
            await prisma.group.update({
                where: { id: groupId },
                data: {
                    senderKeyDistribution: senderKeyDistribution ? Buffer.from(senderKeyDistribution, 'base64') : null
                }
            });
            logger_1.logger.info('Members added to group', {
                groupId,
                addedBy: userId,
                newMembers: newMemberIds.length
            });
            return await this.getGroupDetails(groupId, userId);
        }
        catch (error) {
            logger_1.logger.error('Error adding members:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to add members', 500);
        }
    }
    static async removeMember(groupId, userId, memberId) {
        try {
            await this.checkAdminPermission(groupId, userId);
            if (userId === memberId) {
                throw new errors_1.AppError('Use leave group to remove yourself', 400);
            }
            const member = await prisma.groupMember.findUnique({
                where: {
                    groupId_userId: {
                        groupId,
                        userId: memberId
                    }
                }
            });
            if (!member) {
                throw new errors_1.AppError('Member not found in group', 404);
            }
            const group = await prisma.group.findUnique({
                where: { id: groupId },
                select: { creatorId: true }
            });
            if (group?.creatorId === memberId) {
                throw new errors_1.AppError('Cannot remove group creator', 403);
            }
            await prisma.groupMember.delete({
                where: {
                    groupId_userId: {
                        groupId,
                        userId: memberId
                    }
                }
            });
            logger_1.logger.info('Member removed from group', {
                groupId,
                removedBy: userId,
                removedMember: memberId
            });
            return await this.getGroupDetails(groupId, userId);
        }
        catch (error) {
            logger_1.logger.error('Error removing member:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to remove member', 500);
        }
    }
    static async leaveGroup(groupId, userId) {
        try {
            const membership = await prisma.groupMember.findUnique({
                where: {
                    groupId_userId: {
                        groupId,
                        userId
                    }
                }
            });
            if (!membership) {
                throw new errors_1.AppError('You are not a member of this group', 403);
            }
            const group = await prisma.group.findUnique({
                where: { id: groupId },
                select: { creatorId: true }
            });
            if (group?.creatorId === userId) {
                const adminCount = await prisma.groupMember.count({
                    where: {
                        groupId,
                        role: client_1.GroupMemberRole.ADMIN,
                        userId: { not: userId }
                    }
                });
                if (adminCount > 0) {
                    const newOwner = await prisma.groupMember.findFirst({
                        where: {
                            groupId,
                            role: client_1.GroupMemberRole.ADMIN,
                            userId: { not: userId }
                        },
                        orderBy: { joinedAt: 'asc' }
                    });
                    if (newOwner) {
                        await prisma.$transaction([
                            prisma.group.update({
                                where: { id: groupId },
                                data: { creatorId: newOwner.userId }
                            }),
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
                }
                else {
                    const memberToPromote = await prisma.groupMember.findFirst({
                        where: {
                            groupId,
                            userId: { not: userId }
                        },
                        orderBy: { joinedAt: 'asc' }
                    });
                    if (memberToPromote) {
                        await prisma.$transaction([
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
                                data: { role: client_1.GroupMemberRole.ADMIN }
                            }),
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
                    else {
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
            }
            else {
                await prisma.groupMember.delete({
                    where: {
                        groupId_userId: {
                            groupId,
                            userId
                        }
                    }
                });
            }
            logger_1.logger.info('User left group', { groupId, userId });
        }
        catch (error) {
            logger_1.logger.error('Error leaving group:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to leave group', 500);
        }
    }
    static async updateMemberRole(groupId, userId, memberId, newRole) {
        try {
            await this.checkAdminPermission(groupId, userId);
            if (userId === memberId) {
                throw new errors_1.AppError('Cannot change your own role', 400);
            }
            const member = await prisma.groupMember.findUnique({
                where: {
                    groupId_userId: {
                        groupId,
                        userId: memberId
                    }
                }
            });
            if (!member) {
                throw new errors_1.AppError('Member not found in group', 404);
            }
            const group = await prisma.group.findUnique({
                where: { id: groupId },
                select: { creatorId: true }
            });
            if (group?.creatorId === memberId) {
                throw new errors_1.AppError('Cannot change role of group creator', 403);
            }
            await prisma.groupMember.update({
                where: {
                    groupId_userId: {
                        groupId,
                        userId: memberId
                    }
                },
                data: { role: newRole }
            });
            logger_1.logger.info('Member role updated', {
                groupId,
                updatedBy: userId,
                memberId,
                newRole
            });
            return await this.getGroupDetails(groupId, userId);
        }
        catch (error) {
            logger_1.logger.error('Error updating member role:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to update member role', 500);
        }
    }
    static async getUserGroups(userId) {
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
        }
        catch (error) {
            logger_1.logger.error('Error getting user groups:', error);
            throw new errors_1.AppError('Failed to get groups', 500);
        }
    }
    static async joinGroupByInvite(inviteCode, userId) {
        try {
            throw new errors_1.AppError('Invite functionality not yet implemented', 501);
        }
        catch (error) {
            logger_1.logger.error('Error joining group by invite:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to join group', 500);
        }
    }
    static async generateInviteLink(groupId, userId) {
        try {
            throw new errors_1.AppError('Invite link generation not yet implemented', 501);
        }
        catch (error) {
            logger_1.logger.error('Error generating invite link:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError('Failed to generate invite link', 500);
        }
    }
    static async checkAdminPermission(groupId, userId) {
        const membership = await prisma.groupMember.findUnique({
            where: {
                groupId_userId: {
                    groupId,
                    userId
                }
            }
        });
        if (!membership) {
            throw new errors_1.AppError('You are not a member of this group', 403);
        }
        if (membership.role !== client_1.GroupMemberRole.ADMIN) {
            throw new errors_1.AppError('Admin permission required', 403);
        }
    }
    static generateInviteCode() {
        return Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);
    }
}
exports.GroupService = GroupService;
//# sourceMappingURL=group.service.js.map