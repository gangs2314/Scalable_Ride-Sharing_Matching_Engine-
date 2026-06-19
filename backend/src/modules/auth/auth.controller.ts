// backend/src/modules/auth/auth.controller.ts
import { Request, Response } from 'express';
import { AuthService } from './auth.service.js';

export class AuthController {
  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { phone, role } = req.body;

      if (!phone) {
        res.status(400).json({ error: 'Phone number is required' });
        return; 
      }

      const result = await AuthService.loginWithPhone(phone, role);
      res.status(200).json({ message: 'Login successful', data: result });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error during login' });
    }
  }
}