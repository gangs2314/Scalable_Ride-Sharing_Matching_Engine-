// backend/src/main.ts
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http'; // <-- Import core HTTP module
import { prisma } from './infrastructure/database/prisma_client.js';
import './infrastructure/redis/redis_client.js'; 

import authRoutes from './modules/auth/auth.routes.js'; 
import userRoutes from './modules/user/user.routes.js';
import driverRoutes from './modules/driver/driver.routes.js';
import rideRoutes from './modules/ride/ride.routes.js';
// import { initializeWebSocket } from './modules/location/location_gateway.js'; 
import adminRoutes from './modules/admin/admin.routes.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Wrap Express with HTTP Server
const httpServer = createServer(app);

// Initialize WebSockets
// initializeWebSocket(httpServer);

app.use('/api/auth', authRoutes); 
app.use('/api/user', userRoutes); 
app.use('/api/driver', driverRoutes);
app.use('/api/ride', rideRoutes);
app.use('/api/admin', adminRoutes);

app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'OK', message: 'Backend, PostgreSQL, and Redis are live! 🚀' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', message: 'Database connection failed' });
  }
});

// Change app.listen to httpServer.listen!
httpServer.listen(PORT, () => {
  console.log(`🚀 HTTP & WebSocket Server running on http://localhost:${PORT}`);
});