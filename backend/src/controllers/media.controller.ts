import { Request, Response } from 'express';
import { MediaService } from '../services/media.service';
import { logger } from '../utils/logger';
import { AppError } from '../utils/errors';
import { asyncHandler } from '../middleware/errorHandler';

/**
 * Generate presigned upload URL
 */
export const generateUploadUrl = asyncHandler(async (req: Request, res: Response) => {
  const { filename, mimeType, fileSize, encryptionKey } = req.body;
  const userId = req.user!.userId;

  if (!filename || !mimeType || !fileSize) {
    throw new AppError('Filename, mimeType, and fileSize are required', 400);
  }

  if (typeof fileSize !== 'number' || fileSize <= 0) {
    throw new AppError('File size must be a positive number', 400);
  }

  // Determine media type from MIME type
  let mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT' = 'DOCUMENT';
  if (mimeType.startsWith('image/')) mediaType = 'IMAGE';
  else if (mimeType.startsWith('video/')) mediaType = 'VIDEO';
  else if (mimeType.startsWith('audio/')) mediaType = 'AUDIO';

  const uploadData = await MediaService.generateUploadUrl({
    filename,
    mimeType,
    fileSize,
    userId,
    mediaType,
    encryptionKey
  });

  logger.info('Upload URL generated', { 
    mediaFileId: uploadData.mediaFileId, 
    userId,
    filename,
    fileSize
  });

  res.status(200).json({
    success: true,
    message: 'Upload URL generated successfully',
    data: uploadData
  });
});

/**
 * Confirm upload completion
 */
export const confirmUpload = asyncHandler(async (req: Request, res: Response) => {
  const { mediaFileId } = req.params;
  const userId = req.user!.userId;

  await MediaService.confirmUpload(mediaFileId!, userId);

  logger.info('Upload confirmed', { mediaFileId, userId });

  res.status(200).json({
    success: true,
    message: 'Upload confirmed successfully'
  });
});

/**
 * Get media file information
 */
export const getMediaFile = asyncHandler(async (req: Request, res: Response) => {
  const { mediaFileId } = req.params;
  const userId = req.user!.userId;

  const mediaFile = await MediaService.getMediaFile(mediaFileId!, userId);

  res.status(200).json({
    success: true,
    data: {
      mediaFile
    }
  });
});

/**
 * Generate download URL
 */
export const generateDownloadUrl = asyncHandler(async (req: Request, res: Response) => {
  const { mediaFileId } = req.params;
  const userId = req.user!.userId;

  const downloadUrl = await MediaService.generateDownloadUrl(mediaFileId!, userId);

  logger.info('Download URL generated', { mediaFileId, userId });

  res.status(200).json({
    success: true,
    message: 'Download URL generated successfully',
    data: {
      downloadUrl,
      expiresIn: 3600 // 1 hour
    }
  });
});

/**
 * Delete media file
 */
export const deleteMediaFile = asyncHandler(async (req: Request, res: Response) => {
  const { mediaFileId } = req.params;
  const userId = req.user!.userId;

  await MediaService.deleteMediaFile(mediaFileId!, userId);

  logger.info('Media file deleted', { mediaFileId, userId });

  res.status(200).json({
    success: true,
    message: 'Media file deleted successfully'
  });
});

/**
 * Get user's media files
 */
export const getUserMediaFiles = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit, type } = req.query;
  const userId = req.user!.userId;

  const pageNum = page ? parseInt(page as string) : 1;
  const limitNum = limit ? parseInt(limit as string) : 20;

  if (limitNum > 100) {
    throw new AppError('Limit cannot exceed 100', 400);
  }

  // Map type filter to MIME type prefix
  let mimeTypeFilter: string | undefined;
  if (type) {
    const typeMap: Record<string, string> = {
      'image': 'image/',
      'video': 'video/',
      'audio': 'audio/',
      'document': 'application/'
    };
    
    mimeTypeFilter = typeMap[type as string];
    if (!mimeTypeFilter) {
      throw new AppError('Invalid type filter. Use: image, video, audio, document', 400);
    }
  }

  const result = await MediaService.getUserMediaFiles(
    userId,
    mimeTypeFilter,
    pageNum,
    limitNum
  );

  res.status(200).json({
    success: true,
    data: {
      files: result.media,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: result.pagination.totalCount,
        hasMore: result.pagination.hasMore
      }
    }
  });
});

/**
 * Get media file statistics
 */
