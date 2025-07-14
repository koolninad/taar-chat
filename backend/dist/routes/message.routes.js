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
exports.messageRoutes = void 0;
const express_1 = require("express");
const messageController = __importStar(require("../controllers/message.controller"));
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.messageRoutes = router;
router.use(auth_middleware_1.authenticateToken);
router.post('/', (0, auth_middleware_1.createRateLimit)(60000, 100, 'Too many messages'), (0, validation_middleware_1.validate)(validation_middleware_1.messageSchemas.sendMessage), messageController.sendMessage);
router.get('/search', (0, auth_middleware_1.createRateLimit)(60000, 30, 'Too many search requests'), messageController.searchMessages);
router.get('/chats', messageController.getChatList);
router.get('/unread', messageController.getUnreadCount);
router.get('/:chatId', (0, validation_middleware_1.validate)(validation_middleware_1.messageSchemas.getMessages), messageController.getMessages);
router.patch('/:chatId/read', messageController.markAllAsRead);
router.patch('/:messageId/delivered', (0, validation_middleware_1.validate)(validation_middleware_1.messageSchemas.markAsDelivered), messageController.markAsDelivered);
router.patch('/:messageId/read', (0, validation_middleware_1.validate)(validation_middleware_1.messageSchemas.markAsRead), messageController.markAsRead);
router.get('/:messageId/status', messageController.getDeliveryStatus);
router.post('/:messageId/forward', messageController.forwardMessage);
router.get('/:messageId/reactions', messageController.getMessageReactions);
router.post('/:messageId/reactions', messageController.addReaction);
router.delete('/:messageId/reactions', messageController.removeReaction);
router.delete('/:messageId', (0, validation_middleware_1.validate)(validation_middleware_1.messageSchemas.deleteMessage), messageController.deleteMessage);
//# sourceMappingURL=message.routes.js.map