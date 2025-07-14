import { PrismaClient } from '@prisma/client';
declare class DatabaseService {
    private static instance;
    static get client(): PrismaClient;
    static connect(): Promise<void>;
    static disconnect(): Promise<void>;
    static healthCheck(): Promise<boolean>;
    static clearTestData(): Promise<void>;
    static transaction<T>(fn: (prisma: any) => Promise<T>): Promise<T>;
    static cleanupExpiredData(): Promise<void>;
    static checkMigrationStatus(): Promise<boolean>;
}
export { DatabaseService };
//# sourceMappingURL=database.service.d.ts.map