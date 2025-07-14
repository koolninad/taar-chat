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
exports.userRoutes = void 0;
const express_1 = require("express");
const userController = __importStar(require("../controllers/user.controller"));
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.userRoutes = router;
router.use(auth_middleware_1.authenticateToken);
router.get('/search', (0, auth_middleware_1.createRateLimit)(60000, 30, 'Too many search requests'), (0, validation_middleware_1.validate)(validation_middleware_1.userSchemas.searchUsers), userController.searchUsers);
router.get('/contacts', userController.getContacts);
router.post('/contacts', (0, auth_middleware_1.createRateLimit)(300000, 10, 'Too many contact additions'), (0, validation_middleware_1.validate)(validation_middleware_1.userSchemas.addContact), userController.addContact);
router.post('/contacts/import', (0, auth_middleware_1.createRateLimit)(3600000, 3, 'Too many import requests'), (0, validation_middleware_1.validate)(validation_middleware_1.userSchemas.importContacts), userController.importContacts);
router.delete('/contacts/:contactId', (0, validation_middleware_1.validate)(validation_middleware_1.userSchemas.removeContact), userController.removeContact);
router.patch('/contacts/:contactId/block', (0, validation_middleware_1.validate)(validation_middleware_1.userSchemas.toggleBlock), userController.toggleBlockContact);
router.patch('/contacts/:contactId/mute', (0, validation_middleware_1.validate)(validation_middleware_1.userSchemas.toggleMute), userController.toggleMuteContact);
router.patch('/contacts/:contactId/name', (0, validation_middleware_1.validate)(validation_middleware_1.userSchemas.updateContactName), userController.updateContactName);
router.get('/blocked', userController.getBlockedUsers);
router.get('/:userId', (0, validation_middleware_1.validate)(validation_middleware_1.userSchemas.getUserById), userController.getUserProfile);
router.get('/:userId/mutual-contacts', (0, validation_middleware_1.validate)(validation_middleware_1.userSchemas.getUserById), userController.getMutualContacts);
router.patch('/status/online', (0, validation_middleware_1.validate)(validation_middleware_1.userSchemas.updateOnlineStatus), userController.updateOnlineStatus);
//# sourceMappingURL=user.routes.js.map