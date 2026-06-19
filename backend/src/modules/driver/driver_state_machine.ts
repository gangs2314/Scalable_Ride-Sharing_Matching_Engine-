// backend/src/modules/driver/driver_state_machine.ts
import { prisma } from '../../infrastructure/database/prisma_client.js';
import { redisClient } from '../../infrastructure/redis/redis_client.js';

export enum DriverState {
  OFFLINE = 'OFFLINE',
  AVAILABLE = 'AVAILABLE',
  IN_RIDE = 'IN_RIDE'
}

export class DriverStateMachine {
  static async changeState(driverId: string, newState: DriverState): Promise<void> {
    // 1. Update Persistent Database (PostgreSQL)
    const isOnline = newState !== DriverState.OFFLINE;
    await prisma.driver.update({
      where: { id: driverId },
      data: { isOnline }
    });

    // 2. Update Real-Time Fast Cache (Redis)
    const redisKey = `driver_state:${driverId}`;
    if (newState === DriverState.OFFLINE) {
      await redisClient.del(redisKey); // Remove from active pool
    } else {
      await redisClient.set(redisKey, newState); // Set to AVAILABLE or IN_RIDE
    }

    console.log(`🚘 Driver ${driverId} state changed to ${newState}`);
  }

  static async getState(driverId: string): Promise<DriverState> {
    const state = await redisClient.get(`driver_state:${driverId}`);
    return (state as DriverState) || DriverState.OFFLINE;
  }
}