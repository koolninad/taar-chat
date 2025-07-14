interface TokenPayload {
    userId: string;
    phoneNumber: string;
    type: 'access' | 'refresh';
}
interface AuthTokens {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}
declare class AuthService {
    private static readonly SALT_ROUNDS;
    static sendOtp(phoneNumber: string, countryCode: string): Promise<void>;
    static verifyOtp(phoneNumber: string, countryCode: string, otpCode: string, userInfo?: {
        name?: string;
        identityKey: string;
    }): Promise<{
        user: any;
        tokens: AuthTokens;
        isNewUser: boolean;
    }>;
    static generateTokens(user: any): Promise<AuthTokens>;
    static refreshToken(refreshToken: string): Promise<AuthTokens>;
    static verifyToken(token: string): Promise<TokenPayload>;
    static logout(userId: string, refreshToken?: string): Promise<void>;
    static revokeAllSessions(userId: string): Promise<void>;
    static updateProfile(userId: string, updates: {
        name?: string;
        about?: string;
        avatarUrl?: string;
    }): Promise<any>;
    static getProfile(userId: string): Promise<any>;
}
export { AuthService, TokenPayload, AuthTokens };
//# sourceMappingURL=auth.service.d.ts.map