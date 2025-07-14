import 'dart:io';
import '../models/api_response.dart';
import 'api_client.dart';

class MediaService {
  late final ApiClient _apiClient;

  // Singleton pattern
  static final MediaService _instance = MediaService._internal();
  factory MediaService() => _instance;

  MediaService._internal() {
    _apiClient = ApiClient();
  }

  /// Upload a media file
  Future<ApiResponse<MediaFileModel>> uploadFile({
    required String filePath,
    required String mediaType,
    void Function(int sent, int total)? onProgress,
  }) async {
    final file = File(filePath);
    final fileName = file.path.split('/').last;
    final fileSize = await file.length();

    // First, get upload URL
    final uploadUrlResponse = await _generateUploadUrl(
      filename: fileName,
      mimeType: _getMimeType(filePath),
      fileSize: fileSize,
      mediaType: mediaType,
    );

    if (!uploadUrlResponse.success || uploadUrlResponse.data == null) {
      throw ApiError(
        message: 'Failed to generate upload URL',
        code: 'UPLOAD_URL_FAILED',
      );
    }

    // Upload file using the generated URL
    return await _apiClient.uploadFile<MediaFileModel>(
      '/media/upload',
      filePath,
      'file',
      data: {
        'mediaType': mediaType,
        'uploadUrl': uploadUrlResponse.data!['uploadUrl'],
        'mediaFileId': uploadUrlResponse.data!['mediaFileId'],
      },
      onSendProgress: onProgress,
      fromJson: (json) => MediaFileModel.fromJson(json['media'] as Map<String, dynamic>),
    );
  }

