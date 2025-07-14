import winston from 'winston';
import path from 'path';
import { config } from '../config';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logging.level,
  format: logFormat,
  defaultMeta: { service: 'taar-backend' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.simple()
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(config.logging.filePath, 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 10
    }),
    
    // Separate file for error logs
    new winston.transports.File({
      filename: path.join(config.logging.filePath, 'error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(config.logging.filePath, 'exceptions.log')
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(config.logging.filePath, 'rejections.log')
    })
  ]
});

// Create logs directory if it doesn't exist
import fs from 'fs';
if (!fs.existsSync(config.logging.filePath)) {
  fs.mkdirSync(config.logging.filePath, { recursive: true });
}

// Performance logger for API endpoints
export const performanceLogger = {
  logRequest: (method: string, url: string, duration: number, statusCode: number) => {
    const level = statusCode >= 400 ? 'warn' : 'info';
    logger.log(level, 'API Request', {
      method,
      url,
      duration: `${duration}ms`,
      statusCode,
      type: 'performance'
    });
  },
  
  logWebSocket: (event: string, duration: number, connectionId: string) => {
    logger.info('WebSocket Event', {
      event,
      duration: `${duration}ms`,
      connectionId,
      type: 'websocket'
    });
  },
  
  logDatabase: (query: string, duration: number) => {
    logger.debug('Database Query', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      duration: `${duration}ms`,
      type: 'database'
    });
  }
};

// Security logger for audit trails
export const securityLogger = {
  logAuth: (event: string, userId?: string, ip?: string, userAgent?: string) => {
    logger.info('Authentication Event', {
      event,
      userId,
      ip,
      userAgent,
      type: 'security'
    });
  },
  
  logSignalProtocol: (event: string, userId: string, details?: any) => {
    logger.info('Signal Protocol Event', {
      event,
      userId,
      details,
      type: 'signal'
    });
  },
  
  logRateLimit: (ip: string, endpoint: string) => {
    logger.warn('Rate Limit Exceeded', {
      ip,
      endpoint,
      type: 'rate-limit'
    });
  }
};

// Business logic logger
export const businessLogger = {
  logMessage: (senderId: string, recipientId: string, messageType: string) => {
    logger.info('Message Sent', {
      senderId,
      recipientId,
      messageType,
      type: 'business'
    });
  },
  
  logGroup: (event: string, groupId: string, userId: string) => {
    logger.info('Group Event', {
      event,
      groupId,
      userId,
      type: 'business'
    });
  }
};