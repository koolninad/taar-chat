"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MediaService = void 0;
const client_1 = require("@prisma/client");
const redis_service_1 = require("./redis.service");
const errors_1 = require("../utils/errors");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
const prisma = new client_1.PrismaClient();
const s3 = {
    getSignedUrl: (operation, params) => {
        return `https://mock-s3-url.com/${params.Key}?signature=mock`;
    },
    upload: (params) => ({
        promise: () => Promise.resolve({
            Location: `https://mock-s3-url.com/${params.Key}`,
            ETag: '"mock-etag"',
            Bucket: params.Bucket,
            Key: params.Key
        })
    }),
    deleteObject: (params) => ({
        promise: () => Promise.resolve({})
    })
};
class MediaService {
    static async generateUploadUrl(uploadData) {
        try {
            if (uploadData.fileSize > this.MAX_FILE_SIZE) {
                throw new errors_1.AppError(errors_1.ErrorMessages.FILE_TOO_LARGE, 400);
            }
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
            const uploadUrl = s3.getSignedUrl('putObject', {
                Bucket: config_1.config.aws.s3.bucket,
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
            await redis_service_1.RedisService.setCache(`upload:${mediaFile.id}`, JSON.stringify({
                userId: uploadData.userId,
                filename: uploadData.filename,
                mimeType: uploadData.mimeType,
                fileSize: uploadData.fileSize
            }), this.UPLOAD_URL_EXPIRY);
            logger_1.logger.info('Upload URL generated', {
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
        }
        catch (error) {
            logger_1.logger.error('Failed to generate upload URL:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(errors_1.ErrorMessages.MEDIA_UPLOAD_FAILED, 500);
        }
    }
    static async confirmUpload(mediaFileId, userId) {
        try {
            const mediaFile = await prisma.mediaFile.findUnique({
                where: { id: mediaFileId }
            });
            if (!mediaFile) {
                throw new errors_1.AppError('Media file not found', 404);
            }
            if (mediaFile.uploaderId !== userId) {
                throw new errors_1.AppError('Access denied', 403);
            }
            await prisma.mediaFile.update({
                where: { id: mediaFileId },
                data: {
                    isUploaded: true,
                    uploadedAt: new Date()
                }
            });
            await redis_service_1.RedisService.deleteCache(`upload:${mediaFileId}`);
            logger_1.logger.info('Upload confirmed', {
                mediaFileId,
                userId,
                type: 'media'
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to confirm upload:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(errors_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    static async generateDownloadUrl(mediaFileId, userId) {
        try {
            const mediaFile = await prisma.mediaFile.findUnique({
                where: { id: mediaFileId }
            });
            if (!mediaFile) {
                throw new errors_1.AppError('Media file not found', 404);
            }
            if (mediaFile.uploaderId !== userId) {
                throw new errors_1.AppError('Access denied', 403);
            }
            const downloadUrl = s3.getSignedUrl('getObject', {
                Bucket: config_1.config.aws.s3.bucket,
                Key: mediaFile.s3Key,
                Expires: this.DOWNLOAD_URL_EXPIRY
            });
            return downloadUrl;
        }
        catch (error) {
            logger_1.logger.error('Failed to generate download URL:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(errors_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    static async generateThumbnail(mediaFileId, userId) {
        try {
            const mediaFile = await prisma.mediaFile.findUnique({
                where: { id: mediaFileId }
            });
            if (!mediaFile) {
                throw new errors_1.AppError('Media file not found', 404);
            }
            if (mediaFile.uploaderId !== userId) {
                throw new errors_1.AppError('Access denied', 403);
            }
            if (!['IMAGE', 'VIDEO'].includes(mediaFile.mediaType)) {
                throw new errors_1.AppError('Thumbnail generation not supported for this file type', 400);
            }
            const thumbnailKey = `thumbnails/${mediaFile.s3Key.replace('media/', '')}.thumb.jpg`;
            const thumbnailUrl = s3.getSignedUrl('getObject', {
                Bucket: config_1.config.aws.s3.bucket,
                Key: thumbnailKey,
                Expires: this.DOWNLOAD_URL_EXPIRY
            });
            logger_1.logger.info('Thumbnail URL generated', {
                mediaFileId,
                userId,
                type: 'thumbnail'
            });
            return thumbnailUrl;
        }
        catch (error) {
            logger_1.logger.error('Failed to generate thumbnail:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(errors_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    static async getMediaFile(mediaFileId, userId) {
        try {
            const mediaFile = await prisma.mediaFile.findUnique({
                where: { id: mediaFileId }
            });
            if (!mediaFile) {
                throw new errors_1.AppError('Media file not found', 404);
            }
            if (mediaFile.uploaderId !== userId) {
                const sharedMedia = await prisma.sharedMedia.findFirst({
                    where: {
                        mediaFileId: mediaFileId,
                        sharedWithId: userId
                    }
                });
                if (!sharedMedia) {
                    throw new errors_1.AppError('Access denied', 403);
                }
            }
            const downloadUrl = s3.getSignedUrl('getObject', {
                Bucket: config_1.config.aws.s3.bucket,
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
        }
        catch (error) {
            logger_1.logger.error('Failed to get media file:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(errors_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    static async deleteMediaFile(mediaFileId, userId) {
        try {
            const mediaFile = await prisma.mediaFile.findUnique({
                where: { id: mediaFileId }
            });
            if (!mediaFile) {
                throw new errors_1.AppError('Media file not found', 404);
            }
            if (mediaFile.uploaderId !== userId) {
                throw new errors_1.AppError('Access denied', 403);
            }
            try {
                await s3.deleteObject({
                    Bucket: config_1.config.aws.s3.bucket,
                    Key: mediaFile.s3Key
                }).promise();
            }
            catch (s3Error) {
                logger_1.logger.warn('Failed to delete file from S3:', s3Error);
            }
            await prisma.mediaFile.delete({
                where: { id: mediaFileId }
            });
            logger_1.logger.info('Media file deleted', {
                mediaFileId,
                userId,
                type: 'media'
            });
        }
        catch (error) {
            logger_1.logger.error('Failed to delete media file:', error);
            throw error instanceof errors_1.AppError ? error : new errors_1.AppError(errors_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    static async getUserMediaFiles(userId, mediaType, page = 1, limit = 20) {
        try {
            const offset = (page - 1) * limit;
            const where = { uploaderId: userId };
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
            const media = await Promise.all(mediaFiles.map(async (file) => ({
                id: file.id,
                filename: file.originalName,
                mimeType: file.mimeType,
                fileSize: file.fileSize,
                mediaType: file.mediaType,
                url: s3.getSignedUrl('getObject', {
                    Bucket: config_1.config.aws.s3.bucket,
                    Key: file.s3Key,
                    Expires: this.DOWNLOAD_URL_EXPIRY
                }),
                createdAt: file.createdAt
            })));
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
        }
        catch (error) {
            logger_1.logger.error('Failed to get user media files:', error);
            throw new errors_1.AppError(errors_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    static async getMediaStats(userId) {
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
            }, {});
            return {
                totalFiles,
                totalSize,
                byType
            };
        }
        catch (error) {
            logger_1.logger.error('Failed to get media stats:', error);
            throw new errors_1.AppError(errors_1.ErrorMessages.INTERNAL_SERVER_ERROR, 500);
        }
    }
    static getMediaTypeFromMime(mimeType) {
        if (mimeType.startsWith('image/')) {
            return client_1.MediaType.IMAGE;
        }
        else if (mimeType.startsWith('video/')) {
            return client_1.MediaType.VIDEO;
        }
        else if (mimeType.startsWith('audio/')) {
            return client_1.MediaType.AUDIO;
        }
        else {
            return client_1.MediaType.DOCUMENT;
        }
    }
}
exports.MediaService = MediaService;
MediaService.MAX_FILE_SIZE = 100 * 1024 * 1024;
MediaService.UPLOAD_URL_EXPIRY = 300;
MediaService.DOWNLOAD_URL_EXPIRY = 3600;
//# sourceMappingURL=media.service.js.map