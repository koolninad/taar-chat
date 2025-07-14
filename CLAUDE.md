# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Taar (तार) is India's open-source, secure messaging application built with Flutter and the Signal protocol. The project aims to provide end-to-end encrypted messaging with Indian language support and privacy-first design principles.

## Development Commands

- `flutter run` - Run the app in development
- `flutter test` - Run unit tests
- `flutter build apk` - Build Android APK
- `flutter build ios` - Build iOS app
- `flutter analyze` - Static analysis
- `dart format .` - Format code
- `flutter pub get` - Install dependencies
- `flutter clean` - Clean build cache

## Project Architecture

### Directory Structure
```
lib/
├── core/
│   ├── theme/          # App colors, text styles, themes
│   ├── router/         # Navigation and routing
│   ├── constants/      # App-wide constants
│   └── utils/          # Utility functions
├── features/
│   ├── onboarding/     # Welcome, phone verification, profile setup
│   ├── chat/           # Chat list, chat screen, messages
│   ├── status/         # Status/Stories functionality
│   ├── settings/       # App settings and preferences
│   └── calls/          # Voice and video calls
└── shared/
    ├── widgets/        # Reusable UI components
    ├── models/         # Data models (ChatModel, MessageModel)
    └── services/       # Shared services
```

### Key Components

**Theme System**: 
- `AppColors` - Centralized color definitions
- `AppTextStyles` - Typography system using Google Fonts
- `AppTheme` - Light and dark theme configurations

**Navigation**: 
- Uses `go_router` for navigation
- Route definitions in `core/router/app_router.dart`
- Supports nested navigation and shell routes

**State Management**: 
- Ready for `flutter_bloc` implementation
- Model classes defined for chat and message data

## Implemented Features

### Onboarding Flow
- Welcome screen with feature highlights
- Phone number verification with OTP
- Profile setup with photo and details

### Main Chat Interface
- Tab-based navigation (Chats, Status, Calls)
- Chat list with search functionality
- Individual chat screens with message bubbles
- Message input with attachment options
- Call integration (voice/video)

### UI Components
- WhatsApp-inspired design with Indian touches
- Message status indicators (sent, delivered, read)
- Online/offline status
- Group chat support
- Voice message recording UI

### Settings & Privacy
- Comprehensive settings screen
- Privacy controls placeholder
- User profile management

## Technical Decisions

- **UI Framework**: Flutter with Material 3 design
- **Navigation**: go_router for declarative routing
- **State Management**: flutter_bloc (infrastructure ready)
- **Theme**: Custom theme system with light/dark mode
- **Typography**: Google Fonts (Inter)
- **License**: AGPL-3.0

## Mock Data

The app currently uses mock data for demonstration:
- Sample chat conversations
- Message types (text, media, audio)
- Contact lists and status updates
- Call history

## Next Steps for Production

1. **Backend Integration**: API services for authentication and messaging
2. **Signal Protocol**: Implement end-to-end encryption
3. **Real-time Messaging**: WebSocket integration
4. **Media Handling**: Image, video, audio processing
5. **Local Storage**: SQLite for chat history
6. **Push Notifications**: Firebase integration
7. **Localization**: Indian language support

## Development Notes

- Use `AppColors` and `AppTextStyles` for consistent theming
- Follow the established folder structure for new features
- All screens should be responsive and work on different screen sizes
- Implement proper error handling and loading states
- Follow Flutter best practices for widget composition