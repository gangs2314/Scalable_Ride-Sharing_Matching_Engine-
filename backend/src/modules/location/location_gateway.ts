import { Server, Socket } from 'socket.io';
import { DriverStateManager } from './driver_state_manager.js';
import { GeoService } from './geo_service.js';

export class LocationGateway {
  private io: Server;
  private stateManager: DriverStateManager;
  private geoService: GeoService;

  constructor(io: Server, stateManager: DriverStateManager, geoService: GeoService) {
    this.io = io;
    this.stateManager = stateManager;
    this.geoService = geoService;
  }

  /**
   * Initializes the WebSocket listeners for location and driver state events.
   */
  public initializeListeners(): void {
    this.io.on('connection', (socket: Socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // 🔥 1. Driver goes ONLINE
      // Matches the 'driver_online' event from Flutter Driver App
      socket.on('driver_online', async (data: { driver_id: string; name: string }) => {
        console.log(`🟢 Driver ${data.driver_id} (${data.name}) is ONLINE.`);
        
        // Store the driver ID on the socket session for easy cleanup later
        socket.data.driver_id = data.driver_id;
        
        // Update Redis State
        await this.stateManager.goOnline(data.driver_id);
      });

      // 🔥 2. Receive live GPS updates
      // Matches the 'update_location' event from Flutter Geolocator stream
      socket.on('update_location', async (data: { lat: number; lon: number }) => {
        const driverId = socket.data.driver_id;
        
        if (driverId) {
          // Update Redis GEO index
          await this.geoService.updateDriverLocation(driverId, data.lat, data.lon);
          
          // Optional: Broadcast this movement to a specific Rider if the driver is IN_RIDE
          // this.io.to(`ride_${rideId}`).emit('driver_location_update', data);
        } else {
          console.warn(`⚠️ Received location update but no driver_id associated with socket ${socket.id}`);
        }
      });

      // 🔥 3. Handle Disconnects (Driver closes app or loses connection)
      socket.on('disconnect', async () => {
        const driverId = socket.data.driver_id;
        
        if (driverId) {
          console.log(`🔴 Driver ${driverId} disconnected. Cleaning up...`);
          
          // Set state to OFFLINE
          await this.stateManager.goOffline(driverId);
          
          // Remove from GEO index so they don't get matched
          await this.geoService.removeDriverLocation(driverId);
        } else {
          console.log(`🔌 Client disconnected: ${socket.id}`);
        }
      });
    });
  }
}