// backend/src/shared/middlewares/role_guard.ts
import { Response, NextFunction } from 'express';
import { AuthRequest } from './jwt_guard.js';

export const roleGuard = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole || !allowedRoles.includes(userRole)) {
      res.status(403).json({ error: 'Forbidden: You do not have the required permissions' });
      return;
    }

    next();
  };
};