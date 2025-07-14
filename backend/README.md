# Taar Backend System

## Architecture Overview

### Tech Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Real-time**: Socket.io for WebSocket connections
- **Cache**: Redis for sessions and caching
- **File Storage**: AWS S3 for media files
- **Authentication**: Firebase Auth + JWT
- **Push Notifications**: Firebase Cloud Messaging (FCM)
- **OTP Service**: Firebase Auth (SMS)
- **Hosting**: AWS (ECS/EC2 with Load Balancer)
- **CI/CD**: GitHub Actions
- **Infrastructure**: Terraform
- **Monitoring**: AWS CloudWatch + Winston logging

### Microservices Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   API Gateway   │    │   Load Balancer │    │   CloudFront    │
│   (AWS ALB)     │    │   (AWS ALB)     │    │     (CDN)       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  Auth Service   │    │  Chat Service   │    │  Media Service  │
│   (Express)     │    │   (Express +    │    │   (Express +    │
│                 │    │   Socket.io)    │    │    AWS S3)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   PostgreSQL    │    │      Redis      │    │   Firebase      │
│   (RDS)         │    │   (ElastiCache) │    │  (Auth + FCM)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### API Endpoints Structure

#### Authentication Service
- `POST /auth/send-otp` - Send OTP via SMS
- `POST /auth/verify-otp` - Verify OTP and create account
- `POST /auth/login` - Login with phone number
- `POST /auth/refresh` - Refresh JWT tokens
- `POST /auth/logout` - Logout user
- `PUT /auth/profile` - Update user profile

#### Chat Service
- `GET /chats` - Get user's chat list
- `POST /chats` - Create new chat/group
- `GET /chats/:id/messages` - Get chat messages
- `POST /chats/:id/messages` - Send message
- `PUT /chats/:id` - Update chat settings
- `DELETE /chats/:id` - Delete chat
- `POST /chats/:id/members` - Add group members
- `DELETE /chats/:id/members/:userId` - Remove group member

#### User Service
- `GET /users/me` - Get current user
- `PUT /users/me` - Update profile
- `GET /users/contacts` - Get contacts
- `POST /users/contacts` - Add contact
- `GET /users/search` - Search users

#### Media Service
- `POST /media/upload` - Upload media files
- `GET /media/:id` - Get media file
- `DELETE /media/:id` - Delete media file

#### Status Service
- `GET /status` - Get status updates
- `POST /status` - Create status update
- `DELETE /status/:id` - Delete status

### Real-time Events (Socket.io)

#### Connection Events
- `connection` - Client connects
- `authenticate` - Authenticate socket connection
- `disconnect` - Client disconnects

#### Message Events
- `join_chat` - Join chat room
- `leave_chat` - Leave chat room
- `send_message` - Send message to chat
- `message_received` - Message received event
- `message_read` - Mark message as read
- `typing_start` - User started typing
- `typing_stop` - User stopped typing

#### Presence Events
- `user_online` - User came online
- `user_offline` - User went offline
- `last_seen_update` - Update last seen timestamp

### Database Schema (PostgreSQL)

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  about TEXT DEFAULT 'Hey there! I am using Taar.',
  avatar_url VARCHAR(500),
  last_seen TIMESTAMP,
  is_online BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Chats Table
```sql
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255),
  description TEXT,
  is_group BOOLEAN DEFAULT false,
  avatar_url VARCHAR(500),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### Messages Table
```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  content TEXT,
  message_type VARCHAR(20) DEFAULT 'text',
  media_url VARCHAR(500),
  reply_to_id UUID REFERENCES messages(id),
  is_forwarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Security Features

1. **Firebase Authentication**: Phone number verification with OTP
2. **JWT Tokens**: Access and refresh token strategy
3. **Rate Limiting**: API endpoint protection
4. **Input Validation**: Joi schema validation
5. **SQL Injection Protection**: Parameterized queries with Prisma
6. **CORS Configuration**: Secure cross-origin requests
7. **Helmet.js**: Security headers
8. **Environment Variables**: Secure configuration management

### Deployment Strategy

#### AWS Infrastructure
- **ECS Fargate**: Container orchestration
- **Application Load Balancer**: Traffic distribution
- **RDS PostgreSQL**: Managed database
- **ElastiCache Redis**: Managed cache
- **S3**: File storage
- **CloudFront**: CDN for media files
- **Route 53**: DNS management
- **Certificate Manager**: SSL certificates

#### CI/CD Pipeline
1. **GitHub Actions**: Automated workflows
2. **Docker**: Containerization
3. **ECR**: Container registry
4. **Terraform**: Infrastructure as code
5. **Environment Separation**: Dev, staging, production

### Monitoring & Logging

- **CloudWatch**: Application logs and metrics
- **Winston**: Structured logging
- **Health Checks**: Service monitoring
- **Error Tracking**: Comprehensive error handling
- **Performance Metrics**: Response time tracking