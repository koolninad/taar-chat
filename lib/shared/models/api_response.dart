import 'package:json_annotation/json_annotation.dart';

part 'api_response.g.dart';

/// Generic API response wrapper
@JsonSerializable(genericArgumentFactories: true)
class ApiResponse<T> {
  final bool success;
  final T? data;
  final String? message;
  final String? error;

  const ApiResponse({
    required this.success,
    this.data,
    this.message,
    this.error,
  });

  /// Success constructor
  const ApiResponse.success({
    this.data,
    this.message,
  }) : success = true, error = null;

  /// Error constructor
  const ApiResponse.error({
    required this.error,
    this.message,
  }) : success = false, data = null;

  factory ApiResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) fromJsonT,
  ) =>
      _$ApiResponseFromJson(json, fromJsonT);

  Map<String, dynamic> toJson(Object Function(T value) toJsonT) =>
      _$ApiResponseToJson(this, toJsonT);

  @override
  String toString() {
    return 'ApiResponse(success: $success, data: $data, message: $message, error: $error)';
  }
}

/// Pagination metadata
@JsonSerializable()
class PaginationMeta {
  final int page;
  final int limit;
  final int totalCount;
  final int totalPages;
  final bool hasMore;

  const PaginationMeta({
    required this.page,
    required this.limit,
    required this.totalCount,
    required this.totalPages,
    required this.hasMore,
  });

  factory PaginationMeta.fromJson(Map<String, dynamic> json) =>
      _$PaginationMetaFromJson(json);

  Map<String, dynamic> toJson() => _$PaginationMetaToJson(this);
}

/// Paginated response wrapper
@JsonSerializable(genericArgumentFactories: true)
class PaginatedResponse<T> {
  final List<T> items;
  final PaginationMeta pagination;

  const PaginatedResponse({
    required this.items,
    required this.pagination,
  });

  factory PaginatedResponse.fromJson(
    Map<String, dynamic> json,
    T Function(Object? json) fromJsonT,
  ) =>
      _$PaginatedResponseFromJson(json, fromJsonT);

  Map<String, dynamic> toJson(Object Function(T value) toJsonT) =>
      _$PaginatedResponseToJson(this, toJsonT);
}

/// Authentication tokens response
@JsonSerializable()
class AuthTokens {
  final String accessToken;
  final String refreshToken;
  final int expiresIn;

  const AuthTokens({
    required this.accessToken,
    required this.refreshToken,
    required this.expiresIn,
  });

  factory AuthTokens.fromJson(Map<String, dynamic> json) =>
      _$AuthTokensFromJson(json);

  Map<String, dynamic> toJson() => _$AuthTokensToJson(this);
}

/// OTP request response
@JsonSerializable()
class OtpResponse {
  final String phoneNumber;
  final int expiresIn;

  const OtpResponse({
    required this.phoneNumber,
    required this.expiresIn,
  });

  factory OtpResponse.fromJson(Map<String, dynamic> json) =>
      _$OtpResponseFromJson(json);

  Map<String, dynamic> toJson() => _$OtpResponseToJson(this);
}

/// Login/Register response
@JsonSerializable()
class AuthResponse {
  final UserModel user;
  final AuthTokens tokens;
  final bool isNewUser;

  const AuthResponse({
    required this.user,
    required this.tokens,
    required this.isNewUser,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) =>
      _$AuthResponseFromJson(json);

  Map<String, dynamic> toJson() => _$AuthResponseToJson(this);
}

/// User model
@JsonSerializable()
class UserModel {
  final String id;
  final String phoneNumber;
  final String countryCode;
  final String name;
  final String? about;
  final String? avatarUrl;
  final bool isOnline;
  final DateTime? lastSeen;
  final DateTime createdAt;
  final DateTime updatedAt;

  const UserModel({
    required this.id,
    required this.phoneNumber,
    required this.countryCode,
    required this.name,
    this.about,
    this.avatarUrl,
    required this.isOnline,
    this.lastSeen,
    required this.createdAt,
    required this.updatedAt,
  });

  factory UserModel.fromJson(Map<String, dynamic> json) =>
      _$UserModelFromJson(json);

  Map<String, dynamic> toJson() => _$UserModelToJson(this);

