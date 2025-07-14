import { Request, Response, NextFunction } from 'express';
export declare const healthCheck: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const readinessCheck: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const livenessCheck: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=healthCheck.d.ts.map