// backend/src/modules/user/user.routes.ts
import { Router } from 'express';
import { UserController } from './user.controller.js';
import { jwtGuard } from '../../shared/middlewares/jwt_guard.js';

const router = Router();

// Notice we inject the jwtGuard BEFORE the controller!
router.get('/profile', jwtGuard, UserController.getProfile);

export default router;