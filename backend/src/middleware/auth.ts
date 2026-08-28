import { Request, Response, NextFunction } from 'express';
import { store } from '../db/store';
import { UserProfile, UserRole } from '../types/shared';
import { firebaseAdminDb } from '../config/firebase';

export interface AuthenticatedRequest extends Request {
  user?: UserProfile;
}

const userCache = new Map<string, UserProfile>();

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const headerUserId = req.headers['x-user-id'] as string;
  const headerUserRole = req.headers['x-user-role'] as UserRole;

  if (headerUserId) {
    if (userCache.has(headerUserId)) {
      req.user = userCache.get(headerUserId);
      return next();
    }
    
    try {
      if (firebaseAdminDb) {
        const doc = await firebaseAdminDb.collection('users').doc(headerUserId).get();
        if (doc.exists) {
          const userData = doc.data() as UserProfile;
          userCache.set(headerUserId, userData);
          req.user = userData;
          return next();
        }
      }
    } catch (e) {
      // Ignore and fallback
    }

    const foundUser = store.users.find((u) => u.id === headerUserId);
    if (foundUser) {
      req.user = foundUser;
      return next();
    }
  }

  if (headerUserRole) {
    const foundUser = store.users.find((u) => u.role === headerUserRole);
    if (foundUser) {
      req.user = foundUser;
      return next();
    }
  }

  req.user = store.users[0]; // Super Admin default
  next();
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Forbidden: role '${req.user.role}' is not authorized for this resource. Allowed: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
}
