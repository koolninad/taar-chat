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
exports.secureMessageRoutes = void 0;
const express_1 = require("express");
const secureMessageController = __importStar(require("../controllers/secure-message.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.secureMessageRoutes = router;
router.use(auth_middleware_1.authenticateToken);
router.post('/', (0, auth_middleware_1.createRateLimit)(60000, 100, 'Too many secure messages'), secureMessageController.sendSecureMessage);
router.post('/:messageId/decrypt', secureMessageController.decryptMessage);
router.get('/chat/:chatId', secureMessageController.getEncryptedMessages);
router.post('/key-exchange', secureMessageController.processKeyExchange);
router.get('/verify/:chatId', secureMessageController.verifyConversation);
router.get('/sessions/:remoteUserId', secureMessageController.getSessionInfo);
router.get('/stats', secureMessageController.getSecureMessagingStats);
router.post('/batch-decrypt', (0, auth_middleware_1.createRateLimit)(300000, 10, 'Too many batch decrypt requests'), secureMessageController.batchDecryptMessages);
router.post('/:messageId/re-encrypt', secureMessageController.reEncryptMessage);
router.get('/security/:chatId', secureMessageController.getConversationSecurity);
router.get('/export/:chatId', secureMessageController.exportConversationKeys);
router.get('/health', secureMessageController.secureMessagingHealthCheck);
//# sourceMappingURL=secure-message.routes.js.map