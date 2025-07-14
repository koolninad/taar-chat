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
exports.groupRoutes = void 0;
const express_1 = require("express");
const groupController = __importStar(require("../controllers/group.controller"));
const validation_middleware_1 = require("../middleware/validation.middleware");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
exports.groupRoutes = router;
router.use(auth_middleware_1.authenticateToken);
router.post('/', (0, auth_middleware_1.createRateLimit)(3600000, 10, 'Too many group creations'), (0, validation_middleware_1.validate)(validation_middleware_1.groupSchemas.createGroup), groupController.createGroup);
router.get('/my', groupController.getUserGroups);
router.post('/join/:inviteCode', (0, auth_middleware_1.createRateLimit)(300000, 5, 'Too many join attempts'), groupController.joinGroupByInvite);
router.get('/:groupId', groupController.getGroupDetails);
router.put('/:groupId', (0, validation_middleware_1.validate)(validation_middleware_1.groupSchemas.updateGroup), groupController.updateGroup);
router.get('/:groupId/members', groupController.getGroupMembers);
router.post('/:groupId/members', (0, auth_middleware_1.createRateLimit)(300000, 10, 'Too many member additions'), (0, validation_middleware_1.validate)(validation_middleware_1.groupSchemas.addMembers), groupController.addMembers);
router.delete('/:groupId/members/:memberId', (0, validation_middleware_1.validate)(validation_middleware_1.groupSchemas.removeMember), groupController.removeMember);
router.patch('/:groupId/members/:memberId/role', (0, validation_middleware_1.validate)(validation_middleware_1.groupSchemas.updateMemberRole), groupController.updateMemberRole);
router.post('/:groupId/leave', (0, validation_middleware_1.validate)(validation_middleware_1.groupSchemas.leaveGroup), groupController.leaveGroup);
router.post('/:groupId/invite', (0, auth_middleware_1.createRateLimit)(300000, 5, 'Too many invite generations'), groupController.generateInviteLink);
router.get('/:groupId/stats', groupController.getGroupStats);
router.patch('/:groupId/mute', groupController.toggleGroupMute);
//# sourceMappingURL=group.routes.js.map