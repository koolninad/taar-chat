export declare class AppError extends Error {
    statusCode: number;
    isOperational: boolean;
    code?: string;
    constructor(message: string, statusCode?: number, code?: string);
}
export declare class ValidationError extends AppError {
    field: string;
    value: any;
    constructor(message: string, field: string, value?: any);
}
export declare class AuthenticationError extends AppError {
    constructor(message?: string);
}
export declare class AuthorizationError extends AppError {
    constructor(message?: string);
}
export declare class NotFoundError extends AppError {
    resource: string;
    constructor(resource: string, message?: string);
}
export declare class ConflictError extends AppError {
    resource: string;
    constructor(resource: string, message?: string);
}
export declare class RateLimitError extends AppError {
    retryAfter: number;
    constructor(message?: string, retryAfter?: number);
}
export declare class DatabaseError extends AppError {
    query?: string;
    constructor(message: string, query?: string);
}
export declare class ExternalServiceError extends AppError {
    service: string;
    constructor(service: string, message: string);
}
export declare class SignalProtocolError extends AppError {
    operation: string;
    constructor(operation: string, message: string);
}
export declare class MediaError extends AppError {
    mediaType: string;
    constructor(mediaType: string, message: string);
}
export declare class WebSocketError extends AppError {
    connectionId: string;
    constructor(connectionId: string, message: string);
}
export declare function isOperationalError(error: Error): boolean;
export declare function getErrorCode(error: Error): string;
export declare function getStatusCode(error: Error): number;
export declare function formatErrorForClient(error: Error, includeStack?: boolean): any;
export declare const ErrorMessages: {
    readonly INVALID_CREDENTIALS: "Invalid phone number or verification code";
    readonly TOKEN_EXPIRED: "Authentication token has expired";
    readonly TOKEN_INVALID: "Invalid authentication token";
    readonly SESSION_EXPIRED: "Your session has expired. Please login again";
    readonly ACCESS_DENIED: "You do not have permission to access this resource";
    readonly INSUFFICIENT_PERMISSIONS: "Insufficient permissions to perform this action";
    readonly INVALID_PHONE_NUMBER: "Please provide a valid phone number";
    readonly INVALID_OTP: "Invalid verification code";
    readonly OTP_EXPIRED: "Verification code has expired";
    readonly REQUIRED_FIELD: "This field is required";
    readonly INVALID_FILE_TYPE: "Invalid file type";
    readonly FILE_TOO_LARGE: "File size exceeds maximum limit";
    readonly TOO_MANY_REQUESTS: "Too many requests. Please try again later";
    readonly OTP_RATE_LIMIT: "Too many OTP requests. Please wait before requesting again";
    readonly KEY_EXCHANGE_FAILED: "Failed to exchange encryption keys";
    readonly DECRYPTION_FAILED: "Failed to decrypt message";
    readonly ENCRYPTION_FAILED: "Failed to encrypt message";
    readonly INVALID_SIGNATURE: "Invalid message signature";
    readonly INTERNAL_SERVER_ERROR: "An internal server error occurred";
    readonly SERVICE_UNAVAILABLE: "Service temporarily unavailable";
    readonly MAINTENANCE_MODE: "Service is under maintenance";
    readonly USER_NOT_FOUND: "User not found";
    readonly CONTACT_ALREADY_EXISTS: "Contact already exists";
    readonly CONTACT_NOT_FOUND: "Contact not found";
    readonly GROUP_NOT_FOUND: "Group not found";
    readonly NOT_GROUP_MEMBER: "You are not a member of this group";
    readonly GROUP_FULL: "Group has reached maximum member limit";
    readonly INSUFFICIENT_GROUP_PERMISSIONS: "Insufficient group permissions";
    readonly MESSAGE_NOT_FOUND: "Message not found";
    readonly MESSAGE_ALREADY_DELETED: "Message has already been deleted";
    readonly CANNOT_DELETE_MESSAGE: "You cannot delete this message";
    readonly MEDIA_NOT_FOUND: "Media file not found";
    readonly MEDIA_UPLOAD_FAILED: "Failed to upload media file";
    readonly MEDIA_DOWNLOAD_FAILED: "Failed to download media file";
};
//# sourceMappingURL=errors.d.ts.map