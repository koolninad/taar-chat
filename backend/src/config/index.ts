import { z } from 'zod';

// Environment validation schema
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).pipe(z.number().min(1000).max(65535)).default('3000'),
  API_VERSION: z.string().default('v1'),
  
  // Database
  DATABASE_URL: z.string().url(),
  
  // Redis
  REDIS_URL: z.string().url(),
  REDIS_PASSWORD: z.string().optional(),
  
  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  
  // AWS
  AWS_REGION: z.string().default('ap-south-1'),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
  AWS_S3_BUCKET: z.string(),
  AWS_SNS_SMS_SENDER_ID: z.string().default('TAAR'),
  
  // Signal Protocol
  SIGNAL_SERVER_KEY_ID: z.string(),
  SIGNAL_SERVER_PRIVATE_KEY: z.string(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().transform(Number).default('900000'),
  RATE_LIMIT_MAX_REQUESTS: z.string().transform(Number).default('100'),
  
  // OTP
  OTP_EXPIRES_IN_MINUTES: z.string().transform(Number).default('5'),
  OTP_LENGTH: z.string().transform(Number).default('6'),
  OTP_MAX_ATTEMPTS: z.string().transform(Number).default('3'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  LOG_FILE_PATH: z.string().default('./logs'),
  
  // CORS
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
  
  // WebSocket
  WS_PORT: z.string().transform(Number).default('3001'),
  WS_HEARTBEAT_INTERVAL: z.string().transform(Number).default('30000'),
  WS_CONNECTION_TIMEOUT: z.string().transform(Number).default('60000'),
  
  // File Upload
  MAX_FILE_SIZE: z.string().transform(Number).default('104857600'), // 100MB
  ALLOWED_FILE_TYPES: z.string().default('image/jpeg,image/png,image/gif,video/mp4,audio/mpeg,application/pdf'),
  
  // Monitoring
  HEALTH_CHECK_INTERVAL: z.string().transform(Number).default('30000'),
  METRICS_ENABLED: z.string().transform(v => v === 'true').default('true')
});

// Validate environment variables
const env = envSchema.parse(process.env);

export const config = {
  server: {
    env: env.NODE_ENV,
    port: env.PORT,
    isDevelopment: env.NODE_ENV === 'development',
    isProduction: env.NODE_ENV === 'production',
    isStaging: env.NODE_ENV === 'staging'
  },
  
  api: {
    version: env.API_VERSION
  },
  
  database: {
    url: env.DATABASE_URL
  },
  
  redis: {
    url: env.REDIS_URL,
    password: env.REDIS_PASSWORD
  },
  
  jwt: {
    secret: env.JWT_SECRET,
    refreshSecret: env.JWT_REFRESH_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN
  },
  
  aws: {
    region: env.AWS_REGION,
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    s3: {
      bucket: env.AWS_S3_BUCKET
    },
    sns: {
      smsSenderId: env.AWS_SNS_SMS_SENDER_ID
    }
  },
  
  signal: {
    serverKeyId: env.SIGNAL_SERVER_KEY_ID,
    serverPrivateKey: env.SIGNAL_SERVER_PRIVATE_KEY
  },
  
  rateLimit: {
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    maxRequests: env.RATE_LIMIT_MAX_REQUESTS
  },
  
  otp: {
    expiresInMinutes: env.OTP_EXPIRES_IN_MINUTES,
    length: env.OTP_LENGTH,
    maxAttempts: env.OTP_MAX_ATTEMPTS
  },
  
  logging: {
    level: env.LOG_LEVEL,
    filePath: env.LOG_FILE_PATH
  },
  
  cors: {
    allowedOrigins: env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  },
  
  websocket: {
    port: env.WS_PORT,
    heartbeatInterval: env.WS_HEARTBEAT_INTERVAL,
    connectionTimeout: env.WS_CONNECTION_TIMEOUT
  },
  
  upload: {
    maxFileSize: env.MAX_FILE_SIZE,
    allowedFileTypes: env.ALLOWED_FILE_TYPES.split(',').map(type => type.trim())
  },
  
  monitoring: {
    healthCheckInterval: env.HEALTH_CHECK_INTERVAL,
    metricsEnabled: env.METRICS_ENABLED
  }
} as const;

// Type for the config object
export type Config = typeof config;