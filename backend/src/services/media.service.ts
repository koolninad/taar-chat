import { PrismaClient, MediaType } from '@prisma/client';
import { RedisService } from './redis.service';
import { AppError, ErrorMessages } from '../utils/errors';
import { logger } from '../utils/logger';
import { config } from '../config';
import crypto from 'crypto';
import path from 'path';

const prisma = new PrismaClient();

// Mock S3 service for development
const s3 = {
  getSignedUrl: (operation: string, params: any) => {
    return `https://mock-s3-url.com/${params.Key}?signature=mock`;
  },
  upload: (params: any) => ({
    promise: () => Promise.resolve({
      Location: `https://mock-s3-url.com/${params.Key}`,
      ETag: '"mock-etag"',
      Bucket: params.Bucket,
      Key: params.Key
    })
  }),
  deleteObject: (params: any) => ({
    promise: () => Promise.resolve({})
  })
};

export interface UploadUrlRequest {
  filename: string;
  mimeType: string;
  fileSize: number;
  userId: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'DOCUMENT';
  encryptionKey?: string;
}

export interface UploadUrlResponse {
  uploadUrl: string;
  mediaFileId: string;
  expiresIn: number;
}

export interface MediaFileResponse {
  id: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  mediaType: string;
  url: string;
  createdAt: Date;
}

class MediaService {
  private static readonly MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
  private static readonly UPLOAD_URL_EXPIRY = 300; // 5 minutes
  private static readonly DOWNLOAD_URL_EXPIRY = 3600; // 1 hour

  /**
   * Generate upload URL for direct S3 upload
   */
  static async generateUploadUrl(uploadData: UploadUrlRequest): Promise<UploadUrlResponse> {
    try {
      // Validate file size
      if (uploadData.fileSize > this.MAX_FILE_SIZE) {
        throw new AppError(ErrorMessages.FILE_TOO_LARGE, 400);
      }

      // Create media file record
      const mediaFile = await prisma.mediaFile.create({
        data: {
          uploaderId: uploadData.userId,
          filename: uploadData.filename,
          originalName: uploadData.filename,
          mimeType: uploadData.mimeType,
          size: uploadData.fileSize,
          mediaType: this.getMediaTypeFromMime(uploadData.mimeType),
          s3Key: `media/${uploadData.userId}/${Date.now()}-${uploadData.filename}`,
          s3Bucket: 'taar-media'
        }
      });

      // Generate S3 presigned URL using AWS SDK v2
      const uploadUrl = s3.getSignedUrl('putObject', {
        Bucket: config.aws.s3.bucket,
        Key: mediaFile.s3Key,
        Expires: this.UPLOAD_URL_EXPIRY,
        ContentType: uploadData.mimeType,
        ContentLength: uploadData.fileSize,
        Metadata: {
          userId: uploadData.userId,
          mediaFileId: mediaFile.id,
          originalFilename: uploadData.filename
        }
      });

      // Cache upload info for verification
      await RedisService.setCache(
        `upload:${mediaFile.id}`,
        JSON.stringify({
          userId: uploadData.userId,
          filename: uploadData.filename,
          mimeType: uploadData.mimeType,
          fileSize: uploadData.fileSize
        }),
        this.UPLOAD_URL_EXPIRY
      );

      logger.info('Upload URL generated', {
        mediaFileId: mediaFile.id,
        userId: uploadData.userId,
        filename: uploadData.filename,
        type: 'media'
      });

      return {
        uploadUrl,
        mediaFileId: mediaFile.id,
        expiresIn: this.UPLOAD_URL_EXPIRY
      };

    } catch (error) {
      logger.error('Failed to generate upload URL:', error);
      throw error instanceof AppError ? error : new AppError(ErrorMessages.MEDIA_UPLOAD_FAILED, 500);
    }
  }

