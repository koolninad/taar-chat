import 'dart:convert';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/api_response.dart';
import 'api_client.dart';

class AuthService {
  static const String _accessTokenKey = 'access_token';
  static const String _refreshTokenKey = 'refresh_token';
  static const String _userDataKey = 'user_data';
  static const String _isLoggedInKey = 'is_logged_in';

  late final FlutterSecureStorage _secureStorage;
  late final SharedPreferences _prefs;
  late final ApiClient _apiClient;

  // Singleton pattern
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;

  AuthService._internal() {
    _secureStorage = const FlutterSecureStorage();
    _apiClient = ApiClient();
    _initPrefs();
  }

  Future<void> _initPrefs() async {
    _prefs = await SharedPreferences.getInstance();
  }

  /// Send OTP to phone number
  Future<ApiResponse<OtpResponse>> sendOtp({
    required String phoneNumber,
    required String countryCode,
  }) async {
    try {
      final response = await _apiClient.post<OtpResponse>(
        '/auth/send-otp',
        data: {
          'phoneNumber': phoneNumber,
          'countryCode': countryCode,
        },
        fromJson: (json) => OtpResponse.fromJson(json as Map<String, dynamic>),
      );

      return response;
    } catch (e) {
      rethrow;
    }
  }

  /// Verify OTP and complete authentication
  Future<ApiResponse<AuthResponse>> verifyOtp({
    required String phoneNumber,
    required String countryCode,
    required String otpCode,
    Map<String, dynamic>? userInfo,
  }) async {
    try {
      final data = {
        'phoneNumber': phoneNumber,
        'countryCode': countryCode,
        'otpCode': otpCode,
      };

      if (userInfo != null) {
        data['userInfo'] = userInfo;
      }

      final response = await _apiClient.post<AuthResponse>(
        '/auth/verify-otp',
        data: data,
        fromJson: (json) => AuthResponse.fromJson(json as Map<String, dynamic>),
      );

      // Store authentication data
      if (response.success && response.data != null) {
        await _storeAuthData(response.data!);
      }

      return response;
    } catch (e) {
      rethrow;
    }
  }

  /// Refresh access token using refresh token
  Future<bool> refreshToken() async {
    try {
      final refreshToken = await getRefreshToken();
      if (refreshToken == null) {
        return false;
      }

      final response = await _apiClient.post<AuthTokens>(
        '/auth/refresh',
        data: {'refreshToken': refreshToken},
        fromJson: (json) => AuthTokens.fromJson(json as Map<String, dynamic>),
      );

      if (response.success && response.data != null) {
        final tokens = response.data!;
        await _storeTokens(tokens);
        return true;
      }

      return false;
    } catch (e) {
      // Refresh failed, clear stored data
      await _clearAuthData();
      return false;
    }
  }

  /// Get current user profile
  Future<ApiResponse<UserModel>> getProfile() async {
    try {
      final response = await _apiClient.get<UserModel>(
        '/auth/profile',
        fromJson: (json) => UserModel.fromJson(json as Map<String, dynamic>),
      );

      // Update stored user data
      if (response.success && response.data != null) {
        await _storeUserData(response.data!);
      }

      return response;
    } catch (e) {
      rethrow;
    }
  }

  /// Update user profile
  Future<ApiResponse<UserModel>> updateProfile({
    String? name,
    String? about,
    String? avatarUrl,
  }) async {
    try {
      final data = <String, dynamic>{};
      if (name != null) data['name'] = name;
      if (about != null) data['about'] = about;
      if (avatarUrl != null) data['avatarUrl'] = avatarUrl;

      final response = await _apiClient.put<UserModel>(
        '/auth/profile',
        data: data,
        fromJson: (json) => UserModel.fromJson(json as Map<String, dynamic>),
      );

      // Update stored user data
      if (response.success && response.data != null) {
        await _storeUserData(response.data!);
      }

      return response;
    } catch (e) {
      rethrow;
    }
  }

