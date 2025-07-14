"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorMessages = exports.WebSocketError = exports.MediaError = exports.SignalProtocolError = exports.ExternalServiceError = exports.DatabaseError = exports.RateLimitError = exports.ConflictError = exports.NotFoundError = exports.AuthorizationError = exports.AuthenticationError = exports.ValidationError = exports.AppError = void 0;
exports.isOperationalError = isOperationalError;
exports.getErrorCode = getErrorCode;
exports.getStatusCode = getStatusCode;
exports.formatErrorForClient = formatErrorForClient;
class AppError extends Error {
    constructor(message, statusCode = 500, code) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        this.code = code;
        Error.captureStackTrace(this, this.constructor);
    }
}
exports.AppError = AppError;
class ValidationError extends AppError {
    constructor(message, field, value) {
        super(message, 400, 'VALIDATION_ERROR');
        this.field = field;
        this.value = value;
    }
}
exports.ValidationError = ValidationError;
class AuthenticationError extends AppError {
    constructor(message = 'Authentication failed') {
        super(message, 401, 'AUTHENTICATION_ERROR');
    }
}
exports.AuthenticationError = AuthenticationError;
class AuthorizationError extends AppError {
    constructor(message = 'Access denied') {
        super(message, 403, 'AUTHORIZATION_ERROR');
    }
}
exports.AuthorizationError = AuthorizationError;
class NotFoundError extends AppError {
    constructor(resource, message) {
        super(message || `${resource} not found`, 404, 'NOT_FOUND_ERROR');
        this.resource = resource;
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(resource, message) {
        super(message || `${resource} already exists`, 409, 'CONFLICT_ERROR');
        this.resource = resource;
    }
}
exports.ConflictError = ConflictError;
class RateLimitError extends AppError {
    constructor(message = 'Rate limit exceeded', retryAfter = 60) {
        super(message, 429, 'RATE_LIMIT_ERROR');
        this.retryAfter = retryAfter;
    }
}
exports.RateLimitError = RateLimitError;
class DatabaseError extends AppError {
    constructor(message, query) {
        super(message, 500, 'DATABASE_ERROR');
        this.query = query;
    }
}
exports.DatabaseError = DatabaseError;
class ExternalServiceError extends AppError {
    constructor(service, message) {
        super(message, 502, 'EXTERNAL_SERVICE_ERROR');
        this.service = service;
    }
}
exports.ExternalServiceError = ExternalServiceError;
class SignalProtocolError extends AppError {
    constructor(operation, message) {
        super(message, 400, 'SIGNAL_PROTOCOL_ERROR');
        this.operation = operation;
    }
}
exports.SignalProtocolError = SignalProtocolError;
class MediaError extends AppError {
    constructor(mediaType, message) {
        super(message, 400, 'MEDIA_ERROR');
        this.mediaType = mediaType;
    }
}
exports.MediaError = MediaError;
class WebSocketError extends AppError {
    constructor(connectionId, message) {
        super(message, 400, 'WEBSOCKET_ERROR');
        this.connectionId = connectionId;
    }
}
exports.WebSocketError = WebSocketError;
function isOperationalError(error) {
    if (error instanceof AppError) {
        return error.isOperational;
    }
    return false;
}
function getErrorCode(error) {
    if (error instanceof AppError && error.code) {
        return error.code;
    }
    return 'UNKNOWN_ERROR';
}
function getStatusCode(error) {
    if (error instanceof AppError) {
        return error.statusCode;
    }
    return 500;
}
function formatErrorForClient(error, includeStack = false) {
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
exports.ErrorMessages = {
    INVALID_CREDENTIALS: 'Invalid phone number or verification code',
    TOKEN_EXPIRED: 'Authentication token has expired',
    TOKEN_INVALID: 'Invalid authentication token',
    SESSION_EXPIRED: 'Your session has expired. Please login again',
    ACCESS_DENIED: 'You do not have permission to access this resource',
    INSUFFICIENT_PERMISSIONS: 'Insufficient permissions to perform this action',
    INVALID_PHONE_NUMBER: 'Please provide a valid phone number',
    INVALID_OTP: 'Invalid verification code',
    OTP_EXPIRED: 'Verification code has expired',
    REQUIRED_FIELD: 'This field is required',
    INVALID_FILE_TYPE: 'Invalid file type',
    FILE_TOO_LARGE: 'File size exceeds maximum limit',
    TOO_MANY_REQUESTS: 'Too many requests. Please try again later',
    OTP_RATE_LIMIT: 'Too many OTP requests. Please wait before requesting again',
    KEY_EXCHANGE_FAILED: 'Failed to exchange encryption keys',
    DECRYPTION_FAILED: 'Failed to decrypt message',
    ENCRYPTION_FAILED: 'Failed to encrypt message',
    INVALID_SIGNATURE: 'Invalid message signature',
    INTERNAL_SERVER_ERROR: 'An internal server error occurred',
    SERVICE_UNAVAILABLE: 'Service temporarily unavailable',
    MAINTENANCE_MODE: 'Service is under maintenance',
    USER_NOT_FOUND: 'User not found',
    CONTACT_ALREADY_EXISTS: 'Contact already exists',
    CONTACT_NOT_FOUND: 'Contact not found',
    GROUP_NOT_FOUND: 'Group not found',
    NOT_GROUP_MEMBER: 'You are not a member of this group',
    GROUP_FULL: 'Group has reached maximum member limit',
    INSUFFICIENT_GROUP_PERMISSIONS: 'Insufficient group permissions',
    MESSAGE_NOT_FOUND: 'Message not found',
    MESSAGE_ALREADY_DELETED: 'Message has already been deleted',
    CANNOT_DELETE_MESSAGE: 'You cannot delete this message',
    MEDIA_NOT_FOUND: 'Media file not found',
    MEDIA_UPLOAD_FAILED: 'Failed to upload media file',
    MEDIA_DOWNLOAD_FAILED: 'Failed to download media file'
};
//# sourceMappingURL=errors.js.map