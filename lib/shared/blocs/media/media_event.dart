import 'package:equatable/equatable.dart';

/// Media events
abstract class MediaEvent extends Equatable {
  const MediaEvent();

  @override
  List<Object?> get props => [];
}

/// Load media files
class MediaLoad extends MediaEvent {
  final String? mediaType;
  final int page;
  final int limit;

  const MediaLoad({
    this.mediaType,
    this.page = 1,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [mediaType, page, limit];
}

/// Load more media files
class MediaLoadMore extends MediaEvent {
  final String? mediaType;

  const MediaLoadMore({
    this.mediaType,
  });

  @override
  List<Object?> get props => [mediaType];
}

/// Upload a file
class MediaUpload extends MediaEvent {
  final String filePath;
  final String mediaType;

  const MediaUpload({
    required this.filePath,
    required this.mediaType,
  });

  @override
  List<Object?> get props => [filePath, mediaType];
}

/// Download a media file
class MediaDownload extends MediaEvent {
  final String mediaId;

  const MediaDownload({
    required this.mediaId,
  });

  @override
  List<Object?> get props => [mediaId];
}

/// Delete a media file
class MediaDelete extends MediaEvent {
  final String mediaId;

  const MediaDelete({
    required this.mediaId,
  });

  @override
  List<Object?> get props => [mediaId];
}

/// Get media file details
class MediaGetDetails extends MediaEvent {
  final String mediaId;

  const MediaGetDetails({
    required this.mediaId,
  });

  @override
  List<Object?> get props => [mediaId];
}

/// Share media with user
class MediaShare extends MediaEvent {
  final String mediaId;
  final String userId;
  final List<String> permissions;

  const MediaShare({
    required this.mediaId,
    required this.userId,
    this.permissions = const ['VIEW', 'DOWNLOAD'],
  });

  @override
  List<Object?> get props => [mediaId, userId, permissions];
}

/// Get shared media files
class MediaGetShared extends MediaEvent {
  final int page;
  final int limit;

  const MediaGetShared({
    this.page = 1,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [page, limit];
}

/// Get recent media files
class MediaGetRecent extends MediaEvent {
  final int limit;

  const MediaGetRecent({
    this.limit = 10,
  });

  @override
  List<Object?> get props => [limit];
}

/// Search media files
class MediaSearch extends MediaEvent {
  final String query;
  final String? mediaType;
  final int page;
  final int limit;

  const MediaSearch({
    required this.query,
    this.mediaType,
    this.page = 1,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [query, mediaType, page, limit];
}

/// Generate thumbnail
class MediaGenerateThumbnail extends MediaEvent {
  final String mediaId;
  final int? width;
  final int? height;

  const MediaGenerateThumbnail({
    required this.mediaId,
    this.width,
    this.height,
  });

  @override
  List<Object?> get props => [mediaId, width, height];
}

/// Convert media format
class MediaConvert extends MediaEvent {
  final String mediaId;
  final String targetFormat;
  final Map<String, dynamic>? options;

  const MediaConvert({
    required this.mediaId,
    required this.targetFormat,
    this.options,
  });

  @override
  List<Object?> get props => [mediaId, targetFormat, options];
}

/// Compress media
class MediaCompress extends MediaEvent {
  final String mediaId;
  final int quality;

  const MediaCompress({
    required this.mediaId,
    this.quality = 80,
  });

  @override
  List<Object?> get props => [mediaId, quality];
}

/// Toggle favorite status
class MediaToggleFavorite extends MediaEvent {
  final String mediaId;
  final bool isFavorite;

  const MediaToggleFavorite({
    required this.mediaId,
    required this.isFavorite,
  });

  @override
  List<Object?> get props => [mediaId, isFavorite];
}

/// Get favorite media files
class MediaGetFavorites extends MediaEvent {
  final int page;
  final int limit;

  const MediaGetFavorites({
    this.page = 1,
    this.limit = 20,
  });

  @override
  List<Object?> get props => [page, limit];
}

/// Set media expiration
class MediaSetExpiration extends MediaEvent {
  final String mediaId;
  final DateTime expiresAt;

  const MediaSetExpiration({
    required this.mediaId,
    required this.expiresAt,
  });

  @override
  List<Object?> get props => [mediaId, expiresAt];
}

/// Get media statistics
class MediaGetStats extends MediaEvent {
  const MediaGetStats();
}

/// Get media metadata
class MediaGetMetadata extends MediaEvent {
  final String mediaId;

  const MediaGetMetadata({
    required this.mediaId,
  });

  @override
  List<Object?> get props => [mediaId];
}

/// Backup media to cloud
class MediaBackup extends MediaEvent {
  final List<String>? mediaIds;
  final String provider;

  const MediaBackup({
    this.mediaIds,
    this.provider = 'aws',
  });

  @override
  List<Object?> get props => [mediaIds, provider];
}

/// Restore media from backup
class MediaRestore extends MediaEvent {
  final String backupId;

  const MediaRestore({
    required this.backupId,
  });

  @override
  List<Object?> get props => [backupId];
}

/// Permission events
class MediaRequestPermission extends MediaEvent {
  final String permission; // camera, storage, microphone

  const MediaRequestPermission({
    required this.permission,
  });

  @override
  List<Object?> get props => [permission];
}

class MediaPermissionResult extends MediaEvent {
  final String permission;
  final bool isGranted;

  const MediaPermissionResult({
    required this.permission,
    required this.isGranted,
  });

  @override
  List<Object?> get props => [permission, isGranted];
}

/// Capture events
class MediaCapturePhoto extends MediaEvent {
  const MediaCapturePhoto();
}

class MediaCaptureVideo extends MediaEvent {
  final int? maxDurationSeconds;

  const MediaCaptureVideo({
    this.maxDurationSeconds,
  });

  @override
  List<Object?> get props => [maxDurationSeconds];
}

class MediaRecordAudio extends MediaEvent {
  final int? maxDurationSeconds;

  const MediaRecordAudio({
    this.maxDurationSeconds,
  });

  @override
  List<Object?> get props => [maxDurationSeconds];
}

class MediaStopRecording extends MediaEvent {
  const MediaStopRecording();
}

/// File picker events
class MediaPickFile extends MediaEvent {
  final List<String> allowedExtensions;
  final bool allowMultiple;

  const MediaPickFile({
    this.allowedExtensions = const [],
    this.allowMultiple = false,
  });

  @override
  List<Object?> get props => [allowedExtensions, allowMultiple];
}

class MediaPickImage extends MediaEvent {
  final bool allowMultiple;
  final int? imageQuality;

  const MediaPickImage({
    this.allowMultiple = false,
    this.imageQuality,
  });

  @override
  List<Object?> get props => [allowMultiple, imageQuality];
}

class MediaPickVideo extends MediaEvent {
  final bool allowMultiple;
  final int? maxDurationSeconds;

  const MediaPickVideo({
    this.allowMultiple = false,
    this.maxDurationSeconds,
  });

  @override
  List<Object?> get props => [allowMultiple, maxDurationSeconds];
}

/// Clear events
class MediaClearSearch extends MediaEvent {
  const MediaClearSearch();
}

class MediaClearError extends MediaEvent {
  const MediaClearError();
}

class MediaRefresh extends MediaEvent {
  const MediaRefresh();
}

/// Upload progress update (internal)
class MediaUploadProgress extends MediaEvent {
  final String fileName;
  final double progress;

  const MediaUploadProgress({
    required this.fileName,
    required this.progress,
  });

  @override
  List<Object?> get props => [fileName, progress];
}

/// Download progress update (internal)
class MediaDownloadProgress extends MediaEvent {
  final String mediaId;
  final double progress;

  const MediaDownloadProgress({
    required this.mediaId,
    required this.progress,
  });

  @override
  List<Object?> get props => [mediaId, progress];
}