// backend/src/modules/ride/controllers/create_ride.controller.ts
import { Response } from 'express';
import { AuthRequest } from '../../../shared/middlewares/jwt_guard.js';
import { prisma } from '../../../infrastructure/database/prisma_client.js';
import { MatchingEngine } from '../matching/matching_engine.js'; 
import { DemandTracker } from '../surge/demand_tracker.js';

export class CreateRideController {
  static async execute(req: AuthRequest, res: Response): Promise<void> {
    try {
      const riderId = req.user?.id;
      const { pickupLat, pickupLon, dropoffLat, dropoffLon } = req.body;

      if (!riderId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const activeRide = await prisma.ride.findFirst({
        where: {
          riderId,
          status: { in: ['REQUESTED', 'ACCEPTED', 'ARRIVED', 'IN_PROGRESS'] }
        }
      });

      if (activeRide) {
        res.status(400).json({ error: 'You already have an active ride request.' });
        return;
      }

      // 1. Create the ride request
      const ride = await prisma.ride.create({
        data: {
          riderId,
          pickupLat,
          pickupLon,
          dropoffLat,
          dropoffLon,
          status: 'REQUESTED'
        }
      });

      // 2. 🔥 LOG DEMAND FOR SURGE PRICING
      // For MVP, we use a static zone. In production, you'd convert Lat/Lon to a geohash.
      const gridZone = 'zone_central'; 
      await DemandTracker.logRideRequest(gridZone);

      // 3. 🔥 TRIGGER THE MATCHING ENGINE
      // Note: We use pickupLon first, then pickupLat for Redis GEO
      const matchedDriverId = await MatchingEngine.findBestDriver(pickupLon, pickupLat);

      if (matchedDriverId) {
        console.log(`✅ Match found! Assigning driver ${matchedDriverId} to ride ${ride.id}`);
        
        // Update ride with the assigned driver
        await prisma.ride.update({
          where: { id: ride.id },
          data: { driverId: matchedDriverId, status: 'ACCEPTED' } // Auto-accepting for MVP
        });

        // Update driver state to IN_RIDE so they don't get matched again
        // (In a real app, you'd send an offer with timeout first)
        // await DriverStateMachine.changeState(matchedDriverId, DriverState.IN_RIDE);
        
        res.status(201).json({ message: 'Ride matched successfully', data: { ...ride, driverId: matchedDriverId } });
      } else {
        res.status(201).json({ message: 'Ride requested, but no drivers currently available. Searching...', data: ride });
      }

    } catch (error) {
      console.error('Create ride error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}