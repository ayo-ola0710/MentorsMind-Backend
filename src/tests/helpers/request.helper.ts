import request, { Response } from 'supertest';
import jwt, { SignOptions } from 'jsonwebtoken';
import app from '../../app';

const API_BASE = `/api/${process.env.API_VERSION || 'v1'}`;

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generate a JWT token for testing
 */
export function generateTestToken(payload: AuthTokenPayload, expiresIn = '1h'): string {
  const secret = process.env.JWT_SECRET || 'test-secret';
  return jwt.sign(
    {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
    },
    secret,
    { expiresIn } as SignOptions
  );
}

/**
 * Create a Supertest agent with authentication headers
 */
export function createAuthenticatedAgent(token: string) {
  return request(app).set('Authorization', `Bearer ${token}`);
}

/**
 * Make an authenticated GET request
 */
export async function authenticatedGet(
  endpoint: string,
  token: string,
  headers: Record<string, string> = {}
): Promise<Response> {
  return request(app)
    .get(`${API_BASE}${endpoint}`)
    .set('Authorization', `Bearer ${token}`)
    .set(headers);
}

/**
 * Make an authenticated POST request
 */
export async function authenticatedPost(
  endpoint: string,
  data: any,
  token: string,
  headers: Record<string, string> = {}
): Promise<Response> {
  return request(app)
    .post(`${API_BASE}${endpoint}`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .set(headers)
    .send(data);
}

/**
 * Make an authenticated PUT request
 */
export async function authenticatedPut(
  endpoint: string,
  data: any,
  token: string,
  headers: Record<string, string> = {}
): Promise<Response> {
  return request(app)
    .put(`${API_BASE}${endpoint}`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .set(headers)
    .send(data);
}

/**
 * Make an authenticated PATCH request
 */
export async function authenticatedPatch(
  endpoint: string,
  data: any,
  token: string,
  headers: Record<string, string> = {}
): Promise<Response> {
  return request(app)
    .patch(`${API_BASE}${endpoint}`)
    .set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json')
    .set(headers)
    .send(data);
}

/**
 * Make an authenticated DELETE request
 */
export async function authenticatedDelete(
  endpoint: string,
  token: string,
  headers: Record<string, string> = {}
): Promise<Response> {
  return request(app)
    .delete(`${API_BASE}${endpoint}`)
    .set('Authorization', `Bearer ${token}`)
    .set(headers);
}

/**
 * Make an unauthenticated GET request (public endpoint)
 */
export async function publicGet(endpoint: string): Promise<Response> {
  return request(app).get(`${API_BASE}${endpoint}`);
}

/**
 * Make an unauthenticated POST request (public endpoint)
 */
export async function publicPost(endpoint: string, data: any): Promise<Response> {
  return request(app)
    .post(`${API_BASE}${endpoint}`)
    .set('Content-Type', 'application/json')
    .send(data);
}

/**
 * Helper to extract response data
 */
export function getResponseData<T = any>(response: Response): T {
  return response.body;
}

/**
 * Helper to check if response is successful
 */
export function isSuccess(response: Response, expectedStatus = 200): boolean {
  return response.status === expectedStatus;
}

/**
 * Helper to wait for async operations (useful for testing eventual consistency)
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
