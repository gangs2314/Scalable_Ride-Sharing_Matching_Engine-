// backend/src/shared/middlewares/jwt_guard.ts
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_ride_key_for_dev_environment';

// Extend the Express Request to include our custom user payload
export interface AuthRequest extends Request {
  user?: { id: string; phone: string; role: string };
}

export const jwtGuard = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: No token provided' });
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; phone: string; role: string };
    req.user = decoded; // Attach the decoded payload to the request
    next(); // Pass control to the next handler
  } catch (error) {
    res.status(403).json({ error: 'Forbidden: Invalid or expired token' });
  }
};