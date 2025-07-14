import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../features/onboarding/presentation/pages/welcome_page.dart';
import '../../features/onboarding/presentation/pages/phone_verification_page.dart';
import '../../features/onboarding/presentation/pages/profile_setup_page.dart';
import '../../features/chat/presentation/pages/home_page.dart';
import '../../features/chat/presentation/pages/chat_page.dart';
import '../../features/settings/presentation/pages/settings_page.dart';
import '../../features/calls/presentation/pages/call_page.dart';

class AppRouter {
  static final _rootNavigatorKey = GlobalKey<NavigatorState>();
  static final _shellNavigatorKey = GlobalKey<NavigatorState>();

  static final GoRouter router = GoRouter(
    navigatorKey: _rootNavigatorKey,
    initialLocation: '/',
    routes: [
      // Onboarding routes
      GoRoute(
        path: '/',
        builder: (context, state) => const WelcomePage(),
      ),
      GoRoute(
        path: '/phone-verification',
        builder: (context, state) => const PhoneVerificationPage(),
      ),
      GoRoute(
        path: '/profile-setup',
        builder: (context, state) => const ProfileSetupPage(),
      ),
      
      // Main app routes
      ShellRoute(
        navigatorKey: _shellNavigatorKey,
        builder: (context, state, child) {
          return ScaffoldWithNavBar(child: child);
        },
        routes: [
          GoRoute(
            path: '/home',
            pageBuilder: (context, state) => const NoTransitionPage(
              child: HomePage(),
            ),
          ),
        ],
      ),
      
      // Full screen routes
      GoRoute(
        path: '/chat/:chatId',
        builder: (context, state) {
          final chatId = state.pathParameters['chatId']!;
          final chatName = state.uri.queryParameters['name'] ?? 'Chat';
          final isGroup = state.uri.queryParameters['isGroup'] == 'true';
          return ChatPage(
            chatId: chatId,
            chatName: chatName,
            isGroup: isGroup,
          );
        },
      ),
      GoRoute(
        path: '/settings',
        builder: (context, state) => const SettingsPage(),
      ),
      GoRoute(
        path: '/call/:type',
        builder: (context, state) {
          final type = state.pathParameters['type']!;
          final contactName = state.uri.queryParameters['contact'] ?? 'Unknown';
          final isVideo = type == 'video';
          return CallPage(
            contactName: contactName,
            isVideo: isVideo,
          );
        },
      ),
    ],
  );
}

class ScaffoldWithNavBar extends StatelessWidget {
  final Widget child;

  const ScaffoldWithNavBar({required this.child, super.key});

  @override
  Widget build(BuildContext context) {
    return child;
  }
}