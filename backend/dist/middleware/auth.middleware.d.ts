import { Request, Response, NextFunction } from 'express';
declare global {
    namespace Express {
        interface Request {
            user?: {
                userId: string;
                phoneNumber: string;
            };
        }
    }
}
export declare const authenticateToken: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const optionalAuth: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const requireActiveUser: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const authenticateApiKey: (req: Request, res: Response, next: NextFunction) => void;
export declare const extractUserId: (req: Request, res: Response, next: NextFunction) => void;
export declare const authorizeResourceAccess: (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAdmin: (req: Request, res: Response, next: NextFunction) => void;
export declare const createRateLimit: (windowMs?: number, max?: number, message?: string) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=auth.middleware.d.ts.map