// backend/src/modules/admin/admin.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/jwt_guard.js';
import { prisma } from '../../infrastructure/database/prisma_client.js';

export class AdminController {
  // Get an overview of platform statistics
  static async getSystemStats(req: AuthRequest, res: Response): Promise<void> {
    try {
      const [totalUsers, totalDrivers, activeRides, totalCompletedRides] = await Promise.all([
        prisma.user.count({ where: { role: 'RIDER' } }),
        prisma.driver.count(),
        prisma.ride.count({ 
          where: { status: { in: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] } } 
        }),
        prisma.ride.count({ where: { status: 'COMPLETED' } })
      ]);

      res.status(200).json({
        data: {
          totalUsers,
          totalDrivers,
          activeRides,
          totalCompletedRides
        }
      });
    } catch (error) {
      console.error('Admin stats error:', error);
      res.status(500).json({ error: 'Internal server error fetching stats' });
    }
  }

  // Fetch a paginated list of all active rides
  static async getActiveRides(req: AuthRequest, res: Response): Promise<void> {
    try {
      const activeRides = await prisma.ride.findMany({
        where: { status: { in: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] } },
        include: {
          rider: { select: { phone: true, name: true } },
          driver: { select: { user: { select: { phone: true } }, vehicleType: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 50 // Limit to top 50 for the dashboard MVP
      });

      res.status(200).json({ data: activeRides });
    } catch (error) {
      console.error('Admin active rides error:', error);
      res.status(500).json({ error: 'Internal server error fetching rides' });
    }
  }
}