  /// Logout user
  Future<void> logout() async {
    try {
      // Call logout API
      await _apiClient.post('/auth/logout');
    } catch (e) {
      // Continue with local logout even if API call fails
    } finally {
      // Clear all stored data
      await _clearAuthData();
    }
  }

  /// Store authentication data securely
  Future<void> _storeAuthData(AuthResponse authResponse) async {
    await _storeTokens(authResponse.tokens);
    await _storeUserData(authResponse.user);
    await _prefs.setBool(_isLoggedInKey, true);
  }

  /// Store tokens securely
  Future<void> _storeTokens(AuthTokens tokens) async {
    await _secureStorage.write(key: _accessTokenKey, value: tokens.accessToken);
    await _secureStorage.write(key: _refreshTokenKey, value: tokens.refreshToken);
  }

  /// Store user data
  Future<void> _storeUserData(UserModel user) async {
    await _prefs.setString(_userDataKey, jsonEncode(user.toJson()));
  }

  /// Clear all authentication data
  Future<void> _clearAuthData() async {
    await _secureStorage.delete(key: _accessTokenKey);
    await _secureStorage.delete(key: _refreshTokenKey);
    await _prefs.remove(_userDataKey);
    await _prefs.setBool(_isLoggedInKey, false);
  }

  /// Get stored access token
  Future<String?> getAccessToken() async {
    return await _secureStorage.read(key: _accessTokenKey);
  }

  /// Get stored refresh token
  Future<String?> getRefreshToken() async {
    return await _secureStorage.read(key: _refreshTokenKey);
  }

  /// Get stored user data
  Future<UserModel?> getCurrentUser() async {
    try {
      final userJson = _prefs.getString(_userDataKey);
      if (userJson != null) {
        final userMap = jsonDecode(userJson) as Map<String, dynamic>;
        return UserModel.fromJson(userMap);
      }
    } catch (e) {
      // Failed to parse user data
    }
    return null;
  }

  /// Check if user is logged in
  Future<bool> isLoggedIn() async {
    final hasTokens = await getAccessToken() != null;
    final prefValue = _prefs.getBool(_isLoggedInKey) ?? false;
    return hasTokens && prefValue;
  }

  /// Check if access token is expired
  Future<bool> isTokenExpired() async {
    try {
      // Try to get profile to check if token is valid
      final response = await getProfile();
      return !response.success;
    } catch (e) {
      return true;
    }
  }

  /// Initialize authentication state on app start
  Future<AuthState> initializeAuth() async {
    try {
      final isUserLoggedIn = await isLoggedIn();
      
      if (!isUserLoggedIn) {
        return AuthState.unauthenticated;
      }

      // Check if token is still valid
      final isExpired = await isTokenExpired();
      if (isExpired) {
        // Try to refresh token
        final refreshed = await refreshToken();
        if (refreshed) {
          return AuthState.authenticated;
        } else {
          await _clearAuthData();
          return AuthState.unauthenticated;
        }
      }

      return AuthState.authenticated;
    } catch (e) {
      // On any error, treat as unauthenticated
      await _clearAuthData();
      return AuthState.unauthenticated;
    }
  }

  /// Get authentication headers for manual requests
  Future<Map<String, String>> getAuthHeaders() async {
    final token = await getAccessToken();
    if (token != null) {
      return {'Authorization': 'Bearer $token'};
    }
    return {};
  }
}

/// Authentication state enum
enum AuthState {
  loading,
  authenticated,
  unauthenticated,
}

/// Authentication status model
class AuthStatus {
  final AuthState state;
  final UserModel? user;
  final String? error;

  const AuthStatus({
    required this.state,
    this.user,
    this.error,
  });

  const AuthStatus.loading() : this(state: AuthState.loading);
  const AuthStatus.authenticated(UserModel user) : this(state: AuthState.authenticated, user: user);
  const AuthStatus.unauthenticated([String? error]) : this(state: AuthState.unauthenticated, error: error);

  bool get isLoading => state == AuthState.loading;
  bool get isAuthenticated => state == AuthState.authenticated;
  bool get isUnauthenticated => state == AuthState.unauthenticated;
}