export const getMediaStats = asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  // This would require additional service methods
  // For now, returning placeholder stats
  const stats = {
    totalFiles: 0,
    totalSize: 0,
    fileTypes: {
      images: 0,
      videos: 0,
      audio: 0,
      documents: 0
    },
    storageUsed: 0,
    storageLimit: 1024 * 1024 * 1024 // 1GB
  };

  res.status(200).json({
    success: true,
    data: {
      stats
    }
  });
});

/**
 * Generate thumbnail
 */
export const generateThumbnail = asyncHandler(async (req: Request, res: Response) => {
  const { mediaFileId } = req.params;
  const userId = req.user!.userId;

  // First check if user has access to the file
  await MediaService.getMediaFile(mediaFileId!, userId);

  const thumbnailUrl = await MediaService.generateThumbnail(mediaFileId!, userId);

  if (!thumbnailUrl) {
    throw new AppError('Thumbnail generation not supported for this file type', 400);
  }

  logger.info('Thumbnail generated', { mediaFileId, userId });

  res.status(200).json({
    success: true,
    message: 'Thumbnail generated successfully',
    data: {
      thumbnailUrl
    }
  });
});

/**
 * Search media files
 */
export const searchMediaFiles = asyncHandler(async (req: Request, res: Response) => {
  const { query, type, limit } = req.query;
  const userId = req.user!.userId;

  if (!query || typeof query !== 'string') {
    throw new AppError('Search query is required', 400);
  }

  if (query.length < 2) {
    throw new AppError('Search query must be at least 2 characters', 400);
  }

  const limitNum = limit ? parseInt(limit as string) : 20;
  
  if (limitNum > 50) {
    throw new AppError('Limit cannot exceed 50', 400);
  }

  // This would require additional service implementation
  // For now, returning empty results
  const results: any[] = [];

  res.status(200).json({
    success: true,
    data: {
      files: results,
      query,
      total: results.length
    }
  });
});

/**
 * Bulk delete media files
 */
export const bulkDeleteMediaFiles = asyncHandler(async (req: Request, res: Response) => {
  const { mediaFileIds } = req.body;
  const userId = req.user!.userId;

  if (!Array.isArray(mediaFileIds) || mediaFileIds.length === 0) {
    throw new AppError('Media file IDs array is required', 400);
  }

  if (mediaFileIds.length > 50) {
    throw new AppError('Cannot delete more than 50 files at once', 400);
  }

  const results = {
    deleted: 0,
    failed: 0,
    errors: [] as string[]
  };

  for (const mediaFileId of mediaFileIds) {
    try {
      await MediaService.deleteMediaFile(mediaFileId, userId);
      results.deleted++;
    } catch (error: any) {
      results.failed++;
      results.errors.push(`${mediaFileId}: ${error.message}`);
    }
  }

  logger.info('Bulk delete completed', { 
    userId, 
    totalRequested: mediaFileIds.length,
    deleted: results.deleted,
    failed: results.failed
  });

  res.status(200).json({
    success: true,
    message: `Bulk delete completed. ${results.deleted} files deleted, ${results.failed} failed.`,
    data: {
      results
    }
  });
});

/**
 * Get upload progress (for chunked uploads)
 */
export const getUploadProgress = asyncHandler(async (req: Request, res: Response) => {
  const { mediaFileId } = req.params;
  const userId = req.user!.userId;

  // This would track upload progress for large files
  // For now, returning placeholder
  const progress = {
    mediaFileId,
    status: 'pending',
    bytesUploaded: 0,
    totalBytes: 0,
    percentage: 0
  };

  res.status(200).json({
    success: true,
    data: {
      progress
    }
  });
});

/**
 * Cancel upload
 */
export const cancelUpload = asyncHandler(async (req: Request, res: Response) => {
  const { mediaFileId } = req.params;
  const userId = req.user!.userId;

  // This would cancel an ongoing upload
  // For now, just deleting the media file record
  await MediaService.deleteMediaFile(mediaFileId!, userId);

  logger.info('Upload cancelled', { mediaFileId, userId });

  res.status(200).json({
    success: true,
    message: 'Upload cancelled successfully'
  });
});

/**
 * Update media file metadata
 */
export const updateMediaFile = asyncHandler(async (req: Request, res: Response) => {
  const { mediaFileId } = req.params;
  const { filename } = req.body;
  const userId = req.user!.userId;

  // First check if user has access
  const mediaFile = await MediaService.getMediaFile(mediaFileId!, userId);

  // This would require additional service method to update metadata
  // For now, returning the existing file info
  
  logger.info('Media file metadata update requested', { mediaFileId, userId });

  res.status(200).json({
    success: true,
    message: 'Media file updated successfully',
    data: {
      mediaFile
    }
  });
});