  UserModel copyWith({
    String? id,
    String? phoneNumber,
    String? countryCode,
    String? name,
    String? about,
    String? avatarUrl,
    bool? isOnline,
    DateTime? lastSeen,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return UserModel(
      id: id ?? this.id,
      phoneNumber: phoneNumber ?? this.phoneNumber,
      countryCode: countryCode ?? this.countryCode,
      name: name ?? this.name,
      about: about ?? this.about,
      avatarUrl: avatarUrl ?? this.avatarUrl,
      isOnline: isOnline ?? this.isOnline,
      lastSeen: lastSeen ?? this.lastSeen,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }
}

/// Contact model
@JsonSerializable()
class ContactModel {
  final String id;
  final String ownerId;
  final String contactId;
  final String? nickname;
  final bool isBlocked;
  final DateTime createdAt;
  final UserModel contact;

  const ContactModel({
    required this.id,
    required this.ownerId,
    required this.contactId,
    this.nickname,
    required this.isBlocked,
    required this.createdAt,
    required this.contact,
  });

  factory ContactModel.fromJson(Map<String, dynamic> json) =>
      _$ContactModelFromJson(json);

  Map<String, dynamic> toJson() => _$ContactModelToJson(this);
}

/// Message model
@JsonSerializable()
class MessageModel {
  final String id;
  final String senderId;
  final String? recipientId;
  final String? groupId;
  final String content;
  final String messageType;
  final String? mediaFileId;
  final bool isEdited;
  final bool isDeleted;
  final DateTime createdAt;
  final DateTime updatedAt;
  final UserModel sender;

  const MessageModel({
    required this.id,
    required this.senderId,
    this.recipientId,
    this.groupId,
    required this.content,
    required this.messageType,
    this.mediaFileId,
    required this.isEdited,
    required this.isDeleted,
    required this.createdAt,
    required this.updatedAt,
    required this.sender,
  });

  factory MessageModel.fromJson(Map<String, dynamic> json) =>
      _$MessageModelFromJson(json);

  Map<String, dynamic> toJson() => _$MessageModelToJson(this);

  bool get isMedia => mediaFileId != null;
  bool get isGroupMessage => groupId != null;
}

/// Group model
@JsonSerializable()
class GroupModel {
  final String id;
  final String name;
  final String? description;
  final String? avatarUrl;
  final String createdBy;
  final bool isPublic;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<GroupMemberModel> members;

  const GroupModel({
    required this.id,
    required this.name,
    this.description,
    this.avatarUrl,
    required this.createdBy,
    required this.isPublic,
    required this.createdAt,
    required this.updatedAt,
    required this.members,
  });

  factory GroupModel.fromJson(Map<String, dynamic> json) =>
      _$GroupModelFromJson(json);

  Map<String, dynamic> toJson() => _$GroupModelToJson(this);

  int get memberCount => members.length;
}

/// Group member model
@JsonSerializable()
class GroupMemberModel {
  final String id;
  final String groupId;
  final String userId;
  final String role;
  final DateTime joinedAt;
  final UserModel user;

  const GroupMemberModel({
    required this.id,
    required this.groupId,
    required this.userId,
    required this.role,
    required this.joinedAt,
    required this.user,
  });

  factory GroupMemberModel.fromJson(Map<String, dynamic> json) =>
      _$GroupMemberModelFromJson(json);

  Map<String, dynamic> toJson() => _$GroupMemberModelToJson(this);

  bool get isAdmin => role == 'ADMIN';
  bool get isModerator => role == 'MODERATOR';
}

/// Media file model
@JsonSerializable()
class MediaFileModel {
  final String id;
  final String filename;
  final String mimeType;
  final int fileSize;
  final String mediaType;
  final String url;
  final DateTime createdAt;

  const MediaFileModel({
    required this.id,
    required this.filename,
    required this.mimeType,
    required this.fileSize,
    required this.mediaType,
    required this.url,
    required this.createdAt,
  });

  factory MediaFileModel.fromJson(Map<String, dynamic> json) =>
      _$MediaFileModelFromJson(json);

  Map<String, dynamic> toJson() => _$MediaFileModelToJson(this);

  bool get isImage => mediaType == 'IMAGE';
  bool get isVideo => mediaType == 'VIDEO';
  bool get isAudio => mediaType == 'AUDIO';
  bool get isDocument => mediaType == 'DOCUMENT';

  String get fileSizeFormatted {
    if (fileSize < 1024) return '${fileSize}B';
    if (fileSize < 1024 * 1024) return '${(fileSize / 1024).toStringAsFixed(1)}KB';
    if (fileSize < 1024 * 1024 * 1024) return '${(fileSize / (1024 * 1024)).toStringAsFixed(1)}MB';
    return '${(fileSize / (1024 * 1024 * 1024)).toStringAsFixed(1)}GB';
  }
}