export interface ContactInfo {
    id: string;
    phoneNumber: string;
    name?: string;
    about?: string;
    avatarUrl?: string;
    isOnline: boolean;
    lastSeen?: Date;
    isBlocked?: boolean;
    isMuted?: boolean;
}
export interface UserSearchResult {
    id: string;
    phoneNumber: string;
    name?: string;
    avatarUrl?: string;
    isOnline: boolean;
}
export declare class UserService {
    static searchUsers(query: string, currentUserId: string, limit?: number): Promise<UserSearchResult[]>;
    static getContacts(userId: string): Promise<ContactInfo[]>;
    static addContact(userId: string, contactPhoneNumber: string, customName?: string): Promise<ContactInfo>;
    static removeContact(userId: string, contactUserId: string): Promise<void>;
    static toggleBlockContact(userId: string, contactUserId: string, isBlocked: boolean): Promise<ContactInfo>;
    static toggleMuteContact(userId: string, contactUserId: string, isMuted: boolean): Promise<ContactInfo>;
    static updateContactName(userId: string, contactUserId: string, customName: string): Promise<ContactInfo>;
    static getUserById(userId: string, requesterId: string): Promise<UserSearchResult>;
    static updateOnlineStatus(userId: string, isOnline: boolean): Promise<void>;
    static getBlockedUsers(userId: string): Promise<ContactInfo[]>;
}
//# sourceMappingURL=user.service.d.ts.map