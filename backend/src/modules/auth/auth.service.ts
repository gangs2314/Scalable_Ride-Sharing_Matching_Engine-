// backend/src/modules/auth/auth.service.ts
import { prisma } from '../../infrastructure/database/prisma_client.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

export class AuthService {
  static async loginWithPhone(phone: string, role: 'RIDER' | 'DRIVER' = 'RIDER') {
    // 1. Check if user exists
    let user = await prisma.user.findUnique({ where: { phone } });

    // 2. If no user exists, create a new one (Seamless Registration)
    if (!user) {
      user = await prisma.user.create({
        data: { phone, role },
      });
    }

    // 3. Generate a secure JWT
    const token = jwt.sign(
      { id: user.id, phone: user.phone, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' } // JWT expiry [cite: 260]
    );

    return { user, token };
  }
}