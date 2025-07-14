import { DatabaseService } from '@/services/database.service';
import { RedisService } from '@/services/redis.service';

export default async (): Promise<void> => {
  console.log('🔧 Setting up test environment...');
  
  try {
    // Connect to test database
    await DatabaseService.connect();
    console.log('✅ Test database connected');
    
    // Connect to test Redis
    await RedisService.connect();
    console.log('✅ Test Redis connected');
    
    // Clean up any existing test data
    await DatabaseService.clearTestData();
    console.log('✅ Test data cleared');
    
  } catch (error) {
    console.error('❌ Failed to set up test environment:', error);
    throw error;
  }
};