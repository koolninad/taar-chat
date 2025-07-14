import { Request, Response } from 'express';
export declare const sendSecureMessage: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const decryptMessage: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getEncryptedMessages: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const processKeyExchange: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const verifyConversation: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getSessionInfo: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getSecureMessagingStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const batchDecryptMessages: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const reEncryptMessage: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getConversationSecurity: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const exportConversationKeys: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const secureMessagingHealthCheck: (req: Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=secure-message.controller.d.ts.map