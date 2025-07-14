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
exports.authRoutes = void 0;
const express_1 = require("express");
const authController = __importStar(require("../controllers/auth.controller"));
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.authRoutes = router;
router.post('/send-otp', (0, auth_middleware_1.createRateLimit)(300000, 3, 'Too many OTP requests'), (0, validation_middleware_1.validate)(validation_middleware_1.authSchemas.sendOtp), authController.sendOtp);
router.post('/verify-otp', (0, auth_middleware_1.createRateLimit)(300000, 5, 'Too many verification attempts'), (0, validation_middleware_1.validate)(validation_middleware_1.authSchemas.verifyOtp), authController.verifyOtp);
router.post('/refresh', (0, validation_middleware_1.validate)(validation_middleware_1.authSchemas.refreshToken), authController.refreshToken);
router.post('/logout', auth_middleware_1.authenticateToken, authController.logout);
router.post('/revoke-all', auth_middleware_1.authenticateToken, authController.revokeAllSessions);
router.get('/profile', auth_middleware_1.authenticateToken, authController.getProfile);
router.put('/profile', auth_middleware_1.authenticateToken, (0, validation_middleware_1.validate)(validation_middleware_1.authSchemas.updateProfile), authController.updateProfile);
router.get('/check', auth_middleware_1.authenticateToken, authController.checkAuth);
router.post('/delete-account', auth_middleware_1.authenticateToken, (0, auth_middleware_1.createRateLimit)(86400000, 1, 'Only one deletion request per day'), authController.requestAccountDeletion);
router.post('/change-phone/request', auth_middleware_1.authenticateToken, (0, auth_middleware_1.createRateLimit)(3600000, 3, 'Too many phone change requests'), (0, validation_middleware_1.validate)(validation_middleware_1.authSchemas.sendOtp), authController.changePhoneNumberRequest);
router.post('/change-phone/verify', auth_middleware_1.authenticateToken, (0, validation_middleware_1.validate)({
    body: validation_middleware_1.authSchemas.verifyOtp.body.fork(['phoneNumber', 'countryCode'], (schema) => schema.forbidden()).append({
        otpCode: validation_middleware_1.authSchemas.verifyOtp.body.extract('otpCode')
    })
}), authController.verifyPhoneNumberChange);
//# sourceMappingURL=auth.routes.js.map