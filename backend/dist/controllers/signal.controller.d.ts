import { Request, Response } from 'express';
export declare const initializeSignal: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const generatePreKeys: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getPreKeyBundle: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getMyPreKeyBundle: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const rotateSignedPreKey: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getSessions: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const deleteSession: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const generateFingerprint: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const encryptMessage: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const decryptMessage: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getSignalStats: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const verifySafetyNumbers: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const resetIdentity: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const exportSignalData: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const importSignalData: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const signalHealthCheck: (req: Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=signal.controller.d.ts.map