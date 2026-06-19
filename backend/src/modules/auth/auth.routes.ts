// backend/src/modules/auth/auth.routes.ts
import { Router } from 'express';
import { AuthController } from './auth.controller.js';

const router = Router();

// POST /api/auth/login
router.post('/login', AuthController.login);

export default router;