import 'package:equatable/equatable.dart';
import '../../models/api_response.dart';

/// Media states
abstract class MediaState extends Equatable {
  const MediaState();

  @override
  List<Object?> get props => [];
}

/// Initial state
class MediaInitial extends MediaState {
  const MediaInitial();
}

/// Loading states
class MediaLoading extends MediaState {
  const MediaLoading();
}

class MediaUploading extends MediaState {
  final String fileName;
  final double progress;

  const MediaUploading({
    required this.fileName,
    required this.progress,
  });

  @override
  List<Object?> get props => [fileName, progress];
}

class MediaDownloading extends MediaState {
  final String mediaId;
  final double progress;

  const MediaDownloading({
    required this.mediaId,
    required this.progress,
  });

  @override
  List<Object?> get props => [mediaId, progress];
}

class MediaProcessing extends MediaState {
  final String mediaId;
  final String operation; // compress, convert, thumbnail

  const MediaProcessing({
    required this.mediaId,
    required this.operation,
  });

  @override
  List<Object?> get props => [mediaId, operation];
}

/// Success states
class MediaLoaded extends MediaState {
  final List<MediaFileModel> mediaFiles;
  final bool hasMore;
  final int currentPage;

  const MediaLoaded({
    required this.mediaFiles,
    required this.hasMore,
    required this.currentPage,
  });

  @override
  List<Object?> get props => [mediaFiles, hasMore, currentPage];

  MediaLoaded copyWith({
    List<MediaFileModel>? mediaFiles,
    bool? hasMore,
    int? currentPage,
  }) {
    return MediaLoaded(
      mediaFiles: mediaFiles ?? this.mediaFiles,
      hasMore: hasMore ?? this.hasMore,
      currentPage: currentPage ?? this.currentPage,
    );
  }
}

class MediaUploaded extends MediaState {
  final MediaFileModel mediaFile;

  const MediaUploaded({
    required this.mediaFile,
  });

  @override
  List<Object?> get props => [mediaFile];
}

class MediaDownloaded extends MediaState {
  final String mediaId;
  final String downloadUrl;

  const MediaDownloaded({
    required this.mediaId,
    required this.downloadUrl,
  });

  @override
  List<Object?> get props => [mediaId, downloadUrl];
}

class MediaDeleted extends MediaState {
  final String mediaId;

  const MediaDeleted({
    required this.mediaId,
  });

  @override
  List<Object?> get props => [mediaId];
}

class MediaShared extends MediaState {
  final String mediaId;
  final String userId;

  const MediaShared({
    required this.mediaId,
    required this.userId,
  });

  @override
  List<Object?> get props => [mediaId, userId];
}

class MediaCompressed extends MediaState {
  final MediaFileModel originalMedia;
  final MediaFileModel compressedMedia;

  const MediaCompressed({
    required this.originalMedia,
    required this.compressedMedia,
  });

  @override
  List<Object?> get props => [originalMedia, compressedMedia];
}

class MediaConverted extends MediaState {
  final MediaFileModel originalMedia;
  final MediaFileModel convertedMedia;

  const MediaConverted({
    required this.originalMedia,
    required this.convertedMedia,
  });

  @override
  List<Object?> get props => [originalMedia, convertedMedia];
}

class MediaThumbnailGenerated extends MediaState {
  final MediaFileModel originalMedia;
  final MediaFileModel thumbnail;

  const MediaThumbnailGenerated({
    required this.originalMedia,
    required this.thumbnail,
  });

  @override
  List<Object?> get props => [originalMedia, thumbnail];
}

/// Search and filter states
class MediaSearchResults extends MediaState {
  final String query;
  final List<MediaFileModel> results;
  final bool isLoading;
  final bool hasMore;

  const MediaSearchResults({
    required this.query,
    required this.results,
    required this.isLoading,
    required this.hasMore,
  });

  @override
  List<Object?> get props => [query, results, isLoading, hasMore];
}

class MediaSharedFiles extends MediaState {
  final List<MediaFileModel> sharedFiles;
  final bool hasMore;

  const MediaSharedFiles({
    required this.sharedFiles,
    required this.hasMore,
  });

  @override
  List<Object?> get props => [sharedFiles, hasMore];
}

class MediaRecentFiles extends MediaState {
  final List<MediaFileModel> recentFiles;

  const MediaRecentFiles({
    required this.recentFiles,
  });

  @override
  List<Object?> get props => [recentFiles];
}

class MediaFavorites extends MediaState {
  final List<MediaFileModel> favorites;
  final bool hasMore;

  const MediaFavorites({
    required this.favorites,
    required this.hasMore,
  });

  @override
  List<Object?> get props => [favorites, hasMore];
}

/// Statistics and info states
class MediaStatsLoaded extends MediaState {
  final Map<String, dynamic> stats;

  const MediaStatsLoaded({
    required this.stats,
  });

  @override
  List<Object?> get props => [stats];
}

class MediaDetailsLoaded extends MediaState {
  final MediaFileModel mediaFile;
  final Map<String, dynamic> metadata;

  const MediaDetailsLoaded({
    required this.mediaFile,
    required this.metadata,
  });

  @override
  List<Object?> get props => [mediaFile, metadata];
}

/// Backup states
class MediaBackupStarted extends MediaState {
  final List<String> mediaIds;
  final String provider;

  const MediaBackupStarted({
    required this.mediaIds,
    required this.provider,
  });

  @override
  List<Object?> get props => [mediaIds, provider];
}

class MediaBackupCompleted extends MediaState {
  final Map<String, dynamic> backupInfo;

  const MediaBackupCompleted({
    required this.backupInfo,
  });

  @override
  List<Object?> get props => [backupInfo];
}

class MediaRestored extends MediaState {
  final List<MediaFileModel> restoredFiles;

  const MediaRestored({
    required this.restoredFiles,
  });

  @override
  List<Object?> get props => [restoredFiles];
}

/// Error states
class MediaError extends MediaState {
  final String message;
  final String? code;
  final String? mediaId;

  const MediaError({
    required this.message,
    this.code,
    this.mediaId,
  });

  @override
  List<Object?> get props => [message, code, mediaId];
}

class MediaUploadError extends MediaState {
  final String message;
  final String fileName;
  final String? code;

  const MediaUploadError({
    required this.message,
    required this.fileName,
    this.code,
  });

  @override
  List<Object?> get props => [message, fileName, code];
}

class MediaDownloadError extends MediaState {
  final String message;
  final String mediaId;
  final String? code;

  const MediaDownloadError({
    required this.message,
    required this.mediaId,
    this.code,
  });

  @override
  List<Object?> get props => [message, mediaId, code];
}

class MediaProcessingError extends MediaState {
  final String message;
  final String mediaId;
  final String operation;
  final String? code;

  const MediaProcessingError({
    required this.message,
    required this.mediaId,
    required this.operation,
    this.code,
  });

  @override
  List<Object?> get props => [message, mediaId, operation, code];
}

/// Permission states
class MediaPermissionRequired extends MediaState {
  final String permission; // camera, storage, microphone

  const MediaPermissionRequired({
    required this.permission,
  });

  @override
  List<Object?> get props => [permission];
}

class MediaPermissionGranted extends MediaState {
  final String permission;

  const MediaPermissionGranted({
    required this.permission,
  });

  @override
  List<Object?> get props => [permission];
}

class MediaPermissionDenied extends MediaState {
  final String permission;

  const MediaPermissionDenied({
    required this.permission,
  });

  @override
  List<Object?> get props => [permission];
}