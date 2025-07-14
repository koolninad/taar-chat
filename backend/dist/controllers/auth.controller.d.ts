import { Request, Response, NextFunction } from 'express';
export declare const sendOtp: (req: Request, res: Response, next: NextFunction) => void;
export declare const verifyOtp: (req: Request, res: Response, next: NextFunction) => void;
export declare const refreshToken: (req: Request, res: Response, next: NextFunction) => void;
export declare const logout: (req: Request, res: Response, next: NextFunction) => void;
export declare const revokeAllSessions: (req: Request, res: Response, next: NextFunction) => void;
export declare const getProfile: (req: Request, res: Response, next: NextFunction) => void;
export declare const updateProfile: (req: Request, res: Response, next: NextFunction) => void;
export declare const checkAuth: (req: Request, res: Response, next: NextFunction) => void;
export declare const requestAccountDeletion: (req: Request, res: Response, next: NextFunction) => void;
export declare const changePhoneNumberRequest: (req: Request, res: Response, next: NextFunction) => void;
export declare const verifyPhoneNumberChange: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=auth.controller.d.ts.map