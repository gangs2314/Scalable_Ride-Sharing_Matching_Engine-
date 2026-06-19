// backend/src/modules/ride/surge/demand_tracker.ts
import { redisClient } from '../../../infrastructure/redis/redis_client.js';

export class DemandTracker {
  /**
   * Increments the ride request count for a specific geohash/grid zone.
   * Keys automatically expire to keep the data windowed to recent demand.
   */
  static async logRideRequest(gridZone: string): Promise<void> {
    const key = `surge:demand:${gridZone}`;
    
    const multi = redisClient.multi();
    multi.incr(key);
    // Keep demand data windowed to the last 5 minutes (300 seconds)
    multi.expire(key, 300); 
    
    await multi.exec();
    console.log(`📈 Demand logged for zone ${gridZone}`);
  }

  static async getDemand(gridZone: string): Promise<number> {
    const demand = await redisClient.get(`surge:demand:${gridZone}`);
    return demand ? parseInt(demand, 10) : 0;
  }
}