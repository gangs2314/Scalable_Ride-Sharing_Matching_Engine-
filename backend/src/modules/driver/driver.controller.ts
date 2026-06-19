// backend/src/modules/driver/driver.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../../shared/middlewares/jwt_guard.js';
import { prisma } from '../../infrastructure/database/prisma_client.js';
import { DriverStateMachine, DriverState } from './driver_state_machine.js';

export class DriverController {
  // 1. Register a user as a driver
  static async registerDriver(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { vehicleType } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      // Check if already a driver
      let driver = await prisma.driver.findUnique({ where: { userId } });
      if (driver) {
        res.status(400).json({ error: 'User is already a driver' });
        return;
      }

      // Upgrade user role and create driver profile
      await prisma.user.update({ where: { id: userId }, data: { role: 'DRIVER' } });
      driver = await prisma.driver.create({
        data: { userId, vehicleType, isOnline: false }
      });

      res.status(201).json({ message: 'Driver registered successfully', data: driver });
    } catch (error) {
      console.error('Driver registration error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // 2. Toggle Online/Offline status
  static async toggleStatus(req: AuthRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const { status } = req.body; // Expecting 'AVAILABLE' or 'OFFLINE'

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const driver = await prisma.driver.findUnique({ where: { userId } });
      if (!driver) {
        res.status(404).json({ error: 'Driver profile not found' });
        return;
      }

      const newState = status === 'AVAILABLE' ? DriverState.AVAILABLE : DriverState.OFFLINE;
      await DriverStateMachine.changeState(driver.id, newState);

      res.status(200).json({ message: `Driver is now ${newState}` });
    } catch (error) {
      console.error('Status toggle error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}