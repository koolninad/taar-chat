// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'api_response.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

ApiResponse<T> _$ApiResponseFromJson<T>(
  Map<String, dynamic> json,
  T Function(Object? json) fromJsonT,
) =>
    ApiResponse<T>(
      success: json['success'] as bool,
      data: _$nullableGenericFromJson(json['data'], fromJsonT),
      message: json['message'] as String?,
      error: json['error'] as String?,
    );

Map<String, dynamic> _$ApiResponseToJson<T>(
  ApiResponse<T> instance,
  Object? Function(T value) toJsonT,
) =>
    <String, dynamic>{
      'success': instance.success,
      'data': _$nullableGenericToJson(instance.data, toJsonT),
      'message': instance.message,
      'error': instance.error,
    };

T? _$nullableGenericFromJson<T>(
  Object? input,
  T Function(Object? json) fromJson,
) =>
    input == null ? null : fromJson(input);

Object? _$nullableGenericToJson<T>(
  T? input,
  Object? Function(T value) toJson,
) =>
    input == null ? null : toJson(input);

PaginationMeta _$PaginationMetaFromJson(Map<String, dynamic> json) =>
    PaginationMeta(
      page: (json['page'] as num).toInt(),
      limit: (json['limit'] as num).toInt(),
      totalCount: (json['totalCount'] as num).toInt(),
      totalPages: (json['totalPages'] as num).toInt(),
      hasMore: json['hasMore'] as bool,
    );

Map<String, dynamic> _$PaginationMetaToJson(PaginationMeta instance) =>
    <String, dynamic>{
      'page': instance.page,
      'limit': instance.limit,
      'totalCount': instance.totalCount,
      'totalPages': instance.totalPages,
      'hasMore': instance.hasMore,
    };

