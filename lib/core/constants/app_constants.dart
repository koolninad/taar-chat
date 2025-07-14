import 'package:flutter/material.dart';

class AppConstants {
  static const String appName = 'Taar';
  static const String appVersion = '1.0.0';
  
  // API Configuration
  static const String devApiBaseUrl = 'http://localhost:3000/api/v1';
  static const String prodApiBaseUrl = 'https://api.taar.app/api/v1';
  static const String devWebSocketUrl = 'ws://localhost:3000';
  static const String prodWebSocketUrl = 'wss://api.taar.app';
  
  // Get environment-specific URLs
  static String get apiBaseUrl {
    const bool isDev = bool.fromEnvironment('DEVELOPMENT', defaultValue: true);
    return isDev ? devApiBaseUrl : prodApiBaseUrl;
  }
  
  static String get webSocketUrl {
    const bool isDev = bool.fromEnvironment('DEVELOPMENT', defaultValue: true);
    return isDev ? devWebSocketUrl : prodWebSocketUrl;
  }
  
  static const Duration animationDuration = Duration(milliseconds: 300);
  static const Duration longAnimationDuration = Duration(milliseconds: 500);
  
  static const double borderRadius = 8.0;
  static const double largeBorderRadius = 12.0;
  static const double cardElevation = 2.0;
  
  static const EdgeInsets defaultPadding = EdgeInsets.all(16.0);
  static const EdgeInsets smallPadding = EdgeInsets.all(8.0);
  static const EdgeInsets largePadding = EdgeInsets.all(24.0);
  
  static const double maxContentWidth = 600.0;
  
  static const String defaultProfileImage = 'assets/images/default_profile.png';
  static const String appLogo = 'assets/images/taar_logo.png';
  
  static const int maxGroupMembers = 256;
  static const int maxMessageLength = 4096;
  static const int maxFileSize = 100 * 1024 * 1024; // 100MB
  
  static const List<String> supportedImageFormats = ['jpg', 'jpeg', 'png', 'gif'];
  static const List<String> supportedVideoFormats = ['mp4', 'mov', 'avi'];
  static const List<String> supportedAudioFormats = ['mp3', 'wav', 'aac', 'm4a'];
  static const List<String> supportedDocumentFormats = ['pdf', 'doc', 'docx', 'txt'];
}