// backend/src/modules/user/user.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/jwt_guard.js';
import { prisma } from '../../infrastructure/database/prisma_client.js';

export class UserController {
  static async getProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { driverProfile: true } // Include driver details if they have any
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.status(200).json({ data: user });
    } catch (error) {
      console.error('Fetch profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}