PaginatedResponse<T> _$PaginatedResponseFromJson<T>(
  Map<String, dynamic> json,
  T Function(Object? json) fromJsonT,
) =>
    PaginatedResponse<T>(
      items: (json['items'] as List<dynamic>).map(fromJsonT).toList(),
      pagination:
          PaginationMeta.fromJson(json['pagination'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$PaginatedResponseToJson<T>(
  PaginatedResponse<T> instance,
  Object? Function(T value) toJsonT,
) =>
    <String, dynamic>{
      'items': instance.items.map(toJsonT).toList(),
      'pagination': instance.pagination,
    };

AuthTokens _$AuthTokensFromJson(Map<String, dynamic> json) => AuthTokens(
      accessToken: json['accessToken'] as String,
      refreshToken: json['refreshToken'] as String,
      expiresIn: (json['expiresIn'] as num).toInt(),
    );

Map<String, dynamic> _$AuthTokensToJson(AuthTokens instance) =>
    <String, dynamic>{
      'accessToken': instance.accessToken,
      'refreshToken': instance.refreshToken,
      'expiresIn': instance.expiresIn,
    };

OtpResponse _$OtpResponseFromJson(Map<String, dynamic> json) => OtpResponse(
      phoneNumber: json['phoneNumber'] as String,
      expiresIn: (json['expiresIn'] as num).toInt(),
    );

Map<String, dynamic> _$OtpResponseToJson(OtpResponse instance) =>
    <String, dynamic>{
      'phoneNumber': instance.phoneNumber,
      'expiresIn': instance.expiresIn,
    };

AuthResponse _$AuthResponseFromJson(Map<String, dynamic> json) => AuthResponse(
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
      tokens: AuthTokens.fromJson(json['tokens'] as Map<String, dynamic>),
      isNewUser: json['isNewUser'] as bool,
    );

Map<String, dynamic> _$AuthResponseToJson(AuthResponse instance) =>
    <String, dynamic>{
      'user': instance.user,
      'tokens': instance.tokens,
      'isNewUser': instance.isNewUser,
    };

UserModel _$UserModelFromJson(Map<String, dynamic> json) => UserModel(
      id: json['id'] as String,
      phoneNumber: json['phoneNumber'] as String,
      countryCode: json['countryCode'] as String,
      name: json['name'] as String,
      about: json['about'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      isOnline: json['isOnline'] as bool,
      lastSeen: json['lastSeen'] == null
          ? null
          : DateTime.parse(json['lastSeen'] as String),
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );

Map<String, dynamic> _$UserModelToJson(UserModel instance) => <String, dynamic>{
      'id': instance.id,
      'phoneNumber': instance.phoneNumber,
      'countryCode': instance.countryCode,
      'name': instance.name,
      'about': instance.about,
      'avatarUrl': instance.avatarUrl,
      'isOnline': instance.isOnline,
      'lastSeen': instance.lastSeen?.toIso8601String(),
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };

ContactModel _$ContactModelFromJson(Map<String, dynamic> json) => ContactModel(
      id: json['id'] as String,
      ownerId: json['ownerId'] as String,
      contactId: json['contactId'] as String,
      nickname: json['nickname'] as String?,
      isBlocked: json['isBlocked'] as bool,
      createdAt: DateTime.parse(json['createdAt'] as String),
      contact: UserModel.fromJson(json['contact'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$ContactModelToJson(ContactModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'ownerId': instance.ownerId,
      'contactId': instance.contactId,
      'nickname': instance.nickname,
      'isBlocked': instance.isBlocked,
      'createdAt': instance.createdAt.toIso8601String(),
      'contact': instance.contact,
    };

MessageModel _$MessageModelFromJson(Map<String, dynamic> json) => MessageModel(
      id: json['id'] as String,
      senderId: json['senderId'] as String,
      recipientId: json['recipientId'] as String?,
      groupId: json['groupId'] as String?,
      content: json['content'] as String,
      messageType: json['messageType'] as String,
      mediaFileId: json['mediaFileId'] as String?,
      isEdited: json['isEdited'] as bool,
      isDeleted: json['isDeleted'] as bool,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      sender: UserModel.fromJson(json['sender'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$MessageModelToJson(MessageModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'senderId': instance.senderId,
      'recipientId': instance.recipientId,
      'groupId': instance.groupId,
      'content': instance.content,
      'messageType': instance.messageType,
      'mediaFileId': instance.mediaFileId,
      'isEdited': instance.isEdited,
      'isDeleted': instance.isDeleted,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'sender': instance.sender,
    };

GroupModel _$GroupModelFromJson(Map<String, dynamic> json) => GroupModel(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      avatarUrl: json['avatarUrl'] as String?,
      createdBy: json['createdBy'] as String,
      isPublic: json['isPublic'] as bool,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      members: (json['members'] as List<dynamic>)
          .map((e) => GroupMemberModel.fromJson(e as Map<String, dynamic>))
          .toList(),
    );

Map<String, dynamic> _$GroupModelToJson(GroupModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'avatarUrl': instance.avatarUrl,
      'createdBy': instance.createdBy,
      'isPublic': instance.isPublic,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'members': instance.members,
    };

GroupMemberModel _$GroupMemberModelFromJson(Map<String, dynamic> json) =>
    GroupMemberModel(
      id: json['id'] as String,
      groupId: json['groupId'] as String,
      userId: json['userId'] as String,
      role: json['role'] as String,
      joinedAt: DateTime.parse(json['joinedAt'] as String),
      user: UserModel.fromJson(json['user'] as Map<String, dynamic>),
    );

Map<String, dynamic> _$GroupMemberModelToJson(GroupMemberModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'groupId': instance.groupId,
      'userId': instance.userId,
      'role': instance.role,
      'joinedAt': instance.joinedAt.toIso8601String(),
      'user': instance.user,
    };

MediaFileModel _$MediaFileModelFromJson(Map<String, dynamic> json) =>
    MediaFileModel(
      id: json['id'] as String,
      filename: json['filename'] as String,
      mimeType: json['mimeType'] as String,
      fileSize: (json['fileSize'] as num).toInt(),
      mediaType: json['mediaType'] as String,
      url: json['url'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );

Map<String, dynamic> _$MediaFileModelToJson(MediaFileModel instance) =>
    <String, dynamic>{
      'id': instance.id,
      'filename': instance.filename,
      'mimeType': instance.mimeType,
      'fileSize': instance.fileSize,
      'mediaType': instance.mediaType,
      'url': instance.url,
      'createdAt': instance.createdAt.toIso8601String(),
    };
