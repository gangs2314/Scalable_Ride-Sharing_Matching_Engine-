// backend/src/modules/ride/surge/surge_calculator.ts
import { redisClient } from '../../../infrastructure/redis/redis_client.js';
import { DemandTracker } from './demand_tracker.js';
import { GeoService } from '../../location/geo_service.js';

export class SurgeCalculator {
  /**
   * Calculates and stores the active surge multiplier for a specific zone.
   */
  static async calculateMultiplier(gridZone: string, centralLon: number, centralLat: number): Promise<number> {
    // 1. Get recent demand (ride requests in last 5 mins)
    const demand = await DemandTracker.getDemand(gridZone);

    // 2. Get available supply (drivers in a 5km radius of the zone center)
    const availableDrivers = await GeoService.getNearbyDrivers(centralLon, centralLat, 5);
    const supply = availableDrivers.length;

    // 3. Surge Formula
    let surgeMultiplier = 1.0;

    if (supply === 0 && demand > 0) {
      surgeMultiplier = 2.5; // Max surge if riders are waiting but no drivers exist
    } else if (demand > supply) {
      // Basic mathematical surge calculation
      surgeMultiplier = 1.0 + ((demand - supply) * 0.1);
    }

    // Cap the surge to prevent absurd pricing
    surgeMultiplier = Math.min(surgeMultiplier, 3.0);

    // 4. Store the multiplier in Redis for quick access by the pricing engine
    await redisClient.set(`surge:multiplier:${gridZone}`, surgeMultiplier, 'EX', 300);

    console.log(`⚡ Surge for ${gridZone}: Multiplier set to ${surgeMultiplier.toFixed(2)}x`);
    return parseFloat(surgeMultiplier.toFixed(2));
  }
}