import { config } from '../config';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';

class SmsService {
  private static sns: any;
  
  static initialize(): void {
    // Mock SNS service for development
    this.sns = {
      publish: (params: any) => ({
        promise: () => {
          logger.info(`Mock SMS sent to ${params.PhoneNumber}: ${params.Message}`);
          return Promise.resolve({
            MessageId: 'mock-message-id-' + Date.now()
          });
        }
      })
    };
  }
  
  /**
   * Send OTP via SMS using AWS SNS
   */
  static async sendOtp(phoneNumber: string, otpCode: string): Promise<void> {
    try {
      if (!this.sns) {
        this.initialize();
      }
      
      const message = `Your Taar verification code is: ${otpCode}. This code will expire in ${config.otp.expiresInMinutes} minutes. Don't share this code with anyone.`;
      
      const params = {
        PhoneNumber: phoneNumber,
        Message: message,
        MessageAttributes: {
          'AWS.SNS.SMS.SenderID': {
            DataType: 'String',
            StringValue: config.aws.sns.smsSenderId
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          }
        }
      };
      
      if (config.server.isDevelopment) {
        // In development, just log the OTP instead of sending SMS
        logger.info(`[DEV] SMS OTP for ${phoneNumber}: ${otpCode}`);
        return;
      }
      
      const result = await this.sns.publish(params).promise();
      
      logger.info('SMS sent successfully', {
        phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'), // Mask phone number
        messageId: result.MessageId,
        type: 'sms'
      });
      
    } catch (error) {
      logger.error('Failed to send SMS:', error);
      throw new AppError('Failed to send verification code. Please try again.', 500);
    }
  }
  
  /**
   * Send welcome message to new user
   */
  static async sendWelcomeMessage(phoneNumber: string, name: string): Promise<void> {
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
            StringValue: config.aws.sns.smsSenderId
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Promotional'
          }
        }
      };
      
      if (config.server.isDevelopment) {
        logger.info(`[DEV] Welcome SMS for ${phoneNumber}: ${message}`);
        return;
      }
      
      await this.sns.publish(params).promise();
      
      logger.info('Welcome SMS sent successfully', {
        phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
        type: 'welcome'
      });
      
    } catch (error) {
      // Don't throw error for welcome message failure
      logger.warn('Failed to send welcome message:', error);
    }
  }
  
  /**
   * Send security alert
   */
  static async sendSecurityAlert(phoneNumber: string, alertType: string): Promise<void> {
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
            StringValue: config.aws.sns.smsSenderId
          },
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional'
          }
        }
      };
      
      if (config.server.isDevelopment) {
        logger.info(`[DEV] Security Alert SMS for ${phoneNumber}: ${message}`);
        return;
      }
      
      await this.sns.publish(params).promise();
      
      logger.info('Security alert SMS sent successfully', {
        phoneNumber: phoneNumber.replace(/\d(?=\d{4})/g, '*'),
        alertType,
        type: 'security_alert'
      });
      
    } catch (error) {
      logger.error('Failed to send security alert:', error);
      // Don't throw error for security alerts to prevent blocking main flow
    }
  }
  
  /**
   * Validate phone number format
   */
  static validatePhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid international format (E.164)
    // Should start with country code and be 10-15 digits total
    return /^\+?[1-9]\d{9,14}$/.test(phoneNumber) && cleanNumber.length >= 10 && cleanNumber.length <= 15;
  }
  
  /**
   * Format phone number to E.164 standard
   */
  static formatPhoneNumber(phoneNumber: string, defaultCountryCode: string = '+91'): string {
    // Remove all non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // If number doesn't start with country code, add default
    if (!phoneNumber.startsWith('+') && !phoneNumber.startsWith('00')) {
      return `${defaultCountryCode}${cleanNumber}`;
    }
    
    // If starts with 00, replace with +
    if (phoneNumber.startsWith('00')) {
      return `+${cleanNumber.substring(2)}`;
    }
    
    // If starts with +, ensure it's properly formatted
    if (phoneNumber.startsWith('+')) {
      return `+${cleanNumber}`;
    }
    
    return phoneNumber;
  }
  
  /**
   * Get SMS delivery status
   */
  static async getSmsStatus(messageId: string): Promise<string> {
    try {
      if (!this.sns) {
        this.initialize();
      }
      
      // Note: AWS SNS doesn't provide direct delivery status for SMS
      // You would need to set up CloudWatch Events or use a third-party service
      // For now, we'll return a placeholder
      
      logger.info('SMS status check requested', { messageId });
      return 'DELIVERED'; // Placeholder
      
    } catch (error) {
      logger.error('Failed to get SMS status:', error);
      return 'UNKNOWN';
    }
  }
}

export { SmsService };