import request from 'supertest';
import app from '../../app';

describe('Business Routes', () => {
  let authToken: string;

  describe('POST /api/business/profiles', () => {
    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/business/profiles')
        .send({
          name: 'Test Business',
          category: 'Restaurant',
          primaryLocation: 'New York, NY',
        });

      expect(response.status).toBe(401);
    });

    it('should fail with missing required fields', async () => {
      const response = await request(app)
        .post('/api/business/profiles')
        .set('Authorization', `Bearer ${authToken || 'test'}`)
        .send({
          name: 'Test Business',
        });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('GET /api/business/profiles', () => {
    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/business/profiles');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/business/profiles/current', () => {
    it('should fail without authentication', async () => {
      const response = await request(app).get('/api/business/profiles/current');

      expect(response.status).toBe(401);
    });
  });
});
