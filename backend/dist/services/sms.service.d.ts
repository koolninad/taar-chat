declare class SmsService {
    private static sns;
    static initialize(): void;
    static sendOtp(phoneNumber: string, otpCode: string): Promise<void>;
    static sendWelcomeMessage(phoneNumber: string, name: string): Promise<void>;
    static sendSecurityAlert(phoneNumber: string, alertType: string): Promise<void>;
    static validatePhoneNumber(phoneNumber: string): boolean;
    static formatPhoneNumber(phoneNumber: string, defaultCountryCode?: string): string;
    static getSmsStatus(messageId: string): Promise<string>;
}
export { SmsService };
//# sourceMappingURL=sms.service.d.ts.map