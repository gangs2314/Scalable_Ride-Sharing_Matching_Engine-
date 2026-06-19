// backend/src/modules/admin/admin.routes.ts
import { Router } from 'express';
import { AdminController } from './admin.controller.js';
import { jwtGuard } from '../../shared/middlewares/jwt_guard.js';
import { roleGuard } from '../../shared/middlewares/role_guard.js';

const router = Router();

// Protect all admin routes with JWT AND Role Guard
router.use(jwtGuard, roleGuard(['ADMIN']));

router.get('/stats', AdminController.getSystemStats);
router.get('/rides/active', AdminController.getActiveRides);

export default router;