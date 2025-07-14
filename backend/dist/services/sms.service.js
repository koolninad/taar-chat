"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmsService = void 0;
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
class SmsService {
    static initialize() {
        this.sns = {
            publish: (params) => ({
                promise: () => {
                    logger_1.logger.info(`Mock SMS sent to ${params.PhoneNumber}: ${params.Message}`);
                    return Promise.resolve({
                        MessageId: 'mock-message-id-' + Date.now()
                    });
                }
            })
        };
    }
    static async sendOtp(phoneNumber, otpCode) {
        try {
            if (!this.sns) {
                this.initialize();
            }
            const message = `Your Taar verification code is: ${otpCode}. This code will expire in ${config_1.config.otp.expiresInMinutes} minutes. Don't share this code with anyone.`;
            const params = {
                PhoneNumber: phoneNumber,
                Message: message,
                MessageAttributes: {
                    'AWS.SNS.SMS.SenderID': {
                        DataType: 'String',
                        StringValue: config_1.config.aws.sns.smsSenderId
                    },
                    'AWS.SNS.SMS.SMSType': {
                        DataType: 'String',
                        StringValue: 'Transactional'
                    }
                }
            };
            if (config_1.config.server.isDevelopment) {
                logger_1.logger.info(`[DEV] SMS OTP for ${phoneNumber}: ${otpCode}`);
                return;
            }
            const result = await this.sns.publish(params).promise();
            logger_1.logger.info('SMS sent successfully', {
                phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
                messageId: result.MessageId,
                type: 'sms'
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to send SMS:', error);
            throw new errors_1.AppError('Failed to send verification code. Please try again.', 500);
        }
    }
    static async sendWelcomeMessage(phoneNumber, name) {
        try {
            if (!this.sns) {
                this.initialize();
            }
            const message = `Welcome to Taar, ${name}! Your account has been created successfully. Start chatting securely with end-to-end encryption.`;
            const params = {
                PhoneNumber: phoneNumber,
                Message: message,
                MessageAttributes: {
                    'AWS.SNS.SMS.SenderID': {
                        DataType: 'String',
                        StringValue: config_1.config.aws.sns.smsSenderId
                    },
                    'AWS.SNS.SMS.SMSType': {
                        DataType: 'String',
                        StringValue: 'Promotional'
                    }
                }
            };
            if (config_1.config.server.isDevelopment) {
                logger_1.logger.info(`[DEV] Welcome SMS for ${phoneNumber}: ${message}`);
                return;
            }
            await this.sns.publish(params).promise();
            logger_1.logger.info('Welcome SMS sent successfully', {
                phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
                type: 'welcome'
            });
        }
        catch (error) {
            logger_1.logger.warn('Failed to send welcome message:', error);
        }
    }
    static async sendSecurityAlert(phoneNumber, alertType) {
        try {
            if (!this.sns) {
                this.initialize();
            }
            let message = '';
            switch (alertType) {
                case 'new_device_login':
                    message = 'Taar Security Alert: Your account was accessed from a new device. If this wasn\'t you, please change your password immediately.';
                    break;
                case 'password_changed':
                    message = 'Taar Security Alert: Your account password was changed. If you didn\'t make this change, please contact support.';
                    break;
                case 'suspicious_activity':
                    message = 'Taar Security Alert: Suspicious activity detected on your account. Please review your recent activity.';
                    break;
                default:
                    message = 'Taar Security Alert: Important security notification for your account.';
            }
            const params = {
                PhoneNumber: phoneNumber,
                Message: message,
                MessageAttributes: {
                    'AWS.SNS.SMS.SenderID': {
                        DataType: 'String',
                        StringValue: config_1.config.aws.sns.smsSenderId
                    },
                    'AWS.SNS.SMS.SMSType': {
                        DataType: 'String',
                        StringValue: 'Transactional'
                    }
                }
            };
            if (config_1.config.server.isDevelopment) {
                logger_1.logger.info(`[DEV] Security Alert SMS for ${phoneNumber}: ${message}`);
                return;
            }
            await this.sns.publish(params).promise();
            logger_1.logger.info('Security alert SMS sent successfully', {
                phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
                alertType,
                type: 'security_alert'
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to send security alert:', error);
        }
    }
    static validatePhoneNumber(phoneNumber) {
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        return /^\+?[1-9]\d{9,14}$/.test(phoneNumber) && cleanNumber.length >= 10 && cleanNumber.length <= 15;
    }
    static formatPhoneNumber(phoneNumber, defaultCountryCode = '+91') {
        const cleanNumber = phoneNumber.replace(/\D/g, '');
        if (!phoneNumber.startsWith('+') && !phoneNumber.startsWith('00')) {
            return `${defaultCountryCode}${cleanNumber}`;
        }
        if (phoneNumber.startsWith('00')) {
            return `+${cleanNumber.substring(2)}`;
        }
        if (phoneNumber.startsWith('+')) {
            return `+${cleanNumber}`;
        }
        return phoneNumber;
    }
    static async getSmsStatus(messageId) {
        try {
            if (!this.sns) {
                this.initialize();
            }
            logger_1.logger.info('SMS status check requested', { messageId });
            return 'DELIVERED';
        }
        catch (error) {
            logger_1.logger.error('Failed to get SMS status:', error);
            return 'UNKNOWN';
        }
    }
}
exports.SmsService = SmsService;
//# sourceMappingURL=sms.service.js.map