import jwt from 'jsonwebtoken';
import { Role } from '../../src/types/roles';

export interface TestUserPayload {
  userId: string;
  email: string;
  role: Role;
  branchId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || 'unit-test-jwt-secret';

/**
 * Generate a signed JWT token for testing
 */
export const generateTestToken = (
  payload: TestUserPayload,
  expiresIn: string | number = '1h'
): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn } as jwt.SignOptions);
};

/**
 * Create Authorization header object
 */
export const authHeader = (token: string): { Authorization: string } => ({
  Authorization: `Bearer ${token}`,
});

/**
 * Convenience helper to create an authenticated header for a given role
 */
export const roleAuthHeader = (
  role: Role,
  userId = `user-${role.toLowerCase()}-1`,
  branchId = 'branch-main'
): { Authorization: string } => {
  const token = generateTestToken({
    userId,
    email: `${role.toLowerCase()}@test.local`,
    role,
    branchId,
  });
  return authHeader(token);
};

/**
 * Generate an expired token for negative test scenarios
 */
export const generateExpiredToken = (
  payload: TestUserPayload = {
    userId: 'expired-user',
    email: 'expired@test.local',
    role: Role.READER,
  }
): string => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: -10 } as jwt.SignOptions);
};

/**
 * Generate an invalidly signed token (tampered token)
 */
export const generateTamperedToken = (
  payload: TestUserPayload = {
    userId: 'tampered-user',
    email: 'tampered@test.local',
    role: Role.ADMIN,
  }
): string => {
  return jwt.sign(payload, 'wrong-secret-signature', { expiresIn: '1h' });
};
