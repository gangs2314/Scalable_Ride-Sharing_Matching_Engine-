import { Redis } from 'ioredis';

export class GeoService {
  private redisClient: Redis;
  private readonly GEO_KEY = 'driver:locations';

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }

  /**
   * Updates the driver's current location in the Redis GEO index.
   * Called every few seconds via WebSocket when the driver is moving.
   */
  async updateDriverLocation(driverId: string, lat: number, lon: number): Promise<void> {
    // Redis GEOADD expects Longitude first, then Latitude
    await this.redisClient.geoadd(this.GEO_KEY, lon, lat, driverId);
    console.log(`[GeoService] Updated location for driver ${driverId}: [${lat}, ${lon}]`);
  }

  /**
   * Removes a driver from the GEO index entirely.
   * Triggered when a driver goes OFFLINE.
   */
  async removeDriverLocation(driverId: string): Promise<void> {
    // GEO indexes are stored as Sorted Sets (ZSET) under the hood, so we use ZREM
    await this.redisClient.zrem(this.GEO_KEY, driverId);
    console.log(`[GeoService] Removed driver ${driverId} from GEO index`);
  }

  /**
   * The core matching query: Finds all drivers within a specific radius.
   * Returns an array of driver IDs, sorted by closest first.
   */
  async getNearbyDrivers(lat: number, lon: number, radiusKm: number): Promise<string[]> {
    try {
      // Using modern GEOSEARCH (Redis 6.2+) to find drivers within the radius
      const nearbyDrivers = await this.redisClient.geosearch(
        this.GEO_KEY,
        'FROMLONLAT', lon, lat,
        'BYRADIUS', radiusKm, 'km',
        'ASC' // Sort closest to furthest
      );
      
      return nearbyDrivers as string[];
    } catch (error) {
      console.error(`[GeoService] Error finding nearby drivers:`, error);
      return [];
    }
  }
}