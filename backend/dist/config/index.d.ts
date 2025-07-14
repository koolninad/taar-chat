export declare const config: {
    readonly server: {
        readonly env: "development" | "staging" | "production" | "test";
        readonly port: number;
        readonly isDevelopment: boolean;
        readonly isProduction: boolean;
        readonly isStaging: boolean;
    };
    readonly api: {
        readonly version: string;
    };
    readonly database: {
        readonly url: string;
    };
    readonly redis: {
        readonly url: string;
        readonly password: string | undefined;
    };
    readonly jwt: {
        readonly secret: string;
        readonly refreshSecret: string;
        readonly expiresIn: string;
        readonly refreshExpiresIn: string;
    };
    readonly aws: {
        readonly region: string;
        readonly accessKeyId: string;
        readonly secretAccessKey: string;
        readonly s3: {
            readonly bucket: string;
        };
        readonly sns: {
            readonly smsSenderId: string;
        };
    };
    readonly signal: {
        readonly serverKeyId: string;
        readonly serverPrivateKey: string;
    };
    readonly rateLimit: {
        readonly windowMs: number;
        readonly maxRequests: number;
    };
    readonly otp: {
        readonly expiresInMinutes: number;
        readonly length: number;
        readonly maxAttempts: number;
    };
    readonly logging: {
        readonly level: "error" | "warn" | "info" | "debug";
        readonly filePath: string;
    };
    readonly cors: {
        readonly allowedOrigins: string[];
    };
    readonly websocket: {
        readonly port: number;
        readonly heartbeatInterval: number;
        readonly connectionTimeout: number;
    };
    readonly upload: {
        readonly maxFileSize: number;
        readonly allowedFileTypes: string[];
    };
    readonly monitoring: {
        readonly healthCheckInterval: number;
        readonly metricsEnabled: boolean;
    };
};
export type Config = typeof config;
//# sourceMappingURL=index.d.ts.map