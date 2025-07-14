// Load environment variables first
import dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import { config } from '@/config';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '3001';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://postgres:password@localhost:5432/taar_test';
process.env.REDIS_URL = process.env.TEST_REDIS_URL || 'redis://localhost:6379/1';

// Mock external services for testing
jest.mock('@/services/sms.service', () => ({
  SmsService: {
    sendOtp: jest.fn().mockResolvedValue(true),
    sendWelcomeMessage: jest.fn().mockResolvedValue(true),
    validatePhoneNumber: jest.fn().mockReturnValue(true),
    formatPhoneNumber: jest.fn().mockImplementation((phone) => phone)
  }
}));

// Mock services that were using AWS SDK (now using mock implementations)
// No need to mock aws-sdk since it's been removed

// Mock Signal Protocol for testing
jest.mock('@signalapp/libsignal-client', () => ({
  generateIdentityKeyPair: jest.fn().mockReturnValue({
    publicKey: {
      serialize: () => Buffer.from('mock-public-key')
    },
    privateKey: {
      serialize: () => Buffer.from('mock-private-key')
    }
  }),
  generateRegistrationId: jest.fn().mockReturnValue(12345),
  generatePreKey: jest.fn().mockReturnValue({
    publicKey: () => ({
      serialize: () => Buffer.from('mock-prekey-public')
    }),
    privateKey: () => ({
      serialize: () => Buffer.from('mock-prekey-private')
    })
  }),
  generateSignedPreKey: jest.fn().mockReturnValue({
    publicKey: () => ({
      serialize: () => Buffer.from('mock-signed-prekey-public')
    }),
    privateKey: () => ({
      serialize: () => Buffer.from('mock-signed-prekey-private')
    }),
    signature: () => Buffer.from('mock-signature')
  }),
  PrivateKey: {
    deserialize: jest.fn().mockReturnValue({})
  },
  PublicKey: {
    deserialize: jest.fn().mockReturnValue({})
  },
  PreKeyBundle: {
    new: jest.fn().mockReturnValue({})
  },
  SessionBuilder: {
    new: jest.fn().mockReturnValue({
      processPreKeyBundle: jest.fn().mockResolvedValue(undefined)
    })
  },
  SessionCipher: {
    new: jest.fn().mockReturnValue({
      encrypt: jest.fn().mockResolvedValue({
        type: () => 3,
        serialize: () => Buffer.from('mock-encrypted-message')
      }),
      decrypt: jest.fn().mockResolvedValue(Buffer.from('decrypted message'))
    })
  },
  GroupSessionBuilder: {
    new: jest.fn().mockReturnValue({
      createSenderKeyDistributionMessage: jest.fn().mockResolvedValue({
        serialize: () => Buffer.from('mock-sender-key-distribution')
      }),
      serialize: () => Buffer.from('mock-group-session')
    })
  },
  GroupCipher: {
    new: jest.fn().mockReturnValue({
      encrypt: jest.fn().mockResolvedValue(Buffer.from('mock-group-encrypted')),
      decrypt: jest.fn().mockResolvedValue(Buffer.from('decrypted group message'))
    })
  },
  MessageType: {
    PreKey: 3,
    Whisper: 1
  }
}));

// Increase timeout for tests
jest.setTimeout(30000);

console.log('Test environment configured');