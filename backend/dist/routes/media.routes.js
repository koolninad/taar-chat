"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.mediaRoutes = void 0;
const express_1 = require("express");
const mediaController = __importStar(require("../controllers/media.controller"));
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.mediaRoutes = router;
router.use(auth_middleware_1.authenticateToken);
router.post('/upload', (0, auth_middleware_1.createRateLimit)(300000, 20, 'Too many upload requests'), (0, validation_middleware_1.validate)(validation_middleware_1.mediaSchemas.uploadMedia), mediaController.generateUploadUrl);
router.post('/:mediaFileId/confirm', mediaController.confirmUpload);
router.get('/my', mediaController.getUserMediaFiles);
router.get('/search', (0, auth_middleware_1.createRateLimit)(60000, 30, 'Too many search requests'), mediaController.searchMediaFiles);
router.get('/stats', mediaController.getMediaStats);
router.post('/bulk-delete', (0, auth_middleware_1.createRateLimit)(300000, 5, 'Too many bulk delete requests'), mediaController.bulkDeleteMediaFiles);
router.get('/:mediaFileId', (0, validation_middleware_1.validate)(validation_middleware_1.mediaSchemas.getMedia), mediaController.getMediaFile);
router.put('/:mediaFileId', mediaController.updateMediaFile);
router.delete('/:mediaFileId', (0, validation_middleware_1.validate)(validation_middleware_1.mediaSchemas.deleteMedia), mediaController.deleteMediaFile);
router.get('/:mediaFileId/download', (0, auth_middleware_1.createRateLimit)(60000, 50, 'Too many download requests'), mediaController.generateDownloadUrl);
router.post('/:mediaFileId/thumbnail', (0, auth_middleware_1.createRateLimit)(300000, 10, 'Too many thumbnail requests'), mediaController.generateThumbnail);
router.get('/:mediaFileId/progress', mediaController.getUploadProgress);
router.post('/:mediaFileId/cancel', mediaController.cancelUpload);
//# sourceMappingURL=media.routes.js.map