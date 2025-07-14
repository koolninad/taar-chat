import '../models/api_response.dart';
import 'api_client.dart';

class UserService {
  late final ApiClient _apiClient;

  // Singleton pattern
  static final UserService _instance = UserService._internal();
  factory UserService() => _instance;

  UserService._internal() {
    _apiClient = ApiClient();
  }

  /// Get user profile by ID
  Future<ApiResponse<UserModel>> getUserProfile({
    required String userId,
  }) async {
    return await _apiClient.get<UserModel>(
      '/users/profile/$userId',
      fromJson: (json) => UserModel.fromJson(json['user'] as Map<String, dynamic>),
    );
  }

  /// Search users
  Future<ApiResponse<PaginatedResponse<UserModel>>> searchUsers({
    String? phoneNumber,
    String? name,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };

    if (phoneNumber != null) queryParams['phoneNumber'] = phoneNumber;
    if (name != null) queryParams['name'] = name;

    return await _apiClient.get<PaginatedResponse<UserModel>>(
      '/users/search',
      queryParameters: queryParams,
      fromJson: (json) => PaginatedResponse.fromJson(
        json['users'] as Map<String, dynamic>,
        (item) => UserModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }

  /// Get user contacts
  Future<ApiResponse<PaginatedResponse<ContactModel>>> getContacts({
    int page = 1,
    int limit = 20,
  }) async {
    return await _apiClient.get<PaginatedResponse<ContactModel>>(
      '/users/contacts',
      queryParameters: {
        'page': page,
        'limit': limit,
      },
      fromJson: (json) => PaginatedResponse.fromJson(
        json['contacts'] as Map<String, dynamic>,
        (item) => ContactModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }

  /// Add user to contacts
  Future<ApiResponse<ContactModel>> addContact({
    required String userId,
    String? nickname,
  }) async {
    final data = <String, dynamic>{
      'userId': userId,
    };

    if (nickname != null) data['nickname'] = nickname;

    return await _apiClient.post<ContactModel>(
      '/users/contacts',
      data: data,
      fromJson: (json) => ContactModel.fromJson(json['contact'] as Map<String, dynamic>),
    );
  }

  /// Remove user from contacts
  Future<ApiResponse<void>> removeContact({
    required String contactId,
  }) async {
    return await _apiClient.delete<void>(
      '/users/contacts/$contactId',
    );
  }

  /// Update contact information
  Future<ApiResponse<ContactModel>> updateContact({
    required String contactId,
    String? nickname,
    bool? isBlocked,
  }) async {
    final data = <String, dynamic>{};

    if (nickname != null) data['nickname'] = nickname;
    if (isBlocked != null) data['isBlocked'] = isBlocked;

    return await _apiClient.put<ContactModel>(
      '/users/contacts/$contactId',
      data: data,
      fromJson: (json) => ContactModel.fromJson(json['contact'] as Map<String, dynamic>),
    );
  }

  /// Block a user
  Future<ApiResponse<void>> blockUser({
    required String userId,
  }) async {
    return await _apiClient.post<void>(
      '/users/block',
      data: {'userId': userId},
    );
  }

  /// Unblock a user
  Future<ApiResponse<void>> unblockUser({
    required String userId,
  }) async {
    return await _apiClient.post<void>(
      '/users/unblock',
      data: {'userId': userId},
    );
  }

  /// Get blocked users
  Future<ApiResponse<PaginatedResponse<UserModel>>> getBlockedUsers({
    int page = 1,
    int limit = 20,
  }) async {
    return await _apiClient.get<PaginatedResponse<UserModel>>(
      '/users/blocked',
      queryParameters: {
        'page': page,
        'limit': limit,
      },
      fromJson: (json) => PaginatedResponse.fromJson(
        json['blockedUsers'] as Map<String, dynamic>,
        (item) => UserModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }

  /// Get user activity status
  Future<ApiResponse<Map<String, dynamic>>> getUserActivity({
    required String userId,
  }) async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/users/activity/$userId',
      fromJson: (json) => json['activity'] as Map<String, dynamic>,
    );
  }

  /// Update privacy settings
  Future<ApiResponse<Map<String, dynamic>>> updatePrivacySettings({
    String? lastSeenVisibility,
    String? profilePhotoVisibility,
    String? aboutVisibility,
  }) async {
    final data = <String, dynamic>{};

    if (lastSeenVisibility != null) data['lastSeenVisibility'] = lastSeenVisibility;
    if (profilePhotoVisibility != null) data['profilePhotoVisibility'] = profilePhotoVisibility;
    if (aboutVisibility != null) data['aboutVisibility'] = aboutVisibility;

    return await _apiClient.put<Map<String, dynamic>>(
      '/users/privacy',
      data: data,
      fromJson: (json) => json['privacy'] as Map<String, dynamic>,
    );
  }

  /// Get privacy settings
  Future<ApiResponse<Map<String, dynamic>>> getPrivacySettings() async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/users/privacy',
      fromJson: (json) => json['privacy'] as Map<String, dynamic>,
    );
  }

  /// Delete user account
  Future<ApiResponse<void>> deleteAccount({
    required String confirmation,
  }) async {
    return await _apiClient.delete<void>(
      '/users/account',
      queryParameters: {'confirmation': confirmation},
    );
  }

  /// Get user statistics
  Future<ApiResponse<Map<String, dynamic>>> getUserStats() async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/users/stats',
      fromJson: (json) => json['stats'] as Map<String, dynamic>,
    );
  }