  /// Generate upload URL for large files
  Future<ApiResponse<Map<String, dynamic>>> _generateUploadUrl({
    required String filename,
    required String mimeType,
    required int fileSize,
    required String mediaType,
  }) async {
    return await _apiClient.post<Map<String, dynamic>>(
      '/media/upload-url',
      data: {
        'filename': filename,
        'mimeType': mimeType,
        'fileSize': fileSize,
        'mediaType': mediaType,
      },
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Get media file details
  Future<ApiResponse<MediaFileModel>> getMediaFile({
    required String mediaId,
  }) async {
    return await _apiClient.get<MediaFileModel>(
      '/media/$mediaId',
      fromJson: (json) => MediaFileModel.fromJson(json['media'] as Map<String, dynamic>),
    );
  }

  /// Download media file
  Future<ApiResponse<String>> downloadMediaFile({
    required String mediaId,
  }) async {
    return await _apiClient.get<String>(
      '/media/$mediaId/download',
      fromJson: (json) => json as String,
    );
  }

  /// Delete media file
  Future<ApiResponse<void>> deleteMediaFile({
    required String mediaId,
  }) async {
    return await _apiClient.delete<void>(
      '/media/$mediaId',
    );
  }

  /// Get user's media files
  Future<ApiResponse<PaginatedResponse<MediaFileModel>>> getUserMedia({
    String? mediaType,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'page': page,
      'limit': limit,
    };

    if (mediaType != null) queryParams['mediaType'] = mediaType;

    return await _apiClient.get<PaginatedResponse<MediaFileModel>>(
      '/media/my',
      queryParameters: queryParams,
      fromJson: (json) => PaginatedResponse.fromJson(
        json['media'] as Map<String, dynamic>,
        (item) => MediaFileModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }

  /// Share media with another user
  Future<ApiResponse<Map<String, dynamic>>> shareMedia({
    required String mediaId,
    required String userId,
    List<String> permissions = const ['VIEW', 'DOWNLOAD'],
  }) async {
    return await _apiClient.post<Map<String, dynamic>>(
      '/media/$mediaId/share',
      data: {
        'userId': userId,
        'permissions': permissions,
      },
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Get shared media files
  Future<ApiResponse<PaginatedResponse<MediaFileModel>>> getSharedMedia({
    int page = 1,
    int limit = 20,
  }) async {
    return await _apiClient.get<PaginatedResponse<MediaFileModel>>(
      '/media/shared',
      queryParameters: {
        'page': page,
        'limit': limit,
      },
      fromJson: (json) => PaginatedResponse.fromJson(
        json['sharedMedia'] as Map<String, dynamic>,
        (item) => MediaFileModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }

  /// Get media statistics
  Future<ApiResponse<Map<String, dynamic>>> getMediaStats() async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/media/stats',
      fromJson: (json) => json['stats'] as Map<String, dynamic>,
    );
  }

  /// Generate thumbnail for video/image
  Future<ApiResponse<MediaFileModel>> generateThumbnail({
    required String mediaId,
    int? width,
    int? height,
  }) async {
    final data = <String, dynamic>{};
    
    if (width != null) data['width'] = width;
    if (height != null) data['height'] = height;

    return await _apiClient.post<MediaFileModel>(
      '/media/$mediaId/thumbnail',
      data: data,
      fromJson: (json) => MediaFileModel.fromJson(json['thumbnail'] as Map<String, dynamic>),
    );
  }

  /// Convert media to different format
  Future<ApiResponse<MediaFileModel>> convertMedia({
    required String mediaId,
    required String targetFormat,
    Map<String, dynamic>? options,
  }) async {
    final data = <String, dynamic>{
      'targetFormat': targetFormat,
    };

    if (options != null) data['options'] = options;

    return await _apiClient.post<MediaFileModel>(
      '/media/$mediaId/convert',
      data: data,
      fromJson: (json) => MediaFileModel.fromJson(json['convertedMedia'] as Map<String, dynamic>),
    );
  }

  /// Compress media file
  Future<ApiResponse<MediaFileModel>> compressMedia({
    required String mediaId,
    int quality = 80,
  }) async {
    return await _apiClient.post<MediaFileModel>(
      '/media/$mediaId/compress',
      data: {'quality': quality},
      fromJson: (json) => MediaFileModel.fromJson(json['compressedMedia'] as Map<String, dynamic>),
    );
  }

  /// Get media metadata
  Future<ApiResponse<Map<String, dynamic>>> getMediaMetadata({
    required String mediaId,
  }) async {
    return await _apiClient.get<Map<String, dynamic>>(
      '/media/$mediaId/metadata',
      fromJson: (json) => json['metadata'] as Map<String, dynamic>,
    );
  }

  /// Search media files
  Future<ApiResponse<PaginatedResponse<MediaFileModel>>> searchMedia({
    required String query,
    String? mediaType,
    int page = 1,
    int limit = 20,
  }) async {
    final queryParams = <String, dynamic>{
      'query': query,
      'page': page,
      'limit': limit,
    };

    if (mediaType != null) queryParams['mediaType'] = mediaType;

    return await _apiClient.get<PaginatedResponse<MediaFileModel>>(
      '/media/search',
      queryParameters: queryParams,
      fromJson: (json) => PaginatedResponse.fromJson(
        json['media'] as Map<String, dynamic>,
        (item) => MediaFileModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }

  /// Backup media to cloud
  Future<ApiResponse<Map<String, dynamic>>> backupMedia({
    List<String>? mediaIds,
    String provider = 'aws',
  }) async {
    final data = <String, dynamic>{
      'provider': provider,
    };

    if (mediaIds != null) data['mediaIds'] = mediaIds;

    return await _apiClient.post<Map<String, dynamic>>(
      '/media/backup',
      data: data,
      fromJson: (json) => json as Map<String, dynamic>,
    );
  }

  /// Restore media from backup
  Future<ApiResponse<List<MediaFileModel>>> restoreMedia({
    required String backupId,
  }) async {
    return await _apiClient.post<List<MediaFileModel>>(
      '/media/restore',
      data: {'backupId': backupId},
      fromJson: (json) => (json['restoredMedia'] as List)
          .map((item) => MediaFileModel.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Set media expiration
  Future<ApiResponse<void>> setMediaExpiration({
    required String mediaId,
    required DateTime expiresAt,
  }) async {
    return await _apiClient.put<void>(
      '/media/$mediaId/expiration',
      data: {'expiresAt': expiresAt.toIso8601String()},
    );
  }

  /// Get recently uploaded media
  Future<ApiResponse<List<MediaFileModel>>> getRecentMedia({
    int limit = 10,
  }) async {
    return await _apiClient.get<List<MediaFileModel>>(
      '/media/recent',
      queryParameters: {'limit': limit},
      fromJson: (json) => (json['recentMedia'] as List)
          .map((item) => MediaFileModel.fromJson(item as Map<String, dynamic>))
          .toList(),
    );
  }

  /// Add media to favorites
  Future<ApiResponse<void>> toggleFavorite({
    required String mediaId,
    required bool isFavorite,
  }) async {
    return await _apiClient.post<void>(
      '/media/$mediaId/favorite',
      data: {'isFavorite': isFavorite},
    );
  }

  /// Get favorite media
  Future<ApiResponse<PaginatedResponse<MediaFileModel>>> getFavoriteMedia({
    int page = 1,
    int limit = 20,
  }) async {
    return await _apiClient.get<PaginatedResponse<MediaFileModel>>(
      '/media/favorites',
      queryParameters: {
        'page': page,
        'limit': limit,
      },
      fromJson: (json) => PaginatedResponse.fromJson(
        json['favorites'] as Map<String, dynamic>,
        (item) => MediaFileModel.fromJson(item as Map<String, dynamic>),
      ),
    );
  }

  /// Helper method to determine MIME type from file extension
  String _getMimeType(String filePath) {
    final extension = filePath.split('.').last.toLowerCase();
    
    switch (extension) {
      // Images
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      case 'webp':
        return 'image/webp';
      
      // Videos
      case 'mp4':
        return 'video/mp4';
      case 'mov':
        return 'video/quicktime';
      case 'avi':
        return 'video/x-msvideo';
      case 'mkv':
        return 'video/x-matroska';
      
      // Audio
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'aac':
        return 'audio/aac';
      case 'm4a':
        return 'audio/mp4';
      
      // Documents
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'txt':
        return 'text/plain';
      
      default:
        return 'application/octet-stream';
    }
  }
}