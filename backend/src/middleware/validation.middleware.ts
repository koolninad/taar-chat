import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ValidationError } from '../utils/errors';

/**
 * Middleware factory for request validation
 */
export const validate = (schema: {
  body?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  headers?: Joi.ObjectSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate body
      if (schema.body) {
        const { error, value } = schema.body.validate(req.body);
        if (error) {
          throw new ValidationError(
            error.details[0]?.message || 'Invalid request body',
            error.details[0]?.path?.join('.') || 'body',
            req.body
          );
        }
        req.body = value;
      }

      // Validate params
      if (schema.params) {
        const { error, value } = schema.params.validate(req.params);
        if (error) {
          throw new ValidationError(
            error.details[0]?.message || 'Invalid request parameters',
            error.details[0]?.path?.join('.') || 'params',
            req.params
          );
        }
        req.params = value;
      }

      // Validate query
      if (schema.query) {
        const { error, value } = schema.query.validate(req.query);
        if (error) {
          throw new ValidationError(
            error.details[0]?.message || 'Invalid query parameters',
            error.details[0]?.path?.join('.') || 'query',
            req.query
          );
        }
        req.query = value;
      }

      // Validate headers
      if (schema.headers) {
        const { error, value } = schema.headers.validate(req.headers);
        if (error) {
          throw new ValidationError(
            error.details[0]?.message || 'Invalid headers',
            error.details[0]?.path?.join('.') || 'headers',
            req.headers
          );
        }
        req.headers = { ...req.headers, ...value };
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Common validation schemas
 */
export const commonSchemas = {
  uuid: Joi.string().uuid().required(),
  phoneNumber: Joi.string()
    .pattern(/^\+?[1-9]\d{9,14}$/)
    .required()
    .messages({
      'string.pattern.base': 'Phone number must be in international format'
    }),
  countryCode: Joi.string()
    .pattern(/^\+\d{1,4}$/)
    .required()
    .messages({
      'string.pattern.base': 'Country code must start with + followed by 1-4 digits'
    }),
  otp: Joi.string()
    .length(6)
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.length': 'OTP must be exactly 6 digits',
      'string.pattern.base': 'OTP must contain only digits'
    }),
  pagination: {
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  },
  messageType: Joi.string().valid(
    'TEXT', 'IMAGE', 'VIDEO', 'AUDIO', 'DOCUMENT', 'LOCATION', 'CONTACT', 'STICKER'
  ).default('TEXT')
};

/**
 * Authentication validation schemas
 */
export const authSchemas = {
  sendOtp: {
    body: Joi.object({
      phoneNumber: commonSchemas.phoneNumber,
      countryCode: commonSchemas.countryCode
    })
  },

  verifyOtp: {
    body: Joi.object({
      phoneNumber: commonSchemas.phoneNumber,
      countryCode: commonSchemas.countryCode,
      otpCode: commonSchemas.otp,
      userInfo: Joi.object({
        name: Joi.string().min(1).max(255).optional(),
        identityKey: Joi.string().required().messages({
          'any.required': 'Signal identity key is required'
        })
      }).optional()
    })
  },

  refreshToken: {
    body: Joi.object({
      refreshToken: Joi.string().required()
    })
  },

  updateProfile: {
    body: Joi.object({
      name: Joi.string().min(1).max(255).optional(),
      about: Joi.string().max(500).optional(),
      avatarUrl: Joi.string().uri().optional()
    }).min(1)
  }
};

/**
 * User validation schemas
 */
export const userSchemas = {
  getUserById: {
    params: Joi.object({
      userId: commonSchemas.uuid
    })
  },

  searchUsers: {
    query: Joi.object({
      query: Joi.string().min(2).max(255).required(),
      limit: Joi.number().integer().min(1).max(50).default(20)
    })
  },

  addContact: {
    body: Joi.object({
      phoneNumber: commonSchemas.phoneNumber,
      customName: Joi.string().min(1).max(255).optional()
    })
  },

  updateContactName: {
    params: Joi.object({
      contactId: commonSchemas.uuid
    }),
    body: Joi.object({
      customName: Joi.string().min(1).max(255).required()
    })
  },

  toggleBlock: {
    params: Joi.object({
      contactId: commonSchemas.uuid
    }),
    body: Joi.object({
      isBlocked: Joi.boolean().required()
    })
  },

  toggleMute: {
    params: Joi.object({
      contactId: commonSchemas.uuid
    }),
    body: Joi.object({
      isMuted: Joi.boolean().required()
    })
  },

  removeContact: {
    params: Joi.object({
      contactId: commonSchemas.uuid
    })
  },

  updateOnlineStatus: {
    body: Joi.object({
      isOnline: Joi.boolean().required()
    })
  },

  importContacts: {
    body: Joi.object({
      contacts: Joi.array().items(
        Joi.object({
          phoneNumber: commonSchemas.phoneNumber,
          name: Joi.string().min(1).max(255).optional()
        })
      ).min(1).max(100).required()
    })
  }
};

/**
 * Message validation schemas
 */
export const messageSchemas = {
  sendMessage: {
    body: Joi.object({
      recipientId: commonSchemas.uuid.optional(),
      groupId: commonSchemas.uuid.optional(),
      encryptedContent: Joi.string().base64().required(),
      messageType: commonSchemas.messageType,
      replyToId: commonSchemas.uuid.optional(),
      mediaFileId: commonSchemas.uuid.optional()
    }).xor('recipientId', 'groupId')
  },

  getMessages: {
    params: Joi.object({
      chatId: commonSchemas.uuid
    }),
    query: Joi.object({
      ...commonSchemas.pagination,
      before: Joi.string().isoDate().optional(),
      after: Joi.string().isoDate().optional()
    })
  },

  markAsDelivered: {
    params: Joi.object({
      messageId: commonSchemas.uuid
    })
  },

  markAsRead: {
    params: Joi.object({
      messageId: commonSchemas.uuid
    })
  },

  deleteMessage: {
    params: Joi.object({
      messageId: commonSchemas.uuid
    }),
    body: Joi.object({
      deleteForEveryone: Joi.boolean().default(false)
    })
  }
};

/**
 * Group validation schemas
 */
export const groupSchemas = {
  createGroup: {
    body: Joi.object({
      name: Joi.string().min(1).max(255).required(),
      description: Joi.string().max(500).optional(),
      memberIds: Joi.array().items(commonSchemas.uuid).min(1).max(255).required(),
      senderKeyDistribution: Joi.string().base64().required()
    })
  },

  updateGroup: {
    params: Joi.object({
      groupId: commonSchemas.uuid
    }),
    body: Joi.object({
      name: Joi.string().min(1).max(255).optional(),
      description: Joi.string().max(500).optional(),
      avatarUrl: Joi.string().uri().optional()
    }).min(1)
  },

  addMembers: {
    params: Joi.object({
      groupId: commonSchemas.uuid
    }),
    body: Joi.object({
      memberIds: Joi.array().items(commonSchemas.uuid).min(1).max(50).required(),
      senderKeyDistribution: Joi.string().base64().required()
    })
  },

  removeMember: {
    params: Joi.object({
      groupId: commonSchemas.uuid,
      memberId: commonSchemas.uuid
    })
  },

  leaveGroup: {
    params: Joi.object({
      groupId: commonSchemas.uuid
    })
  },

  updateMemberRole: {
    params: Joi.object({
      groupId: commonSchemas.uuid,
      memberId: commonSchemas.uuid
    }),
    body: Joi.object({
      role: Joi.string().valid('ADMIN', 'MEMBER').required()
    })
  }
};

/**
 * Signal Protocol validation schemas
 */
export const signalSchemas = {
  uploadPrekeys: {
    body: Joi.object({
      prekeys: Joi.array().items(
        Joi.object({
          keyId: Joi.number().integer().min(1).required(),
          publicKey: Joi.string().base64().required(),
          signature: Joi.string().base64().required()
        })
      ).min(1).max(100).required()
    })
  },

  uploadSignedPrekey: {
    body: Joi.object({
      keyId: Joi.number().integer().min(1).required(),
      publicKey: Joi.string().base64().required(),
      signature: Joi.string().base64().required()
    })
  },

  getPrekeys: {
    params: Joi.object({
      userId: commonSchemas.uuid
    }),
    query: Joi.object({
      count: Joi.number().integer().min(1).max(10).default(1)
    })
  },

  getIdentityKey: {
    params: Joi.object({
      userId: commonSchemas.uuid
    })
  }
};

/**
 * Media validation schemas
 */
export const mediaSchemas = {
  uploadMedia: {
    body: Joi.object({
      filename: Joi.string().min(1).max(255).required(),
      mimeType: Joi.string().required(),
      encryptionKey: Joi.string().base64().optional()
    })
  },

  getMedia: {
    params: Joi.object({
      mediaId: commonSchemas.uuid
    })
  },

  deleteMedia: {
    params: Joi.object({
      mediaId: commonSchemas.uuid
    })
  }
};

/**
 * Health check schemas
 */
export const healthSchemas = {
  detailedHealth: {
    query: Joi.object({
      includeServices: Joi.boolean().default(false)
    })
  }
};