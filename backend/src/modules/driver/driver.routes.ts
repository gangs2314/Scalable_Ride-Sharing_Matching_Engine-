// backend/src/modules/driver/driver.routes.ts
import { Router } from 'express';
import { DriverController } from './driver.controller.js';
import { jwtGuard } from '../../shared/middlewares/jwt_guard.js';

const router = Router();

// Both routes require the user to be logged in
router.post('/register', jwtGuard, DriverController.registerDriver);
router.post('/status', jwtGuard, DriverController.toggleStatus);

export default router;