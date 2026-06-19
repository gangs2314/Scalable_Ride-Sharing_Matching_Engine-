// backend/src/modules/ride/ride.routes.ts
import { Router } from 'express';
import { CreateRideController } from './controllers/create_ride.controller.js';
import { jwtGuard } from '../../shared/middlewares/jwt_guard.js';

const router = Router();

// Protect ride creation with JWT Guard
router.post('/request', jwtGuard, CreateRideController.execute);

export default router;