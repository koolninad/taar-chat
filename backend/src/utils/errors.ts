/**
 * Custom error classes for better error handling
 */

export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  public field: string;
  public value: any;

  constructor(message: string, field: string, value?: any) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
    this.value = value;
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTHENTICATION_ERROR');
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  public resource: string;

  constructor(resource: string, message?: string) {
    super(message || `${resource} not found`, 404, 'NOT_FOUND_ERROR');
    this.resource = resource;
  }
}

export class ConflictError extends AppError {
  public resource: string;

  constructor(resource: string, message?: string) {
    super(message || `${resource} already exists`, 409, 'CONFLICT_ERROR');
    this.resource = resource;
  }
}

export class RateLimitError extends AppError {
  public retryAfter: number;

  constructor(message: string = 'Rate limit exceeded', retryAfter: number = 60) {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.retryAfter = retryAfter;
  }
}

export class DatabaseError extends AppError {
  public query?: string;

  constructor(message: string, query?: string) {
    super(message, 500, 'DATABASE_ERROR');
    this.query = query;
  }
}

export class ExternalServiceError extends AppError {
  public service: string;

  constructor(service: string, message: string) {
    super(message, 502, 'EXTERNAL_SERVICE_ERROR');
    this.service = service;
  }
}

export class SignalProtocolError extends AppError {
  public operation: string;

  constructor(operation: string, message: string) {
    super(message, 400, 'SIGNAL_PROTOCOL_ERROR');
    this.operation = operation;
  }
}

export class MediaError extends AppError {
  public mediaType: string;

  constructor(mediaType: string, message: string) {
    super(message, 400, 'MEDIA_ERROR');
    this.mediaType = mediaType;
  }
}

export class WebSocketError extends AppError {
  public connectionId: string;

  constructor(connectionId: string, message: string) {
    super(message, 400, 'WEBSOCKET_ERROR');
    this.connectionId = connectionId;
  }
}

/**
 * Error handler utility functions
 */

export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}

export function getErrorCode(error: Error): string {
  if (error instanceof AppError && error.code) {
    return error.code;
  }
  return 'UNKNOWN_ERROR';
}

export function getStatusCode(error: Error): number {
  if (error instanceof AppError) {
    return error.statusCode;
  }
  return 500;
}

export function formatErrorForClient(error: Error, includeStack: boolean = false): any {
  const baseError = {
    success: false,
    error: {
      message: error.message,
      code: getErrorCode(error),
      statusCode: getStatusCode(error)
    }
  };

  if (error instanceof ValidationError) {
    return {
      ...baseError,
      error: {
        ...baseError.error,
        field: error.field,
        value: error.value
      }
    };
  }

  if (error instanceof NotFoundError) {
    return {
      ...baseError,
      error: {
        ...baseError.error,
        resource: error.resource
      }
    };
  }

  if (error instanceof ConflictError) {
    return {
      ...baseError,
      error: {
        ...baseError.error,
        resource: error.resource
      }
    };
  }

  if (error instanceof RateLimitError) {
    return {
      ...baseError,
      error: {
        ...baseError.error,
        retryAfter: error.retryAfter
      }
    };
  }

  if (error instanceof ExternalServiceError) {
    return {
      ...baseError,
      error: {
        ...baseError.error,
        service: error.service
      }
    };
  }

  if (error instanceof SignalProtocolError) {
    return {
      ...baseError,
      error: {
        ...baseError.error,
        operation: error.operation
      }
    };
  }

  if (includeStack && error.stack) {
    return {
      ...baseError,
      error: {
        ...baseError.error,
        stack: error.stack
      }
    };
  }

  return baseError;
}

/**
 * Common error messages
 */
export const ErrorMessages = {
  // Authentication
  INVALID_CREDENTIALS: 'Invalid phone number or verification code',
  TOKEN_EXPIRED: 'Authentication token has expired',
  TOKEN_INVALID: 'Invalid authentication token',
  SESSION_EXPIRED: 'Your session has expired. Please login again',
  
  // Authorization
  ACCESS_DENIED: 'You do not have permission to access this resource',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to perform this action',
  
  // Validation
  INVALID_PHONE_NUMBER: 'Please provide a valid phone number',
  INVALID_OTP: 'Invalid verification code',
  OTP_EXPIRED: 'Verification code has expired',
  REQUIRED_FIELD: 'This field is required',
  INVALID_FILE_TYPE: 'Invalid file type',
  FILE_TOO_LARGE: 'File size exceeds maximum limit',
  
  // Rate Limiting
  TOO_MANY_REQUESTS: 'Too many requests. Please try again later',
  OTP_RATE_LIMIT: 'Too many OTP requests. Please wait before requesting again',
  
  // Signal Protocol
  KEY_EXCHANGE_FAILED: 'Failed to exchange encryption keys',
  DECRYPTION_FAILED: 'Failed to decrypt message',
  ENCRYPTION_FAILED: 'Failed to encrypt message',
  INVALID_SIGNATURE: 'Invalid message signature',
  
  // General
  INTERNAL_SERVER_ERROR: 'An internal server error occurred',
  SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
  MAINTENANCE_MODE: 'Service is under maintenance',
  
  // User/Contact
  USER_NOT_FOUND: 'User not found',
  CONTACT_ALREADY_EXISTS: 'Contact already exists',
  CONTACT_NOT_FOUND: 'Contact not found',
  
  // Group
  GROUP_NOT_FOUND: 'Group not found',
  NOT_GROUP_MEMBER: 'You are not a member of this group',
  GROUP_FULL: 'Group has reached maximum member limit',
  INSUFFICIENT_GROUP_PERMISSIONS: 'Insufficient group permissions',
  
  // Message
  MESSAGE_NOT_FOUND: 'Message not found',
  MESSAGE_ALREADY_DELETED: 'Message has already been deleted',
  CANNOT_DELETE_MESSAGE: 'You cannot delete this message',
  
  // Media
  MEDIA_NOT_FOUND: 'Media file not found',
  MEDIA_UPLOAD_FAILED: 'Failed to upload media file',
  MEDIA_DOWNLOAD_FAILED: 'Failed to download media file'
} as const;