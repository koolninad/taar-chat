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
exports.signalRoutes = void 0;
const express_1 = require("express");
const signalController = __importStar(require("../controllers/signal.controller"));
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.signalRoutes = router;
router.use(auth_middleware_1.authenticateToken);
router.post('/init', (0, auth_middleware_1.createRateLimit)(3600000, 5, 'Too many Signal initialization requests'), signalController.initializeSignal);
router.post('/prekeys', (0, auth_middleware_1.createRateLimit)(3600000, 10, 'Too many prekey generation requests'), signalController.generatePreKeys);
router.get('/prekeys/my', signalController.getMyPreKeyBundle);
router.get('/prekeys/:userId', (0, auth_middleware_1.createRateLimit)(60000, 30, 'Too many prekey requests'), (0, validation_middleware_1.validate)(validation_middleware_1.signalSchemas.getPrekeys), signalController.getPreKeyBundle);
router.post('/signed-prekey/rotate', (0, auth_middleware_1.createRateLimit)(86400000, 3, 'Too many signed prekey rotations'), signalController.rotateSignedPreKey);
router.get('/sessions', signalController.getSessions);
router.delete('/sessions/:userId', signalController.deleteSession);
router.get('/fingerprint/:userId', (0, validation_middleware_1.validate)(validation_middleware_1.signalSchemas.getIdentityKey), signalController.generateFingerprint);
router.post('/verify/:userId', signalController.verifySafetyNumbers);
router.post('/encrypt', (0, auth_middleware_1.createRateLimit)(60000, 100, 'Too many encryption requests'), signalController.encryptMessage);
router.post('/decrypt', (0, auth_middleware_1.createRateLimit)(60000, 100, 'Too many decryption requests'), signalController.decryptMessage);
router.get('/stats', signalController.getSignalStats);
router.post('/reset', (0, auth_middleware_1.createRateLimit)(86400000, 1, 'Only one reset per day allowed'), signalController.resetIdentity);
router.get('/export', signalController.exportSignalData);
router.post('/import', signalController.importSignalData);
router.get('/health', signalController.signalHealthCheck);
//# sourceMappingURL=signal.routes.js.map