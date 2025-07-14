import winston from 'winston';
export declare const logger: winston.Logger;
export declare const performanceLogger: {
    logRequest: (method: string, url: string, duration: number, statusCode: number) => void;
    logWebSocket: (event: string, duration: number, connectionId: string) => void;
    logDatabase: (query: string, duration: number) => void;
};
export declare const securityLogger: {
    logAuth: (event: string, userId?: string, ip?: string, userAgent?: string) => void;
    logSignalProtocol: (event: string, userId: string, details?: any) => void;
    logRateLimit: (ip: string, endpoint: string) => void;
};
export declare const businessLogger: {
    logMessage: (senderId: string, recipientId: string, messageType: string) => void;
    logGroup: (event: string, groupId: string, userId: string) => void;
};
//# sourceMappingURL=logger.d.ts.map