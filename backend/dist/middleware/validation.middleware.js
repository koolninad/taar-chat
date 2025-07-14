"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthSchemas = exports.mediaSchemas = exports.signalSchemas = exports.groupSchemas = exports.messageSchemas = exports.userSchemas = exports.authSchemas = exports.commonSchemas = exports.validate = void 0;
const joi_1 = __importDefault(require("joi"));
const errors_1 = require("../utils/errors");
const validate = (schema) => {
    return (req, res, next) => {
        try {
            if (schema.body) {
                const { error, value } = schema.body.validate(req.body);
                if (error) {
                    throw new errors_1.ValidationError(error.details[0]?.message || 'Invalid request body', error.details[0]?.path?.join('.') || 'body', req.body);
                }
                req.body = value;
            }
            if (schema.params) {
                const { error, value } = schema.params.validate(req.params);
                if (error) {
                    throw new errors_1.ValidationError(error.details[0]?.message || 'Invalid request parameters', error.details[0]?.path?.join('.') || 'params', req.params);
                }
                req.params = value;
            }
            if (schema.query) {
                const { error, value } = schema.query.validate(req.query);
                if (error) {
                    throw new errors_1.ValidationError(error.details[0]?.message || 'Invalid query parameters', error.details[0]?.path?.join('.') || 'query', req.query);
                }
                req.query = value;
            }
            if (schema.headers) {
                const { error, value } = schema.headers.validate(req.headers);
                if (error) {
                    throw new errors_1.ValidationError(error.details[0]?.message || 'Invalid headers', error.details[0]?.path?.join('.') || 'headers', req.headers);
                }
                req.headers = { ...req.headers, ...value };
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
exports.validate = validate;
exports.commonSchemas = {
    uuid: joi_1.default.string().uuid().required(),
    phoneNumber: joi_1.default.string()
        .pattern(/^\+?[1-9]\d{9,14}$/)
        .required()
        .messages({
        'string.pattern.base': 'Phone number must be in international format'
    }),
    countryCode: joi_1.default.string()
        .pattern(/^\+\d{1,4}$/)
        .required()
        .messages({
        'string.pattern.base': 'Country code must start with + followed by 1-4 digits'
    }),
    otp: joi_1.default.string()
        .length(6)
        .pattern(/^\d{6}$/)
        .required()
        .messages({
        'string.length': 'OTP must be exactly 6 digits',
        'string.pattern.base': 'OTP must contain only digits'
    }),
    pagination: {
        page: joi_1.default.number().integer().min(1).default(1),
        limit: joi_1.default.number().integer().min(1).max(100).default(20)
    },
    messageType: joi_1.default.string().valid('TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION', 'CONTACT', 'STICKER').default('TEXT')
};
exports.authSchemas = {
    sendOtp: {
        body: joi_1.default.object({
            phoneNumber: exports.commonSchemas.phoneNumber,
            countryCode: exports.commonSchemas.countryCode
        })
    },
    verifyOtp: {
        body: joi_1.default.object({
            phoneNumber: exports.commonSchemas.phoneNumber,
            countryCode: exports.commonSchemas.countryCode,
            otpCode: exports.commonSchemas.otp,
            userInfo: joi_1.default.object({
                name: joi_1.default.string().min(1).max(255).optional(),
                identityKey: joi_1.default.string().required().messages({
                    'any.required': 'Signal identity key is required'
                })
            }).optional()
        })
    },
    refreshToken: {
        body: joi_1.default.object({
            refreshToken: joi_1.default.string().required()
        })
    },
    updateProfile: {
        body: joi_1.default.object({
            name: joi_1.default.string().min(1).max(255).optional(),
            about: joi_1.default.string().max(500).optional(),
            avatarUrl: joi_1.default.string().uri().optional()
        }).min(1)
    }
};
exports.userSchemas = {
    getUserById: {
        params: joi_1.default.object({
            userId: exports.commonSchemas.uuid
        })
    },
    searchUsers: {
        query: joi_1.default.object({
            query: joi_1.default.string().min(2).max(255).required(),
            limit: joi_1.default.number().integer().min(1).max(50).default(20)
        })
    },
    addContact: {
        body: joi_1.default.object({
            phoneNumber: exports.commonSchemas.phoneNumber,
            customName: joi_1.default.string().min(1).max(255).optional()
        })
    },
    updateContactName: {
        params: joi_1.default.object({
            contactId: exports.commonSchemas.uuid
        }),
        body: joi_1.default.object({
            customName: joi_1.default.string().min(1).max(255).required()
        })
    },
    toggleBlock: {
        params: joi_1.default.object({
            contactId: exports.commonSchemas.uuid
        }),
        body: joi_1.default.object({
            isBlocked: joi_1.default.boolean().required()
        })
    },
    toggleMute: {
        params: joi_1.default.object({
            contactId: exports.commonSchemas.uuid
        }),
        body: joi_1.default.object({
            isMuted: joi_1.default.boolean().required()
        })
    },
    removeContact: {
        params: joi_1.default.object({
            contactId: exports.commonSchemas.uuid
        })
    },
    updateOnlineStatus: {
        body: joi_1.default.object({
            isOnline: joi_1.default.boolean().required()
        })
    },
    importContacts: {
        body: joi_1.default.object({
            contacts: joi_1.default.array().items(joi_1.default.object({
                phoneNumber: exports.commonSchemas.phoneNumber,
                name: joi_1.default.string().min(1).max(255).optional()
            })).min(1).max(100).required()
        })
    }
};
exports.messageSchemas = {
    sendMessage: {
        body: joi_1.default.object({
            recipientId: exports.commonSchemas.uuid.optional(),
            groupId: exports.commonSchemas.uuid.optional(),
            encryptedContent: joi_1.default.string().base64().required(),
            messageType: exports.commonSchemas.messageType,
            replyToId: exports.commonSchemas.uuid.optional(),
            mediaFileId: exports.commonSchemas.uuid.optional()
        }).xor('recipientId', 'groupId')
    },
    getMessages: {
        params: joi_1.default.object({
            chatId: exports.commonSchemas.uuid
        }),
        query: joi_1.default.object({
            ...exports.commonSchemas.pagination,
            before: joi_1.default.string().isoDate().optional(),
            after: joi_1.default.string().isoDate().optional()
        })
    },
    markAsDelivered: {
        params: joi_1.default.object({
            messageId: exports.commonSchemas.uuid
        })
    },
    markAsRead: {
        params: joi_1.default.object({
            messageId: exports.commonSchemas.uuid
        })
    },
    deleteMessage: {
        params: joi_1.default.object({
            messageId: exports.commonSchemas.uuid
        }),
        body: joi_1.default.object({
            deleteForEveryone: joi_1.default.boolean().default(false)
        })
    }
};
exports.groupSchemas = {
    createGroup: {
        body: joi_1.default.object({
            name: joi_1.default.string().min(1).max(255).required(),
            description: joi_1.default.string().max(500).optional(),
            memberIds: joi_1.default.array().items(exports.commonSchemas.uuid).min(1).max(255).required(),
            senderKeyDistribution: joi_1.default.string().base64().required()
        })
    },
    updateGroup: {
        params: joi_1.default.object({
            groupId: exports.commonSchemas.uuid
        }),
        body: joi_1.default.object({
            name: joi_1.default.string().min(1).max(255).optional(),
            description: joi_1.default.string().max(500).optional(),
            avatarUrl: joi_1.default.string().uri().optional()
        }).min(1)
    },
    addMembers: {
        params: joi_1.default.object({
            groupId: exports.commonSchemas.uuid
        }),
        body: joi_1.default.object({
            memberIds: joi_1.default.array().items(exports.commonSchemas.uuid).min(1).max(50).required(),
            senderKeyDistribution: joi_1.default.string().base64().required()
        })
    },
    removeMember: {
        params: joi_1.default.object({
            groupId: exports.commonSchemas.uuid,
            memberId: exports.commonSchemas.uuid
        })
    },
    leaveGroup: {
        params: joi_1.default.object({
            groupId: exports.commonSchemas.uuid
        })
    },
    updateMemberRole: {
        params: joi_1.default.object({
            groupId: exports.commonSchemas.uuid,
            memberId: exports.commonSchemas.uuid
        }),
        body: joi_1.default.object({
            role: joi_1.default.string().valid('ADMIN', 'MEMBER').required()
        })
    }
};
exports.signalSchemas = {
    uploadPrekeys: {
        body: joi_1.default.object({
            prekeys: joi_1.default.array().items(joi_1.default.object({
                keyId: joi_1.default.number().integer().min(1).required(),
                publicKey: joi_1.default.string().base64().required(),
                signature: joi_1.default.string().base64().required()
            })).min(1).max(100).required()
        })
    },
    uploadSignedPrekey: {
        body: joi_1.default.object({
            keyId: joi_1.default.number().integer().min(1).required(),
            publicKey: joi_1.default.string().base64().required(),
            signature: joi_1.default.string().base64().required()
        })
    },
    getPrekeys: {
        params: joi_1.default.object({
            userId: exports.commonSchemas.uuid
        }),
        query: joi_1.default.object({
            count: joi_1.default.number().integer().min(1).max(10).default(1)
        })
    },
    getIdentityKey: {
        params: joi_1.default.object({
            userId: exports.commonSchemas.uuid
        })
    }
};
exports.mediaSchemas = {
    uploadMedia: {
        body: joi_1.default.object({
            filename: joi_1.default.string().min(1).max(255).required(),
            mimeType: joi_1.default.string().required(),
            encryptionKey: joi_1.default.string().base64().optional()
        })
    },
    getMedia: {
        params: joi_1.default.object({
            mediaId: exports.commonSchemas.uuid
        })
    },
    deleteMedia: {
        params: joi_1.default.object({
            mediaId: exports.commonSchemas.uuid
        })
    }
};
exports.healthSchemas = {
    detailedHealth: {
        query: joi_1.default.object({
            includeServices: joi_1.default.boolean().default(false)
        })
    }
};
//# sourceMappingURL=validation.middleware.js.map