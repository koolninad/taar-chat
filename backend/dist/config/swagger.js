"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerSpecs = exports.swaggerDocs = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const index_1 = require("./index");
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Taar Chat API',
            version: '1.0.0',
            description: `
        A secure messaging API built with Signal Protocol for end-to-end encryption.
        
        ## Features
        - End-to-end encryption with Signal Protocol
        - Real-time messaging via WebSocket
        - Media file sharing with encryption support
        - Group messaging with advanced management
        - User management and contact system
        - Phone-based authentication with OTP
        
        ## Authentication
        Most endpoints require authentication via JWT Bearer token.
        Use the /auth/send-otp and /auth/verify-otp endpoints to get started.
        
        ## Rate Limiting
        API endpoints have rate limiting to prevent abuse.
        Limits are documented per endpoint.
        
        ## WebSocket Connection
        Real-time features are available via WebSocket at /ws
        Include your JWT token as a query parameter: /ws?token=your_jwt_token
      `,
            contact: {
                name: 'Taar Chat API Support',
                email: 'support@taarchat.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: `http://localhost:${index_1.config.server.port}`,
                description: 'Development server'
            },
            {
                url: 'https://api.taarchat.com',
                description: 'Production server'
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'JWT access token obtained from authentication endpoints'
                }
            },
            schemas: {
                Error: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: false
                        },
                        error: {
                            type: 'object',
                            properties: {
                                message: {
                                    type: 'string',
                                    example: 'Error description'
                                },
                                code: {
                                    type: 'string',
                                    example: 'ERROR_CODE'
                                },
                                statusCode: {
                                    type: 'integer',
                                    example: 400
                                },
                                details: {
                                    type: 'object',
                                    description: 'Additional error details (development only)'
                                }
                            }
                        }
                    }
                },
                Success: {
                    type: 'object',
                    properties: {
                        success: {
                            type: 'boolean',
                            example: true
                        },
                        message: {
                            type: 'string',
                            example: 'Operation completed successfully'
                        },
                        data: {
                            type: 'object',
                            description: 'Response data'
                        }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid',
                            example: '123e4567-e89b-12d3-a456-426614174000'
                        },
                        phoneNumber: {
                            type: 'string',
                            example: '+919876543210'
                        },
                        name: {
                            type: 'string',
                            example: 'John Doe'
                        },
                        about: {
                            type: 'string',
                            example: 'Hey there! I am using Taar.'
                        },
                        avatarUrl: {
                            type: 'string',
                            format: 'uri',
                            example: 'https://example.com/avatar.jpg'
                        },
                        isOnline: {
                            type: 'boolean',
                            example: true
                        },
                        lastSeen: {
                            type: 'string',
                            format: 'date-time',
                            example: '2023-12-01T10:00:00Z'
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time',
                            example: '2023-12-01T09:00:00Z'
                        }
                    }
                },
                Message: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        senderId: {
                            type: 'string',
                            format: 'uuid'
                        },
                        recipientId: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true
                        },
                        groupId: {
                            type: 'string',
                            format: 'uuid',
                            nullable: true
                        },
                        encryptedContent: {
                            type: 'string',
                            description: 'Base64 encoded encrypted message content'
                        },
                        messageType: {
                            type: 'string',
                            enum: ['TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION', 'CONTACT', 'STICKER']
                        },
                        status: {
                            type: 'string',
                            enum: ['SENT', 'DELIVERED', 'READ']
                        },
                        sentAt: {
                            type: 'string',
                            format: 'date-time'
                        },
                        deliveredAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true
                        },
                        readAt: {
                            type: 'string',
                            format: 'date-time',
                            nullable: true
                        }
                    }
                },
                Group: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        name: {
                            type: 'string',
                            example: 'Family Group'
                        },
                        description: {
                            type: 'string',
                            example: 'Our family chat group'
                        },
                        avatarUrl: {
                            type: 'string',
                            format: 'uri'
                        },
                        createdBy: {
                            type: 'string',
                            format: 'uuid'
                        },
                        memberCount: {
                            type: 'integer',
                            example: 5
                        },
                        isActive: {
                            type: 'boolean',
                            example: true
                        },
                        createdAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                MediaFile: {
                    type: 'object',
                    properties: {
                        id: {
                            type: 'string',
                            format: 'uuid'
                        },
                        filename: {
                            type: 'string',
                            example: 'document.pdf'
                        },
                        originalFilename: {
                            type: 'string',
                            example: 'my-document.pdf'
                        },
                        mimeType: {
                            type: 'string',
                            example: 'application/pdf'
                        },
                        fileSize: {
                            type: 'integer',
                            example: 1024000
                        },
                        isEncrypted: {
                            type: 'boolean',
                            example: true
                        },
                        uploadedAt: {
                            type: 'string',
                            format: 'date-time'
                        }
                    }
                },
                PreKeyBundle: {
                    type: 'object',
                    properties: {
                        identityKey: {
                            type: 'string',
                            description: 'Base64 encoded identity public key'
                        },
                        deviceId: {
                            type: 'integer',
                            example: 1
                        },
                        preKeyId: {
                            type: 'integer',
                            example: 12345
                        },
                        preKey: {
                            type: 'string',
                            description: 'Base64 encoded prekey public key'
                        },
                        signedPreKeyId: {
                            type: 'integer',
                            example: 67890
                        },
                        signedPreKey: {
                            type: 'string',
                            description: 'Base64 encoded signed prekey public key'
                        },
                        signedPreKeySignature: {
                            type: 'string',
                            description: 'Base64 encoded signature'
                        },
                        registrationId: {
                            type: 'integer',
                            example: 12345
                        }
                    }
                },
                Pagination: {
                    type: 'object',
                    properties: {
                        page: {
                            type: 'integer',
                            example: 1
                        },
                        limit: {
                            type: 'integer',
                            example: 20
                        },
                        total: {
                            type: 'integer',
                            example: 100
                        },
                        hasMore: {
                            type: 'boolean',
                            example: true
                        }
                    }
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Authentication required',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                error: {
                                    message: 'Authentication required',
                                    code: 'UNAUTHORIZED',
                                    statusCode: 401
                                }
                            }
                        }
                    }
                },
                ForbiddenError: {
                    description: 'Access denied',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                error: {
                                    message: 'Access denied',
                                    code: 'FORBIDDEN',
                                    statusCode: 403
                                }
                            }
                        }
                    }
                },
                NotFoundError: {
                    description: 'Resource not found',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                error: {
                                    message: 'Resource not found',
                                    code: 'NOT_FOUND',
                                    statusCode: 404
                                }
                            }
                        }
                    }
                },
                ValidationError: {
                    description: 'Request validation failed',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                error: {
                                    message: 'Validation failed',
                                    code: 'VALIDATION_ERROR',
                                    statusCode: 400,
                                    details: {
                                        field: 'phoneNumber',
                                        message: 'Phone number must be in international format'
                                    }
                                }
                            }
                        }
                    }
                },
                RateLimitError: {
                    description: 'Rate limit exceeded',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                error: {
                                    message: 'Too many requests from this IP, please try again later',
                                    code: 'RATE_LIMIT_EXCEEDED',
                                    statusCode: 429,
                                    details: {
                                        retryAfter: 300
                                    }
                                }
                            }
                        }
                    }
                },
                ServerError: {
                    description: 'Internal server error',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/Error'
                            },
                            example: {
                                success: false,
                                error: {
                                    message: 'Internal server error',
                                    code: 'INTERNAL_ERROR',
                                    statusCode: 500
                                }
                            }
                        }
                    }
                }
            }
        },
        tags: [
            {
                name: 'Authentication',
                description: 'User authentication and authorization'
            },
            {
                name: 'Users',
                description: 'User management and contacts'
            },
            {
                name: 'Messages',
                description: 'Messaging functionality'
            },
            {
                name: 'Groups',
                description: 'Group management'
            },
            {
                name: 'Media',
                description: 'File upload and download'
            },
            {
                name: 'Signal Protocol',
                description: 'End-to-end encryption with Signal Protocol'
            },
            {
                name: 'Health',
                description: 'System health and monitoring'
            }
        ],
        security: [
            {
                bearerAuth: []
            }
        ]
    },
    apis: [
        './src/routes/*.ts',
        './src/controllers/*.ts',
        './src/middleware/*.ts'
    ]
};
const specs = (0, swagger_jsdoc_1.default)(options);
exports.swaggerSpecs = specs;
const swaggerDocs = (app) => {
    app.use('/docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(specs, {
        explorer: true,
        customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info { margin: 50px 0 }
      .swagger-ui .info .title { color: #3b82f6 }
    `,
        customSiteTitle: 'Taar Chat API Documentation',
        swaggerOptions: {
            persistAuthorization: true,
            displayRequestDuration: true,
            filter: true,
            tryItOutEnabled: true
        }
    }));
    app.get('/docs.json', (req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.send(specs);
    });
    console.log(`📚 API Documentation available at: http://localhost:${index_1.config.server.port}/docs`);
};
exports.swaggerDocs = swaggerDocs;
//# sourceMappingURL=swagger.js.map