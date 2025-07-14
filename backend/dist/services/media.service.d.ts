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
declare class MediaService {
    private static readonly MAX_FILE_SIZE;
    private static readonly UPLOAD_URL_EXPIRY;
    private static readonly DOWNLOAD_URL_EXPIRY;
    static generateUploadUrl(uploadData: UploadUrlRequest): Promise<UploadUrlResponse>;
    static confirmUpload(mediaFileId: string, userId: string): Promise<void>;
    static generateDownloadUrl(mediaFileId: string, userId: string): Promise<string>;
    static generateThumbnail(mediaFileId: string, userId: string): Promise<string>;
    static getMediaFile(mediaFileId: string, userId: string): Promise<MediaFileResponse>;
    static deleteMediaFile(mediaFileId: string, userId: string): Promise<void>;
    static getUserMediaFiles(userId: string, mediaType?: string, page?: number, limit?: number): Promise<{
        media: MediaFileResponse[];
        pagination: any;
    }>;
    static getMediaStats(userId: string): Promise<any>;
    private static getMediaTypeFromMime;
}
export { MediaService };
//# sourceMappingURL=media.service.d.ts.map