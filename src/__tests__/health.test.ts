import request from 'supertest';
import app from '../app';

describe('Health Check API', () => {
  describe('GET /api/v1/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/v1/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'success');
      expect(response.body).toHaveProperty('message', 'Service is healthy');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('environment');
      expect(response.body.data).toHaveProperty('version');
    });
  });

  describe('GET /', () => {
    it('should return API information', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'success',
        message: expect.any(String),
        version: expect.any(String),
        documentation: expect.any(String),
        health: expect.any(String),
      });
    });
  });
});
