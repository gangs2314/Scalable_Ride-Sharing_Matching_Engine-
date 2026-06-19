// backend/src/modules/ride/matching/matching_engine.ts

import { GeoService } from '../../location/geo_service.js';
import { DriverStateManager, DriverState } from '../../location/driver_state_manager.js';
import { ScoringFormula } from './scoring_algorithm.js';
import { prisma } from '../../../infrastructure/database/prisma_client.js';

export class MatchingEngine {
  constructor(
    private geoService: GeoService,
    private stateManager: DriverStateManager
  ) {}

  async findBestDriver(
    pickupLat: number,
    pickupLon: number,
    initialRadiusKm: number = 3
  ): Promise<string | null> {
    console.log(`[MatchingEngine] Searching for drivers within ${initialRadiusKm}km...`);

    const nearbyDriverIds = await this.geoService.getNearbyDrivers(pickupLat, pickupLon, initialRadiusKm);
    if (nearbyDriverIds.length === 0) {
      console.log('[MatchingEngine] No drivers found in radius.');
      return null;
    }

    let bestDriverId: string | null = null;
    let highestScore = -1;

    for (let i = 0; i < nearbyDriverIds.length; i++) {
      const driverId = nearbyDriverIds[i];

      const state = await this.stateManager.getState(driverId);
      if (state !== DriverState.AVAILABLE) continue;

      // 🔍 FETCH DRIVER PROFILE – adjust field names to match your Prisma schema
      const driverProfile = await prisma.driver.findUnique({
        where: { id: driverId },
        select: {
          rating: true,           // adjust to your actual Prisma schema field name
          acceptanceRate: true,   // adjust to your actual Prisma schema field name
        },
      });

      if (!driverProfile) continue;

      const estimatedDistanceKm = (i + 1) * 0.5; // mock – replace with real distance
      const idleTimeMinutes = 15;                // mock – replace with real idle time

      const score = ScoringFormula.calculateScore(
        estimatedDistanceKm,
        driverProfile.rating ?? 4.5,
        driverProfile.acceptanceRate ?? 90,
        idleTimeMinutes
      );

      console.log(`[MatchingEngine] Driver ${driverId} scored: ${score.toFixed(2)}`);

      if (score > highestScore) {
        highestScore = score;
        bestDriverId = driverId;
      }
    }

    if (bestDriverId) {
      console.log(`[MatchingEngine] Match found! Offering ride to: ${bestDriverId}`);
    } else {
      console.log('[MatchingEngine] No available drivers after filtering.');
    }

    return bestDriverId;
  }
}