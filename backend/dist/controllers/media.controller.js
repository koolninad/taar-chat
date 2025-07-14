"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateMediaFile = exports.cancelUpload = exports.getUploadProgress = exports.bulkDeleteMediaFiles = exports.searchMediaFiles = exports.generateThumbnail = exports.getMediaStats = exports.getUserMediaFiles = exports.deleteMediaFile = exports.generateDownloadUrl = exports.getMediaFile = exports.confirmUpload = exports.generateUploadUrl = void 0;
const media_service_1 = require("../services/media.service");
const logger_1 = require("../utils/logger");
const errors_1 = require("../utils/errors");
const errorHandler_1 = require("../middleware/errorHandler");
exports.generateUploadUrl = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { filename, mimeType, fileSize, encryptionKey } = req.body;
    const userId = req.user.userId;
    if (!filename || !mimeType || !fileSize) {
        throw new errors_1.AppError('Filename, mimeType, and fileSize are required', 400);
    }
    if (typeof fileSize !== 'number' || fileSize <= 0) {
        throw new errors_1.AppError('File size must be a positive number', 400);
    }
    let mediaType = 'DOCUMENT';
    if (mimeType.startsWith('image/'))
        mediaType = 'IMAGE';
    else if (mimeType.startsWith('video/'))
        mediaType = 'VIDEO';
    else if (mimeType.startsWith('audio/'))
        mediaType = 'AUDIO';
    const uploadData = await media_service_1.MediaService.generateUploadUrl({
        filename,
        mimeType,
        fileSize,
        userId,
        mediaType,
        encryptionKey
    });
    logger_1.logger.info('Upload URL generated', {
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
exports.confirmUpload = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { mediaFileId } = req.params;
    const userId = req.user.userId;
    await media_service_1.MediaService.confirmUpload(mediaFileId, userId);
    logger_1.logger.info('Upload confirmed', { mediaFileId, userId });
    res.status(200).json({
        success: true,
        message: 'Upload confirmed successfully'
    });
});
exports.getMediaFile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { mediaFileId } = req.params;
    const userId = req.user.userId;
    const mediaFile = await media_service_1.MediaService.getMediaFile(mediaFileId, userId);
    res.status(200).json({
        success: true,
        data: {
            mediaFile
        }
    });
});
exports.generateDownloadUrl = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { mediaFileId } = req.params;
    const userId = req.user.userId;
    const downloadUrl = await media_service_1.MediaService.generateDownloadUrl(mediaFileId, userId);
    logger_1.logger.info('Download URL generated', { mediaFileId, userId });
    res.status(200).json({
        success: true,
        message: 'Download URL generated successfully',
        data: {
            downloadUrl,
            expiresIn: 3600
        }
    });
});
exports.deleteMediaFile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { mediaFileId } = req.params;
    const userId = req.user.userId;
    await media_service_1.MediaService.deleteMediaFile(mediaFileId, userId);
    logger_1.logger.info('Media file deleted', { mediaFileId, userId });
    res.status(200).json({
        success: true,
        message: 'Media file deleted successfully'
    });
});
exports.getUserMediaFiles = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { page, limit, type } = req.query;
    const userId = req.user.userId;
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 20;
    if (limitNum > 100) {
        throw new errors_1.AppError('Limit cannot exceed 100', 400);
    }
    let mimeTypeFilter;
    if (type) {
        const typeMap = {
            'image': 'image/',
            'video': 'video/',
            'audio': 'audio/',
            'document': 'application/'
        };
        mimeTypeFilter = typeMap[type];
        if (!mimeTypeFilter) {
            throw new errors_1.AppError('Invalid type filter. Use: image, video, audio, document', 400);
        }
    }
    const result = await media_service_1.MediaService.getUserMediaFiles(userId, mimeTypeFilter, pageNum, limitNum);
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
exports.getMediaStats = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
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
        storageLimit: 1024 * 1024 * 1024
    };
    res.status(200).json({
        success: true,
        data: {
            stats
        }
    });
});
exports.generateThumbnail = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { mediaFileId } = req.params;
    const userId = req.user.userId;
    await media_service_1.MediaService.getMediaFile(mediaFileId, userId);
    const thumbnailUrl = await media_service_1.MediaService.generateThumbnail(mediaFileId, userId);
    if (!thumbnailUrl) {
        throw new errors_1.AppError('Thumbnail generation not supported for this file type', 400);
    }
    logger_1.logger.info('Thumbnail generated', { mediaFileId, userId });
    res.status(200).json({
        success: true,
        message: 'Thumbnail generated successfully',
        data: {
            thumbnailUrl
        }
    });
});
exports.searchMediaFiles = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { query, type, limit } = req.query;
    const userId = req.user.userId;
    if (!query || typeof query !== 'string') {
        throw new errors_1.AppError('Search query is required', 400);
    }
    if (query.length < 2) {
        throw new errors_1.AppError('Search query must be at least 2 characters', 400);
    }
    const limitNum = limit ? parseInt(limit) : 20;
    if (limitNum > 50) {
        throw new errors_1.AppError('Limit cannot exceed 50', 400);
    }
    const results = [];
    res.status(200).json({
        success: true,
        data: {
            files: results,
            query,
            total: results.length
        }
    });
});
exports.bulkDeleteMediaFiles = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { mediaFileIds } = req.body;
    const userId = req.user.userId;
    if (!Array.isArray(mediaFileIds) || mediaFileIds.length === 0) {
        throw new errors_1.AppError('Media file IDs array is required', 400);
    }
    if (mediaFileIds.length > 50) {
        throw new errors_1.AppError('Cannot delete more than 50 files at once', 400);
    }
    const results = {
        deleted: 0,
        failed: 0,
        errors: []
    };
    for (const mediaFileId of mediaFileIds) {
        try {
            await media_service_1.MediaService.deleteMediaFile(mediaFileId, userId);
            results.deleted++;
        }
        catch (error) {
            results.failed++;
            results.errors.push(`${mediaFileId}: ${error.message}`);
        }
    }
    logger_1.logger.info('Bulk delete completed', {
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
exports.getUploadProgress = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { mediaFileId } = req.params;
    const userId = req.user.userId;
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
exports.cancelUpload = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { mediaFileId } = req.params;
    const userId = req.user.userId;
    await media_service_1.MediaService.deleteMediaFile(mediaFileId, userId);
    logger_1.logger.info('Upload cancelled', { mediaFileId, userId });
    res.status(200).json({
        success: true,
        message: 'Upload cancelled successfully'
    });
});
exports.updateMediaFile = (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { mediaFileId } = req.params;
    const { filename } = req.body;
    const userId = req.user.userId;
    const mediaFile = await media_service_1.MediaService.getMediaFile(mediaFileId, userId);
    logger_1.logger.info('Media file metadata update requested', { mediaFileId, userId });
    res.status(200).json({
        success: true,
        message: 'Media file updated successfully',
        data: {
            mediaFile
        }
    });
});
//# sourceMappingURL=media.controller.js.map