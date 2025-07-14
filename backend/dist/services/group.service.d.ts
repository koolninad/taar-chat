import { GroupMemberRole } from '@prisma/client';
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
export declare class GroupService {
    static createGroup(groupData: CreateGroupRequest): Promise<GroupDetailResponse>;
    static getGroupDetails(groupId: string, userId: string): Promise<GroupDetailResponse>;
    static updateGroup(groupId: string, userId: string, updates: {
        name?: string;
        description?: string;
        avatarUrl?: string;
    }): Promise<GroupDetailResponse>;
    static addMembers(groupId: string, userId: string, memberIds: string[], senderKeyDistribution: string): Promise<GroupDetailResponse>;
    static removeMember(groupId: string, userId: string, memberId: string): Promise<GroupDetailResponse>;
    static leaveGroup(groupId: string, userId: string): Promise<void>;
    static updateMemberRole(groupId: string, userId: string, memberId: string, newRole: GroupMemberRole): Promise<GroupDetailResponse>;
    static getUserGroups(userId: string): Promise<GroupResponse[]>;
    static joinGroupByInvite(inviteCode: string, userId: string): Promise<GroupDetailResponse>;
    static generateInviteLink(groupId: string, userId: string): Promise<string>;
    private static checkAdminPermission;
    private static generateInviteCode;
}
//# sourceMappingURL=group.service.d.ts.map