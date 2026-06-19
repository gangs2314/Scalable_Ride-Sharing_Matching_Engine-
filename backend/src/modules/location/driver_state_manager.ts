import { Redis } from 'ioredis';

// Define the exact states our system will enforce
export enum DriverState {
  OFFLINE = 'OFFLINE',
  AVAILABLE = 'AVAILABLE',
  IN_RIDE = 'IN_RIDE',
}

export class DriverStateManager {
  private redisClient: Redis;
  private readonly STATE_PREFIX = 'driver:state:';

  constructor(redisClient: Redis) {
    this.redisClient = redisClient;
  }

  /**
   * Sets the driver's state to ONLINE / AVAILABLE.
   * Called when the driver flips the toggle in the app.
   */
  async goOnline(driverId: string): Promise<void> {
    await this.changeState(driverId, DriverState.AVAILABLE);
  }

  /**
   * Sets the driver's state to OFFLINE.
   */
  async goOffline(driverId: string): Promise<void> {
    await this.changeState(driverId, DriverState.OFFLINE);
  }

  /**
   * Core method to execute the state transition in Redis.
   */
  async changeState(driverId: string, state: DriverState): Promise<void> {
    const key = `${this.STATE_PREFIX}${driverId}`;
    
    // Set the state in Redis
    await this.redisClient.set(key, state);
    
    console.log(`[DriverStateManager] Driver ${driverId} state changed to ${state}`);
  }

  /**
   * Fetches the current state of a specific driver.
   * Defaulting to OFFLINE if no state is found.
   */
  async getState(driverId: string): Promise<DriverState> {
    const key = `${this.STATE_PREFIX}${driverId}`;
    const state = await this.redisClient.get(key);
    
    return (state as DriverState) || DriverState.OFFLINE;
  }
}