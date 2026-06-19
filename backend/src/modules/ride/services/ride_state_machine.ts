// backend/src/modules/ride/services/ride_state_machine.ts

import { PrismaClient } from '@prisma/client';
import { prisma } from '../../../infrastructure/database/prisma_client.js';

/**
 * Exact lifecycle states a ride can be in.
 */
export enum RideStatus {
  REQUESTED = 'REQUESTED',       // Rider looking for a driver
  ACCEPTED = 'ACCEPTED',         // Driver accepted, en route to pickup
  ARRIVED = 'ARRIVED',           // Driver is waiting at pickup location
  IN_TRANSIT = 'IN_TRANSIT',     // Ride is active, driving to destination
  COMPLETED = 'COMPLETED',       // Ride finished successfully
  CANCELLED = 'CANCELLED',       // Ride aborted by rider, driver, or system
}

export class RideStateMachine {
  /**
   * Defines exactly which states can transition to which other states.
   * This is the core anti‑fraud / anti‑bug mechanism.
   */
  private static readonly ALLOWED_TRANSITIONS: Record<RideStatus, RideStatus[]> = {
    [RideStatus.REQUESTED]:  [RideStatus.ACCEPTED, RideStatus.CANCELLED],
    [RideStatus.ACCEPTED]:   [RideStatus.ARRIVED, RideStatus.CANCELLED],
    [RideStatus.ARRIVED]:    [RideStatus.IN_TRANSIT, RideStatus.CANCELLED],
    [RideStatus.IN_TRANSIT]: [RideStatus.COMPLETED], // No cancellation mid‑ride in normal flow
    [RideStatus.COMPLETED]:  [], // Terminal state
    [RideStatus.CANCELLED]:  [], // Terminal state
  };

  /**
   * Checks if moving from the current state to the new state is strictly allowed.
   */
  public static canTransition(currentStatus: RideStatus, nextStatus: RideStatus): boolean {
    const allowed = this.ALLOWED_TRANSITIONS[currentStatus];
    return allowed.includes(nextStatus);
  }

  /**
   * Validates and executes a state transition in the database.
   * Fetches the current ride, enforces lifecycle rules, and updates the status.
   *
   * @param rideId   - UUID of the ride to transition
   * @param newStatus - The target state (must be a valid transition)
   * @returns The updated ride object
   * @throws Error if ride not found or transition is invalid
   */
  public static async transition(rideId: string, newStatus: RideStatus): Promise<any> {
    // 1. Fetch current ride state
    const ride = await prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new Error('Ride not found');

    const currentStatus = ride.status as RideStatus; // assuming DB stores the enum string

    // 2. Enforce lifecycle rules using the enum‑based validator
    if (!this.canTransition(currentStatus, newStatus)) {
      throw new Error(
        `Invalid state transition: Cannot move ride ${rideId} from ${currentStatus} to ${newStatus}`
      );
    }

    // 3. Update state in database
    const updatedRide = await prisma.ride.update({
      where: { id: rideId },
      data: { status: newStatus as any},
    });

    console.log(`🚕 Ride ${rideId} transitioned: ${currentStatus} -> ${newStatus}`);
    return updatedRide;
  }
}