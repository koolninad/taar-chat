import '../models/api_response.dart';
import 'api_client.dart';

class MessageService {
  late final ApiClient _apiClient;

  // Singleton pattern
  static final MessageService _instance = MessageService._internal();
  factory MessageService() => _instance;

  MessageService._internal() {
    _apiClient = ApiClient();
  }

  /// Send a regular message
  Future<ApiResponse<MessageModel>> sendMessage({
    String? recipientId,
    String? groupId,
    required String content,
    String messageType = 'TEXT',
    String? mediaFileId,
    String? replyToId,
  }) async {
    final data = <String, dynamic>{
      'content': content,
      'messageType': messageType,
    };

    if (recipientId != null) data['recipientId'] = recipientId;
    if (groupId != null) data['groupId'] = groupId;
    if (mediaFileId != null) data['mediaFileId'] = mediaFileId;
    if (replyToId != null) data['replyToId'] = replyToId;

    return await _apiClient.post<MessageModel>(
      '/messages',
      data: data,
      fromJson: (json) => MessageModel.fromJson(json as Map<String, dynamic>),
    );
  }

  /// Send a secure message
  Future<ApiResponse<MessageModel>> sendSecureMessage({
    String? recipientId,
    String? groupId,
    required String message,
    String messageType = 'TEXT',
    String? mediaFileId,
  }) async {
    final data = <String, dynamic>{
      'message': message,
      'messageType': messageType,
    };

    if (recipientId != null) data['recipientId'] = recipientId;
    if (groupId != null) data['groupId'] = groupId;
    if (mediaFileId != null) data['mediaFileId'] = mediaFileId;

    return await _apiClient.post<MessageModel>(
      '/secure-messages/encrypt',
      data: data,
      fromJson: (json) => MessageModel.fromJson(json['message'] as Map<String, dynamic>),
    );
  }

  /// Get chat list
  Future<ApiResponse<List<Map<String, dynamic>>>> getChats() async {
    return await _apiClient.get<List<Map<String, dynamic>>>(
      '/messages/chats',
      fromJson: (json) => (json as List).cast<Map<String, dynamic>>(),
    );
  }