  /**
   * Confirm upload completion
   */
  static async confirmUpload(mediaFileId: string, userId: string): Promise<void> {
    try {
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id: mediaFileId }
      });

      if (!mediaFile) {
        throw new AppError('Media file not found', 404);
      }

      if (mediaFile.uploaderId !== userId) {
        throw new AppError('Access denied', 403);
      }

      // Update file status to confirmed
      await prisma.mediaFile.update({
        where: { id: mediaFileId },
        data: { 
          isUploaded: true,
          uploadedAt: new Date()
        }
      });

      // Clear upload cache
      await RedisService.deleteCache(`upload:${mediaFileId}`);

      logger.info('Upload confirmed', {
        mediaFileId,
        userId,
        type: 'media'
      });

    } catch (error) {
      logger.error('Failed to confirm upload:', error);
      throw error instanceof AppError ? error : new AppError(ErrorMessages.INTERNAL_SERVER_ERROR, 500);
    }
  }

  /**
   * Generate download URL
   */
  static async generateDownloadUrl(mediaFileId: string, userId: string): Promise<string> {
    try {
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id: mediaFileId }
      });

      if (!mediaFile) {
        throw new AppError('Media file not found', 404);
      }

      // Check if user has access to this file
      if (mediaFile.uploaderId !== userId) {
        // For now, only the uploader can access the file
        // TODO: Implement shared media access
        throw new AppError('Access denied', 403);
      }

      // Generate download URL
      const downloadUrl = s3.getSignedUrl('getObject', {
        Bucket: config.aws.s3.bucket,
        Key: mediaFile.s3Key,
        Expires: this.DOWNLOAD_URL_EXPIRY
      });

      return downloadUrl;

    } catch (error) {
      logger.error('Failed to generate download URL:', error);
      throw error instanceof AppError ? error : new AppError(ErrorMessages.INTERNAL_SERVER_ERROR, 500);
    }
  }

  /**
   * Generate thumbnail for image/video
   */
  static async generateThumbnail(mediaFileId: string, userId: string): Promise<string> {
    try {
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id: mediaFileId }
      });

      if (!mediaFile) {
        throw new AppError('Media file not found', 404);
      }

      if (mediaFile.uploaderId !== userId) {
        throw new AppError('Access denied', 403);
      }

      // Check if file type supports thumbnails
      if (!['IMAGE', 'VIDEO'].includes(mediaFile.mediaType)) {
        throw new AppError('Thumbnail generation not supported for this file type', 400);
      }

      // In a real implementation, this would trigger thumbnail generation
      // For now, return a placeholder URL
      const thumbnailKey = `thumbnails/${mediaFile.s3Key.replace('media/', '')}.thumb.jpg`;
      
      const thumbnailUrl = s3.getSignedUrl('getObject', {
        Bucket: config.aws.s3.bucket,
        Key: thumbnailKey,
        Expires: this.DOWNLOAD_URL_EXPIRY
      });

      logger.info('Thumbnail URL generated', {
        mediaFileId,
        userId,
        type: 'thumbnail'
      });

      return thumbnailUrl;

    } catch (error) {
      logger.error('Failed to generate thumbnail:', error);
      throw error instanceof AppError ? error : new AppError(ErrorMessages.INTERNAL_SERVER_ERROR, 500);
    }
  }

  /**
   * Get media file by ID
   */
  static async getMediaFile(mediaFileId: string, userId: string): Promise<MediaFileResponse> {
    try {
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id: mediaFileId }
      });

      if (!mediaFile) {
        throw new AppError('Media file not found', 404);
      }

      // Check if user has access to this file
      if (mediaFile.uploaderId !== userId) {
        // Check if file is shared with user
        const sharedMedia = await prisma.sharedMedia.findFirst({
          where: {
            mediaFileId: mediaFileId,
            sharedWithId: userId
          }
        });

        if (!sharedMedia) {
          throw new AppError('Access denied', 403);
        }
      }

      // Generate download URL
      const downloadUrl = s3.getSignedUrl('getObject', {
        Bucket: config.aws.s3.bucket,
        Key: mediaFile.s3Key,
        Expires: this.DOWNLOAD_URL_EXPIRY
      });

      return {
        id: mediaFile.id,
        filename: mediaFile.originalName,
        mimeType: mediaFile.mimeType,
        fileSize: Number(mediaFile.size),
        mediaType: mediaFile.mediaType,
        url: downloadUrl,
        createdAt: mediaFile.createdAt
      };

    } catch (error) {
      logger.error('Failed to get media file:', error);
      throw error instanceof AppError ? error : new AppError(ErrorMessages.INTERNAL_SERVER_ERROR, 500);
    }
  }

  /**
   * Delete media file
   */
  static async deleteMediaFile(mediaFileId: string, userId: string): Promise<void> {
    try {
      const mediaFile = await prisma.mediaFile.findUnique({
        where: { id: mediaFileId }
      });

      if (!mediaFile) {
        throw new AppError('Media file not found', 404);
      }

      // Only uploader can delete
      if (mediaFile.uploaderId !== userId) {
        throw new AppError('Access denied', 403);
      }

      // Delete from S3
      try {
        await s3.deleteObject({
          Bucket: config.aws.s3.bucket,
          Key: mediaFile.s3Key
        }).promise();
      } catch (s3Error) {
        logger.warn('Failed to delete file from S3:', s3Error);
        // Continue with database deletion even if S3 deletion fails
      }

      // Delete from database
      await prisma.mediaFile.delete({
        where: { id: mediaFileId }
      });

      logger.info('Media file deleted', {
        mediaFileId,
        userId,
        type: 'media'
      });

    } catch (error) {
      logger.error('Failed to delete media file:', error);
      throw error instanceof AppError ? error : new AppError(ErrorMessages.INTERNAL_SERVER_ERROR, 500);
    }
  }

  /**
   * Get user's media files
   */
  static async getUserMediaFiles(
    userId: string,
    mediaType?: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ media: MediaFileResponse[]; pagination: any }> {
    try {
      const offset = (page - 1) * limit;
      const where: any = { uploaderId: userId };
      
      if (mediaType) {
        where.mediaType = mediaType;
      }

      const [mediaFiles, totalCount] = await Promise.all([
        prisma.mediaFile.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          skip: offset,
          take: limit
        }),
        prisma.mediaFile.count({ where })
      ]);

      const media = await Promise.all(
        mediaFiles.map(async (file) => ({
          id: file.id,
          filename: file.originalName,
          mimeType: file.mimeType,
          fileSize: file.fileSize,
          mediaType: file.mediaType,
          url: s3.getSignedUrl('getObject', {
            Bucket: config.aws.s3.bucket,
            Key: file.s3Key,
            Expires: this.DOWNLOAD_URL_EXPIRY
          }),
          createdAt: file.createdAt
        }))
      );

      const totalPages = Math.ceil(totalCount / limit);
      const hasMore = page < totalPages;

      return {
        media,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages,
          hasMore
        }
      };

    } catch (error) {
      logger.error('Failed to get user media files:', error);
      throw new AppError(ErrorMessages.INTERNAL_SERVER_ERROR, 500);
    }
  }

  /**
   * Get media statistics for user
   */
  static async getMediaStats(userId: string): Promise<any> {
    try {
      const stats = await prisma.mediaFile.groupBy({
        by: ['mediaType'],
        where: { uploaderId: userId },
        _count: { id: true },
        _sum: { fileSize: true }
      });

      const totalFiles = stats.reduce((sum, stat) => sum + stat._count.id, 0);
      const totalSize = stats.reduce((sum, stat) => sum + (stat._sum.fileSize || 0), 0);

      const byType = stats.reduce((acc, stat) => {
        acc[stat.mediaType] = {
          count: stat._count.id,
          size: stat._sum.fileSize || 0
        };
        return acc;
      }, {} as any);

      return {
        totalFiles,
        totalSize,
        byType
      };

    } catch (error) {
      logger.error('Failed to get media stats:', error);
      throw new AppError(ErrorMessages.INTERNAL_SERVER_ERROR, 500);
    }
  }

  /**
   * Get MediaType enum from MIME type
   */
  private static getMediaTypeFromMime(mimeType: string): MediaType {
    if (mimeType.startsWith('image/')) {
      return MediaType.IMAGE;
    } else if (mimeType.startsWith('video/')) {
      return MediaType.VIDEO;
    } else if (mimeType.startsWith('audio/')) {
      return MediaType.AUDIO;
    } else {
      return MediaType.DOCUMENT;
    }
  }
}

export { MediaService };