  /// Update user online status
  Future<ApiResponse<void>> updateOnlineStatus({
    required bool isOnline,
  }) async {
    return await _apiClient.post<void>(
      '/users/status',
      data: {'isOnline': isOnline},
    );
  }

  /// Get mutual contacts with another user
  Future<ApiResponse<List<UserModel>>> getMutualContacts({
    required String userId,
  }) async {
    return await _apiClient.get<List<UserModel>>(
      '/users/$userId/mutual-contacts',
      fromJson: (json) => (json['mutualContacts'] as List)
          .map((item) => UserModel.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Import contacts from phone
  Future<ApiResponse<Map<String, dynamic>>> importContacts({
    required List<Map<String, String>> contacts,
  }) async {
    return await _apiClient.post<Map<String, dynamic>>(
      '/users/import-contacts',
      data: {'contacts': contacts},
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Sync contacts
  Future<ApiResponse<Map<String, dynamic>>> syncContacts() async {
    return await _apiClient.post<Map<String, dynamic>>(
      '/users/sync-contacts',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Get nearby users (if location sharing is enabled)
  Future<ApiResponse<List<UserModel>>> getNearbyUsers({
    required double latitude,
    required double longitude,
    double radiusKm = 10.0,
  }) async {
    return await _apiClient.get<List<UserModel>>(
      '/users/nearby',
      queryParameters: {
        'latitude': latitude,
        'longitude': longitude,
        'radius': radiusKm,
      },
      fromJson: (json) => (json['nearbyUsers'] as List)
          .map((item) => UserModel.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Report a user
  Future<ApiResponse<void>> reportUser({
    required String userId,
    required String reason,
    String? description,
  }) async {
    final data = <String, dynamic>{
      'userId': userId,
      'reason': reason,
    };

    if (description != null) data['description'] = description;

    return await _apiClient.post<void>(
      '/users/report',
      data: data,
    );
  }

  /// Get user verification status
  Future<ApiResponse<Map<String, dynamic>>> getVerificationStatus({
    required String userId,
  }) async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/users/$userId/verification',
      fromJson: (json) => json['verification'] as Map<String, dynamic>,
    );
  }

  /// Update notification settings
  Future<ApiResponse<Map<String, dynamic>>> updateNotificationSettings({
    bool? messageNotifications,
    bool? groupNotifications,
    bool? callNotifications,
    String? notificationSound,
    bool? vibration,
  }) async {
    final data = <String, dynamic>{};

    if (messageNotifications != null) data['messageNotifications'] = messageNotifications;
    if (groupNotifications != null) data['groupNotifications'] = groupNotifications;
    if (callNotifications != null) data['callNotifications'] = callNotifications;
    if (notificationSound != null) data['notificationSound'] = notificationSound;
    if (vibration != null) data['vibration'] = vibration;

    return await _apiClient.put<Map<String, dynamic>>(
      '/users/notification-settings',
      data: data,
      fromJson: (json) => json['settings'] as Map<String, dynamic>,
    );
  }

  /// Get notification settings
  Future<ApiResponse<Map<String, dynamic>>> getNotificationSettings() async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/users/notification-settings',
      fromJson: (json) => json['settings'] as Map<String, dynamic>,
    );
  }
}