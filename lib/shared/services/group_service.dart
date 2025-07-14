import '../models/api_response.dart';
import 'api_client.dart';

class GroupService {
  late final ApiClient _apiClient;

  // Singleton pattern
  static final GroupService _instance = GroupService._internal();
  factory GroupService() => _instance;

  GroupService._internal() {
    _apiClient = ApiClient();
  }

  /// Create a new group
  Future<ApiResponse<GroupModel>> createGroup({
    required String name,
    String? description,
    String? avatarUrl,
    bool isPublic = false,
    List<String>? memberIds,
  }) async {
    final data = <String, dynamic>{
      'name': name,
      'isPublic': isPublic,
    };

    if (description != null) data['description'] = description;
    if (avatarUrl != null) data['avatarUrl'] = avatarUrl;
    if (memberIds != null) data['memberIds'] = memberIds;

    return await _apiClient.post<GroupModel>(
      '/groups',
      data: data,
      fromJson: (json) => GroupModel.fromJson(json['group'] as Map<String, dynamic>),
    );
  }

  /// Get user's groups
  Future<ApiResponse<PaginatedResponse<GroupModel>>> getUserGroups({
    int page = 1,
    int limit = 20,
  }) async {
    return await _apiClient.get<PaginatedResponse<GroupModel>>(
      '/groups',
      queryParameters: {
        'page': page,
        'limit': limit,
      },
      fromJson: (json) => PaginatedResponse.fromJson(
        json['groups'] as Map<String, dynamic>,
        (item) => GroupModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }

  /// Get group details
  Future<ApiResponse<GroupModel>> getGroupDetails({
    required String groupId,
  }) async {
    return await _apiClient.get<GroupModel>(
      '/groups/$groupId',
      fromJson: (json) => GroupModel.fromJson(json['group'] as Map<String, dynamic>),
    );
  }

  /// Update group details
  Future<ApiResponse<GroupModel>> updateGroup({
    required String groupId,
    String? name,
    String? description,
    String? avatarUrl,
    bool? isPublic,
  }) async {
    final data = <String, dynamic>{};

    if (name != null) data['name'] = name;
    if (description != null) data['description'] = description;
    if (avatarUrl != null) data['avatarUrl'] = avatarUrl;
    if (isPublic != null) data['isPublic'] = isPublic;

    return await _apiClient.put<GroupModel>(
      '/groups/$groupId',
      data: data,
      fromJson: (json) => GroupModel.fromJson(json['group'] as Map<String, dynamic>),
    );
  }

  /// Delete a group
  Future<ApiResponse<void>> deleteGroup({
    required String groupId,
  }) async {
    return await _apiClient.delete<void>(
      '/groups/$groupId',
    );
  }

  /// Get group members
  Future<ApiResponse<PaginatedResponse<GroupMemberModel>>> getGroupMembers({
    required String groupId,
    int page = 1,
    int limit = 50,
  }) async {
    return await _apiClient.get<PaginatedResponse<GroupMemberModel>>(
      '/groups/$groupId/members',
      queryParameters: {
        'page': page,
        'limit': limit,
      },
      fromJson: (json) => PaginatedResponse.fromJson(
        json['members'] as Map<String, dynamic>,
        (item) => GroupMemberModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }

  /// Add member to group
  Future<ApiResponse<GroupMemberModel>> addGroupMember({
    required String groupId,
    required String userId,
    String role = 'MEMBER',
  }) async {
    return await _apiClient.post<GroupMemberModel>(
      '/groups/$groupId/members',
      data: {
        'userId': userId,
        'role': role,
      },
      fromJson: (json) => GroupMemberModel.fromJson(json['member'] as Map<String, dynamic>),
    );
  }

  /// Remove member from group
  Future<ApiResponse<void>> removeGroupMember({
    required String groupId,
    required String userId,
  }) async {
    return await _apiClient.delete<void>(
      '/groups/$groupId/members/$userId',
    );
  }

  /// Update member role
  Future<ApiResponse<GroupMemberModel>> updateMemberRole({
    required String groupId,
    required String userId,
    required String role,
  }) async {
    return await _apiClient.put<GroupMemberModel>(
      '/groups/$groupId/members/$userId/role',
      data: {'role': role},
      fromJson: (json) => GroupMemberModel.fromJson(json['member'] as Map<String, dynamic>),
    );
  }

  /// Generate group invite link
  Future<ApiResponse<Map<String, dynamic>>> generateInviteLink({
    required String groupId,
    int expiresIn = 3600, // 1 hour
  }) async {
    return await _apiClient.post<Map<String, dynamic>>(
      '/groups/$groupId/invite',
      data: {'expiresIn': expiresIn},
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Join group via invite code
  Future<ApiResponse<Map<String, dynamic>>> joinGroupViaInvite({
    required String inviteCode,
  }) async {
    return await _apiClient.post<Map<String, dynamic>>(
      '/groups/join/$inviteCode',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Leave group
  Future<ApiResponse<void>> leaveGroup({
    required String groupId,
  }) async {
    return await _apiClient.delete<void>(
      '/groups/$groupId/members/me',
    );
  }

  /// Get group messages
  Future<ApiResponse<PaginatedResponse<MessageModel>>> getGroupMessages({
    required String groupId,
    int page = 1,
    int limit = 20,
  }) async {
    return await _apiClient.get<PaginatedResponse<MessageModel>>(
      '/groups/$groupId/messages',
      queryParameters: {
        'page': page,
        'limit': limit,
      },
      fromJson: (json) => PaginatedResponse.fromJson(
        json['messages'] as Map<String, dynamic>,
        (item) => MessageModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }

  /// Update group settings
  Future<ApiResponse<Map<String, dynamic>>> updateGroupSettings({
    required String groupId,
    bool? isPublic,
    bool? allowMemberInvites,
    String? messageHistory,
  }) async {
    final data = <String, dynamic>{};

    if (isPublic != null) data['isPublic'] = isPublic;
    if (allowMemberInvites != null) data['allowMemberInvites'] = allowMemberInvites;
    if (messageHistory != null) data['messageHistory'] = messageHistory;

    return await _apiClient.put<Map<String, dynamic>>(
      '/groups/$groupId/settings',
      data: data,
      fromJson: (json) => json['settings'] as Map<String, dynamic>,
    );
  }

  /// Search public groups
  Future<ApiResponse<PaginatedResponse<GroupModel>>> searchGroups({
    required String query,
    int page = 1,
    int limit = 20,
  }) async {
    return await _apiClient.get<PaginatedResponse<GroupModel>>(
      '/groups/search',
      queryParameters: {
        'query': query,
        'page': page,
        'limit': limit,
      },
      fromJson: (json) => PaginatedResponse.fromJson(
        json['groups'] as Map<String, dynamic>,
        (item) => GroupModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }

  /// Pin/unpin a message in group
  Future<ApiResponse<void>> togglePinMessage({
    required String groupId,
    required String messageId,
    required bool isPinned,
  }) async {
    return await _apiClient.post<void>(
      '/groups/$groupId/messages/$messageId/pin',
      data: {'isPinned': isPinned},
    );
  }

  /// Get pinned messages in group
  Future<ApiResponse<List<MessageModel>>> getPinnedMessages({
    required String groupId,
  }) async {
    return await _apiClient.get<List<MessageModel>>(
      '/groups/$groupId/pinned-messages',
      fromJson: (json) => (json['pinnedMessages'] as List)
          .map((item) => MessageModel.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Mute/unmute group notifications
  Future<ApiResponse<void>> toggleGroupMute({
    required String groupId,
    required bool isMuted,
    int? muteUntil, // Unix timestamp
  }) async {
    final data = <String, dynamic>{
      'isMuted': isMuted,
    };

    if (muteUntil != null) data['muteUntil'] = muteUntil;

    return await _apiClient.post<void>(
      '/groups/$groupId/mute',
      data: data,
    );
  }

  /// Get group statistics
  Future<ApiResponse<Map<String, dynamic>>> getGroupStats({
    required String groupId,
  }) async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/groups/$groupId/stats',
      fromJson: (json) => json['stats'] as Map<String, dynamic>,
    );
  }

  /// Export group data
  Future<ApiResponse<Map<String, dynamic>>> exportGroupData({
    required String groupId,
    String format = 'json',
  }) async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/groups/$groupId/export',
      queryParameters: {'format': format},
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Report a group
  Future<ApiResponse<void>> reportGroup({
    required String groupId,
    required String reason,
    String? description,
  }) async {
    final data = <String, dynamic>{
      'reason': reason,
    };

    if (description != null) data['description'] = description;

    return await _apiClient.post<void>(
      '/groups/$groupId/report',
      data: data,
    );
  }

  /// Get group join requests (for admins)
  Future<ApiResponse<List<Map<String, dynamic>>>> getJoinRequests({
    required String groupId,
  }) async {
    return await _apiClient.get<List<Map<String, dynamic>>>(
      '/groups/$groupId/join-requests',
      fromJson: (json) => (json['joinRequests'] as List)
          .map((item) => item as Map<String, dynamic>)
          .toList(),
    );
  }

  /// Approve/reject join request
  Future<ApiResponse<void>> handleJoinRequest({
    required String groupId,
    required String requestId,
    required bool approve,
  }) async {
    return await _apiClient.post<void>(
      '/groups/$groupId/join-requests/$requestId',
      data: {'approve': approve},
    );
  }

  /// Set group description template
  Future<ApiResponse<void>> setGroupDescription({
    required String groupId,
    required String description,
  }) async {
    return await _apiClient.put<void>(
      '/groups/$groupId/description',
      data: {'description': description},
    );
  }

  /// Get group activity log (for admins)
  Future<ApiResponse<List<Map<String, dynamic>>>> getGroupActivityLog({
    required String groupId,
    int page = 1,
    int limit = 20,
  }) async {
    return await _apiClient.get<List<Map<String, dynamic>>>(
      '/groups/$groupId/activity-log',
      queryParameters: {
        'page': page,
        'limit': limit,
      },
      fromJson: (json) => (json['activities'] as List)
          .map((item) => item as Map<String, dynamic>)
          .toList(),
    );
  }
}