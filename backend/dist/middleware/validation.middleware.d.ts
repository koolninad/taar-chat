import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
export declare const validate: (schema: {
    body?: Joi.ObjectSchema;
    params?: Joi.ObjectSchema;
    query?: Joi.ObjectSchema;
    headers?: Joi.ObjectSchema;
}) => (req: Request, res: Response, next: NextFunction) => void;
export declare const commonSchemas: {
    uuid: Joi.StringSchema<string>;
    phoneNumber: Joi.StringSchema<string>;
    countryCode: Joi.StringSchema<string>;
    otp: Joi.StringSchema<string>;
    pagination: {
        page: Joi.NumberSchema<number>;
        limit: Joi.NumberSchema<number>;
    };
    messageType: Joi.StringSchema<string>;
};
export declare const authSchemas: {
    sendOtp: {
        body: Joi.ObjectSchema<any>;
    };
    verifyOtp: {
        body: Joi.ObjectSchema<any>;
    };
    refreshToken: {
        body: Joi.ObjectSchema<any>;
    };
    updateProfile: {
        body: Joi.ObjectSchema<any>;
    };
};
export declare const userSchemas: {
    getUserById: {
        params: Joi.ObjectSchema<any>;
    };
    searchUsers: {
        query: Joi.ObjectSchema<any>;
    };
    addContact: {
        body: Joi.ObjectSchema<any>;
    };
    updateContactName: {
        params: Joi.ObjectSchema<any>;
        body: Joi.ObjectSchema<any>;
    };
    toggleBlock: {
        params: Joi.ObjectSchema<any>;
        body: Joi.ObjectSchema<any>;
    };
    toggleMute: {
        params: Joi.ObjectSchema<any>;
        body: Joi.ObjectSchema<any>;
    };
    removeContact: {
        params: Joi.ObjectSchema<any>;
    };
    updateOnlineStatus: {
        body: Joi.ObjectSchema<any>;
    };
    importContacts: {
        body: Joi.ObjectSchema<any>;
    };
};
export declare const messageSchemas: {
    sendMessage: {
        body: Joi.ObjectSchema<any>;
    };
    getMessages: {
        params: Joi.ObjectSchema<any>;
        query: Joi.ObjectSchema<any>;
    };
    markAsDelivered: {
        params: Joi.ObjectSchema<any>;
    };
    markAsRead: {
        params: Joi.ObjectSchema<any>;
    };
    deleteMessage: {
        params: Joi.ObjectSchema<any>;
        body: Joi.ObjectSchema<any>;
    };
};
export declare const groupSchemas: {
    createGroup: {
        body: Joi.ObjectSchema<any>;
    };
    updateGroup: {
        params: Joi.ObjectSchema<any>;
        body: Joi.ObjectSchema<any>;
    };
    addMembers: {
        params: Joi.ObjectSchema<any>;
        body: Joi.ObjectSchema<any>;
    };
    removeMember: {
        params: Joi.ObjectSchema<any>;
    };
    leaveGroup: {
        params: Joi.ObjectSchema<any>;
    };
    updateMemberRole: {
        params: Joi.ObjectSchema<any>;
        body: Joi.ObjectSchema<any>;
    };
};
export declare const signalSchemas: {
    uploadPrekeys: {
        body: Joi.ObjectSchema<any>;
    };
    uploadSignedPrekey: {
        body: Joi.ObjectSchema<any>;
    };
    getPrekeys: {
        params: Joi.ObjectSchema<any>;
        query: Joi.ObjectSchema<any>;
    };
    getIdentityKey: {
        params: Joi.ObjectSchema<any>;
    };
};
export declare const mediaSchemas: {
    uploadMedia: {
        body: Joi.ObjectSchema<any>;
    };
    getMedia: {
        params: Joi.ObjectSchema<any>;
    };
    deleteMedia: {
        params: Joi.ObjectSchema<any>;
    };
};
export declare const healthSchemas: {
    detailedHealth: {
        query: Joi.ObjectSchema<any>;
    };
};
//# sourceMappingURL=validation.middleware.d.ts.map