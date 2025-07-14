import { Request, Response } from 'express';
export declare const sendMessage: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getMessages: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const markAsDelivered: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const markAsRead: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const deleteMessage: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getChatList: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const searchMessages: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getUnreadCount: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const markAllAsRead: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getDeliveryStatus: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const forwardMessage: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getMessageReactions: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const addReaction: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const removeReaction: (req: Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=message.controller.d.ts.map