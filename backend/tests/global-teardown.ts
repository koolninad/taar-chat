import { DatabaseService } from '@/services/database.service';
import { RedisService } from '@/services/redis.service';

export default async (): Promise<void> => {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    // Clean up test data
    await DatabaseService.clearTestData();
    console.log('✅ Test data cleaned');
    
    // Disconnect from services
    await DatabaseService.disconnect();
    console.log('✅ Database disconnected');
    
    await RedisService.disconnect();
    console.log('✅ Redis disconnected');
    
  } catch (error) {
    console.error('❌ Failed to clean up test environment:', error);
  }
};