  /// Get chat messages with pagination
  Future<ApiResponse<PaginatedResponse<MessageModel>>> getChatMessages({
    required String chatId,
    int page = 1,
    int limit = 20,
  }) async {
    return await _apiClient.get<PaginatedResponse<MessageModel>>(
      '/messages/$chatId',
      queryParameters: {
        'page': page,
        'limit': limit,
      },
      fromJson: (json) => PaginatedResponse.fromJson(
        json as Map<String, dynamic>,
        (item) => MessageModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }

  /// Get unread message count
  Future<ApiResponse<Map<String, dynamic>>> getUnreadCount() async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/messages/unread',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Mark messages as read
  Future<ApiResponse<void>> markMessagesAsRead({
    required String chatId,
  }) async {
    return await _apiClient.post<void>(
      '/messages/$chatId/read',
    );
  }

  /// Mark message as delivered
  Future<ApiResponse<void>> markMessageAsDelivered({
    required String messageId,
  }) async {
    return await _apiClient.post<void>(
      '/messages/$messageId/delivered',
    );
  }

  /// Decrypt a message
  Future<ApiResponse<Map<String, dynamic>>> decryptMessage({
    required String messageId,
    int deviceId = 1,
  }) async {
    return await _apiClient.post<Map<String, dynamic>>(
      '/secure-messages/$messageId/decrypt',
      data: {'deviceId': deviceId},
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Decrypt multiple messages at once
  Future<ApiResponse<Map<String, dynamic>>> batchDecryptMessages({
    required List<String> messageIds,
    int deviceId = 1,
  }) async {
    return await _apiClient.post<Map<String, dynamic>>(
      '/secure-messages/batch-decrypt',
      data: {
        'messageIds': messageIds,
        'deviceId': deviceId,
      },
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Verify conversation integrity
  Future<ApiResponse<Map<String, dynamic>>> verifyConversation({
    required String chatId,
  }) async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/secure-messages/verify/$chatId',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Get session information
  Future<ApiResponse<Map<String, dynamic>>> getSessionInfo({
    required String remoteUserId,
    int deviceId = 1,
  }) async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/secure-messages/sessions/$remoteUserId',
      queryParameters: {'deviceId': deviceId},
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Perform key exchange for new conversation
  Future<ApiResponse<Map<String, dynamic>>> performKeyExchange({
    required String remoteUserId,
    int deviceId = 1,
  }) async {
    return await _apiClient.post<Map<String, dynamic>>(
      '/secure-messages/key-exchange',
      data: {
        'remoteUserId': remoteUserId,
        'deviceId': deviceId,
      },
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Get conversation security status
  Future<ApiResponse<Map<String, dynamic>>> getSecurityStatus({
    required String chatId,
  }) async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/secure-messages/security/$chatId',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Get secure messaging statistics
  Future<ApiResponse<Map<String, dynamic>>> getMessagingStats() async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/secure-messages/stats',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Get secure messaging health status
  Future<ApiResponse<Map<String, dynamic>>> getMessagingHealth() async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/secure-messages/health',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Edit a message
  Future<ApiResponse<MessageModel>> editMessage({
    required String messageId,
    required String newContent,
  }) async {
    return await _apiClient.put<MessageModel>(
      '/messages/$messageId',
      data: {'content': newContent},
      fromJson: (json) => MessageModel.fromJson(json as Map<String, dynamic>),
    );
  }

  /// Delete a message
  Future<ApiResponse<void>> deleteMessage({
    required String messageId,
    bool deleteForEveryone = false,
  }) async {
    return await _apiClient.delete<void>(
      '/messages/$messageId',
      queryParameters: {'deleteForEveryone': deleteForEveryone},
    );
  }

  /// Get message delivery status
  Future<ApiResponse<Map<String, dynamic>>> getMessageStatus({
    required String messageId,
  }) async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/messages/$messageId/status',
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Search messages
  Future<ApiResponse<PaginatedResponse<MessageModel>>> searchMessages({
    required String query,
    String? chatId,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'query': query,
      'page': page,
      'limit': limit,
    };

    if (chatId != null) queryParams['chatId'] = chatId;

    return await _apiClient.get<PaginatedResponse<MessageModel>>(
      '/messages/search',
      queryParameters: queryParams,
      fromJson: (json) => PaginatedResponse.fromJson(
        json as Map<String, dynamic>,
        (item) => MessageModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }

  /// Get message media
  Future<ApiResponse<MediaFileModel>> getMessageMedia({
    required String messageId,
  }) async {
    return await _apiClient.get<MediaFileModel>(
      '/messages/$messageId/media',
      fromJson: (json) => MediaFileModel.fromJson(json as Map<String, dynamic>),
    );
  }

  /// React to a message
  Future<ApiResponse<void>> reactToMessage({
    required String messageId,
    required String reaction,
  }) async {
    return await _apiClient.post<void>(
      '/messages/$messageId/react',
      data: {'reaction': reaction},
    );
  }

  /// Remove reaction from message
  Future<ApiResponse<void>> removeReaction({
    required String messageId,
  }) async {
    return await _apiClient.delete<void>(
      '/messages/$messageId/react',
    );
  }

  /// Forward a message
  Future<ApiResponse<MessageModel>> forwardMessage({
    required String messageId,
    String? recipientId,
    String? groupId,
  }) async {
    final data = <String, dynamic>{
      'messageId': messageId,
    };

    if (recipientId != null) data['recipientId'] = recipientId;
    if (groupId != null) data['groupId'] = groupId;

    return await _apiClient.post<MessageModel>(
      '/messages/forward',
      data: data,
      fromJson: (json) => MessageModel.fromJson(json as Map<String, dynamic>),
    );
  }

  /// Star/unstar a message
  Future<ApiResponse<void>> toggleStarMessage({
    required String messageId,
    required bool isStarred,
  }) async {
    return await _apiClient.post<void>(
      '/messages/$messageId/star',
      data: {'isStarred': isStarred},
    );
  }

  /// Get starred messages
  Future<ApiResponse<PaginatedResponse<MessageModel>>> getStarredMessages({
    int page = 1,
    int limit = 20,
  }) async {
    return await _apiClient.get<PaginatedResponse<MessageModel>>(
      '/messages/starred',
      queryParameters: {
        'page': page,
        'limit': limit,
      },
      fromJson: (json) => PaginatedResponse.fromJson(
        json as Map<String, dynamic>,
        (item) => MessageModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }
}